import { AxiosPromise } from 'axios';
import { apiClient } from './client';

/**
 * Team & Organization API Service
 * Handles member management, invitations, and org switching
 */

// Types
export interface TeamMember {
  user_id: string;
  org_id: string;
  email?: string;
  full_name?: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'pending';
  joined_at?: string;
  invited_at?: string;
}

export interface MembersListResponse {
  items: TeamMember[];
  total: number;
  page: number;
  page_size: number;
}

export interface InviteMemberRequest {
  email: string;
  role: 'owner' | 'admin' | 'member';
}

export interface InviteMemberResponse {
  invitation_token: string;
  invite_url: string;
}

export interface SwitchOrgRequest {
  target_org_id: string;
}

export interface SwitchOrgResponse {
  access_token: string;
  refresh_token: string;
  active_org_id: string;
}

export interface EditMemberRequest {
  role?: 'owner' | 'admin' | 'member';
  status?: 'active' | 'pending' | 'inactive';
}

export interface AcceptInvitationRequest {
  invitation_token: string;
}

/**
 * Fetch organization members with pagination
 * @param orgId - Organization UUID
 * @param page - Page number (1-indexed)
 * @param pageSize - Items per page (max 100)
 */
export const getOrgMembers = (
  orgId: string,
  page: number = 1,
  pageSize: number = 20
): AxiosPromise<MembersListResponse> => {
  return apiClient.get(`/auth/orgs/${orgId}/members`, {
    params: { page, page_size: pageSize },
  });
};

/**
 * Invite a new member to the organization
 * Only Admin and Owner can invite
 * @param orgId - Organization UUID
 * @param email - Member email
 * @param role - Member role
 */
export const inviteMember = (
  orgId: string,
  email: string,
  role: string
): AxiosPromise<InviteMemberResponse> => {
  return apiClient.post(`/auth/orgs/${orgId}/invite`, {
    email,
    role: role.toUpperCase(),
  } as InviteMemberRequest);
};

/**
 * Switch active organization context
 * User's access token will be updated with new org context
 * @param targetOrgId - Target organization UUID
 */
export const switchOrg = (
  targetOrgId: string
): AxiosPromise<SwitchOrgResponse> => {
  return apiClient.post('/auth/switch-org', {
    target_org_id: targetOrgId,
  } as SwitchOrgRequest);
};

/**
 * Edit member role and/or status
 * Only Owner can change roles
 * @param orgId - Organization UUID
 * @param userId - Member user UUID
 * @param role - New role
 * @param status - New status
 */
export const editMember = (
  orgId: string,
  userId: string,
  role?: string,
  status?: string
): AxiosPromise<void> => {
  const body: EditMemberRequest = {};
  if (role) body.role = role.toUpperCase() as any;
  if (status) body.status = status.toLowerCase() as any;

  return apiClient.patch(`/auth/orgs/${orgId}/members/${userId}`, body);
};

/**
 * Delete member from organization
 * Only Owner can delete members
 * @param orgId - Organization UUID
 * @param userId - Member user UUID
 */
export const deleteMember = (
  orgId: string,
  userId: string
): AxiosPromise<void> => {
  return apiClient.delete(`/auth/orgs/${orgId}/members/${userId}`);
};

/**
 * Accept invitation to join an organization
 * Used in invitation link flow
 * @param invitationToken - Invitation token from email
 */
export const acceptInvitation = (
  invitationToken: string
): AxiosPromise<void> => {
  return apiClient.post('/auth/invitations/accept', {
    invitation_token: invitationToken,
  } as AcceptInvitationRequest);
};
