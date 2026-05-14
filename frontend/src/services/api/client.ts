import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

/**
 * API Client - Centralized Axios configuration for MindVault AI
 * Uses HttpOnly Cookies for authentication (set by backend)
 * Cookies are automatically included in requests via withCredentials
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // ← Include HttpOnly cookies in all requests
});

/**
 * Request Interceptor
 * No longer manually injects JWT - browser sends cookies automatically
 * Add custom headers as needed
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handle common error cases: 401 (auth), 403 (forbidden), 500 (server error)
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized - only log if it's not from /auth/me or /auth/login
    // /auth/me: expected when checking session (no user logged in)
    // /auth/login: error will be shown in UI, no need for console spam
    const isAuthCheck = error.config?.url?.includes('/auth/me');
    const isLoginAttempt = error.config?.url?.includes('/auth/login');
    
    if (error.response?.status === 401 && !isAuthCheck && !isLoginAttempt) {
      console.error('Session expired or not authenticated');
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response.data);
    }

    // Handle 500+ Server errors
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response.data);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
