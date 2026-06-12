'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

/**
 * Complete a login that the backend flagged as requiring a second factor.
 * Exchanges the short-lived mfa_attempt_token + TOTP code for a real token pair.
 */
export function useVerifyMfa() {
  const router = useRouter();
  const setTokens = useAuthStore((state) => state.setTokens);
  const setError = useAuthStore((state) => state.setError);

  return useMutation({
    mutationFn: ({ attemptToken, code }: { attemptToken: string; code: string }) =>
      authService.mfaVerify(attemptToken, code).then((res) => res.data),
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token);
      setError(null);
      router.push('/dashboard');
    },
  });
}

/** Begin TOTP enrollment — returns the secret + otpauth provisioning URI. */
export function useEnrollMfa() {
  return useMutation({
    mutationFn: () => authService.mfaEnroll().then((res) => res.data),
  });
}

/** Confirm enrollment by proving the user can generate a valid code. */
export function useEnableMfa() {
  return useMutation({
    mutationFn: (code: string) => authService.mfaEnable(code),
  });
}
