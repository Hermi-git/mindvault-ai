import { useAuthStore } from '@/stores/authStore';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authService, LoginRequest, RegisterRequest } from '@/services/api';
import { LoginSchema, RegisterSchema } from '@/lib/validation-schemas';
import type { LoginInput, RegisterInput } from '@/lib/validation-schemas';

/**
 * useAuth Hook
 * Provides access to auth state from Zustand store
 */
export function useAuth() {
  const authStore = useAuthStore();
  
  return {
    user: authStore.user,
    isLoading: authStore.isLoading,
    isAuthenticated: authStore.isAuthenticated,
    error: authStore.error,
    logout: authStore.logout,
    checkAuth: authStore.checkAuth,
  };
}

/**
 * useLogin Hook
 * Handles user login with email/password
 */
export function useLogin() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const setError = useAuthStore((state) => state.setError);

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const validated = LoginSchema.parse(input);
      const response = await authService.login(validated);
      return response.data;
    },
    onSuccess: (user) => {
      setUser(user);
      router.push('/dashboard');
    },
    onError: (error: any) => {
      // Extract error message from various sources
      let message = 'Login failed. Please try again.';
      
      if (error.response?.data?.detail) {
        message = error.response.data.detail;
      } else if (error.message) {
        message = error.message;
      }
      
      console.error('Login error:', error);
      setError(message);
    },
  });
}

/**
 * useRegister Hook
 * Handles user registration and auto-login
 */
export function useRegister() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const setError = useAuthStore((state) => state.setError);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const validated = RegisterSchema.parse(input);
      const response = await authService.register(validated);
      return response.data;
    },
    onSuccess: async (user) => {
      // Registration succeeded. Now verify the session was auto-logged in
      try {
        await checkAuth();
        // If checkAuth succeeded, we're logged in. Redirect to dashboard.
        router.push('/dashboard');
      } catch (error) {
        // Auto-login failed. User was created but not logged in.
        // Show error and let user try logging in manually.
        const message = error instanceof Error ? error.message : 'Registration succeeded but auto-login failed. Please log in manually.';
        setError(message);
      }
    },
    onError: (error: any) => {
      // Extract error message from various sources
      let message = 'Registration failed. Please try again.';
      
      if (error.response?.data?.detail) {
        message = error.response.data.detail;
      } else if (error.message) {
        message = error.message;
      }
      
      console.error('Registration error:', error);
      setError(message);
    },
  });
}

/**
 * useLogout Hook
 * Handles user logout
 */
export function useLogout() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      router.push('/login');
    },
    onError: (error: any) => {
      console.error('Logout failed:', error);
    },
  });
}
