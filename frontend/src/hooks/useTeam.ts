'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOrgMembers,
  inviteMember,
  switchOrg,
  editMember,
  deleteMember,
  acceptInvitation,
  TeamMember,
  MembersListResponse,
} from '@/services/api/team';
import { useAuth } from './useAuth';

/**
 * React Query Hooks for Team Management
 * 
 * Key concepts:
 * 1. useQuery - Fetches and caches data with automatic updates
 * 2. useMutation - Handles POST/PUT/DELETE operations
 * 3. useQueryClient - Access cache to manually update after mutations
 * 4. Query Keys - Unique identifiers for cache [org_id, 'members']
 * 5. Stale Time - How long data is considered fresh before refetching
 */

// Query key factory for better cache management
const teamQueryKeys = {
  all: ['team'] as const,
  members: (orgId: string) => [...teamQueryKeys.all, 'members', orgId] as const,
};

/**
 * Fetch organization members with pagination
 * 
 * Flow:
 * 1. useQuery calls getOrgMembers API
 * 2. Data is cached with key [team, members, orgId]
 * 3. Normalizes response: converts uppercase OWNER/ADMIN/MEMBER to lowercase
 * 4. staleTime: Infinity means data never auto-refetches
 * 5. Returns { data, isLoading, error }
 */
export const useMembers = (orgId: string, page: number = 1, pageSize: number = 20) => {
  return useQuery({
    queryKey: teamQueryKeys.members(orgId),
    queryFn: () => 
      getOrgMembers(orgId, page, pageSize).then((res) => {
        // Normalize role and status to lowercase
        return {
          ...res.data,
          items: (res.data.items || []).map((item: any) => ({
            ...item,
            role: (item.role || '').toLowerCase() as 'owner' | 'admin' | 'member',
            status: (item.status || '').toLowerCase() as 'active' | 'pending',
          })),
        };
      }),
    staleTime: Infinity, // Data never becomes stale automatically
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    enabled: !!orgId, // Only fetch if orgId exists
  });
};

/**
 * Invite a new member to organization
 * 
 * Flow:
 * 1. Component calls mutate({ orgId, email, role })
 * 2. Mutation sends POST request to API
 * 3. On success: invalidate members cache to trigger refetch
 * 4. Component gets { isPending, error, data }
 * 
 * Invalidation: Tells React Query that members data is stale,
 * so next useMembers() hook will refetch fresh data
 */
export const useInviteMember = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: string }) =>
      inviteMember(user?.org_id || '', email, role).then((res) => res.data),
    onSuccess: () => {
      // Invalidate members cache so it refetches
      queryClient.invalidateQueries({
        queryKey: teamQueryKeys.members(user?.org_id || ''),
      });
    },
  });
};

/**
 * Edit member role or status
 * 
 * Flow:
 * 1. Component calls mutate({ userId, role, status })
 * 2. Mutation sends PATCH request
 * 3. On success: 
 *    - Optimistically update cache (immediate UI update)
 *    - Member list shows new role instantly
 * 4. Component gets { isPending, error, data }
 */
export const useEditMember = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({
      userId,
      role,
      status,
    }: {
      userId: string;
      role?: string;
      status?: string;
    }) => editMember(user?.org_id || '', userId, role, status),

    onSuccess: (_, { userId, role, status }) => {
      // Optimistic update: immediately update cache
      const membersKey = teamQueryKeys.members(user?.org_id || '');
      const oldData = queryClient.getQueryData(membersKey) as MembersListResponse | undefined;

      if (oldData) {
        const updatedMembers = oldData.items.map((member) =>
          member.user_id === userId
            ? {
                ...member,
                role: (role || member.role) as any,
                status: (status || member.status) as any,
              }
            : member
        );

        queryClient.setQueryData(membersKey, {
          ...oldData,
          items: updatedMembers,
        });
      }
    },

    onError: () => {
      // If error, refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: teamQueryKeys.members(user?.org_id || ''),
      });
    },
  });
};

/**
 * Delete member from organization
 * 
 * Flow:
 * 1. Component calls mutate({ userId })
 * 2. Mutation sends DELETE request
 * 3. On success:
 *    - Remove member from cache immediately (optimistic)
 *    - Member disappears from list instantly
 * 4. Component gets { isPending, error, data }
 */
export const useDeleteMember = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      deleteMember(user?.org_id || '', userId),

    onSuccess: (_, { userId }) => {
      // Optimistic update: remove from cache immediately
      const membersKey = teamQueryKeys.members(user?.org_id || '');
      const oldData = queryClient.getQueryData(membersKey) as MembersListResponse | undefined;

      if (oldData) {
        queryClient.setQueryData(membersKey, {
          ...oldData,
          items: oldData.items.filter((member) => member.user_id !== userId),
          total: oldData.total - 1,
        });
      }
    },

    onError: () => {
      // If error, refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: teamQueryKeys.members(user?.org_id || ''),
      });
    },
  });
};

/**
 * Switch active organization
 * 
 * Flow:
 * 1. Component calls mutate({ targetOrgId })
 * 2. Mutation sends POST request
 * 3. Backend returns new tokens with new org_id
 * 4. On success:
 *    - Update Zustand store with new org context
 *    - Invalidate all team caches
 *    - Redirect to dashboard
 * 5. Component gets { isPending, error, data }
 */
export const useSwitchOrg = () => {
  const queryClient = useQueryClient();
  const { setTokens } = useAuth();

  return useMutation({
    mutationFn: ({ targetOrgId }: { targetOrgId: string }) =>
      switchOrg(targetOrgId).then((res) => res.data),

    onSuccess: (data) => {
      // Update tokens in Zustand store
      setTokens(data.access_token, data.refresh_token);

      // Invalidate all team queries
      queryClient.invalidateQueries({ queryKey: teamQueryKeys.all });
    },
  });
};

/**
 * Accept invitation to join organization
 * 
 * Flow:
 * 1. User clicks invitation link with token
 * 2. Component calls mutate({ invitationToken })
 * 3. Mutation sends POST request
 * 4. On success: User is now member of org
 * 5. Redirect to dashboard or login if not authenticated
 */
export const useAcceptInvitation = () => {
  return useMutation({
    mutationFn: ({ invitationToken }: { invitationToken: string }) =>
      acceptInvitation(invitationToken),
  });
};
