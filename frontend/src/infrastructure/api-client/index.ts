import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

/**
 * API Client - Centralized Axios configuration for MindVault AI
 * Handles authentication, error responses, and request/response interception
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor
 * Inject JWT token from localStorage/session storage before each request
 * Add custom headers as needed
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Retrieve JWT token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add any additional custom headers here
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
 * Trigger token refresh on 401 if needed
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized - redirect to login or refresh token
    if (error.response?.status === 401) {
      // TODO: Implement token refresh or redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response.data);
      // TODO: Show user-friendly error message
    }

    // Handle 500+ Server errors
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response.data);
      // TODO: Show error toast/modal to user
    }

    return Promise.reject(error);
  }
);

/**
 * Type-safe API methods
 */
export const api = {
  // Authentication endpoints
  auth: {
    login: (email: string, password: string, org_slug?: string) =>
      apiClient.post('/auth/login', { email, password, org_slug }),
    register: (email: string, password: string, full_name: string, organization_name: string) =>
      apiClient.post('/auth/register', {
        email,
        password,
        full_name,
        organization_name,
      }),
    switchOrg: (target_org_id: string) =>
      apiClient.post('/auth/switch-org', { target_org_id }),
    me: () => apiClient.get('/auth/me'),
  },

  // Document endpoints
  documents: {
    list: (org_id: string) =>
      apiClient.get('/documents', { params: { org_id } }),
    get: (doc_id: string) =>
      apiClient.get(`/documents/${doc_id}`),
    create: (title: string, source_type: string) =>
      apiClient.post('/documents', { title, source_type }),
    delete: (doc_id: string) =>
      apiClient.delete(`/documents/${doc_id}`),
    upload: (file: File, doc_id: string) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient.post(`/documents/${doc_id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
  },

  // Chat endpoints
  chat: {
    createSession: (title: string) =>
      apiClient.post('/chat/sessions', { title }),
    listSessions: () =>
      apiClient.get('/chat/sessions'),
    getSession: (session_id: string) =>
      apiClient.get(`/chat/sessions/${session_id}`),
    sendMessage: (session_id: string, query: string) =>
      apiClient.post(`/chat/sessions/${session_id}/messages`, { query }),
  },

  // Usage/Analytics endpoints
  usage: {
    getMetrics: (org_id: string) =>
      apiClient.get('/usage/metrics', { params: { org_id } }),
    getDocumentUsage: (doc_id: string) =>
      apiClient.get(`/usage/documents/${doc_id}`),
  },
};

export default apiClient;
