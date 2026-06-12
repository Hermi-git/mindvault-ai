'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { orgService, authService } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations', 'mine'],
    queryFn: () => orgService.listMine().then((res) => res.data),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Switch active organization. The backend mints a fresh token pair scoped to
 * the target org; we swap it in and reset all server caches so every view
 * reloads under the new tenant.
 */
export function useSwitchOrganization() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const setTokens = useAuthStore((state) => state.setTokens);

  return useMutation({
    mutationFn: (targetOrgId: string) =>
      authService.switchOrg(targetOrgId).then((res) => res.data),
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token);
      queryClient.clear();
      router.refresh();
    },
  });
}
