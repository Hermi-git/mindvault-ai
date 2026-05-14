import { apiClient } from './client';

export interface LoginRequest {
  email: string;
  password: string;
  org_slug?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  organization_name: string;
}

export interface AuthResponse {
  user_id: string;
  email: string;
  full_name: string;
  org_id: string;
  role: string;
  created_at: string;
}

/**
 * Authentication service methods
 * Handles all auth-related API calls
 */
export const authService = {
  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>('/auth/login', data),

  register: (data: RegisterRequest) => {
    // Only send fields the backend expects (exclude confirmPassword)
    const { confirmPassword, ...payload } = data as any;
    return apiClient.post<AuthResponse>('/auth/register', payload);
  },

  me: () =>
    apiClient.get<AuthResponse>('/auth/me'),

  logout: () =>
    apiClient.post('/auth/logout'),

  refresh: (refreshToken?: string) =>
    apiClient.post('/auth/refresh', refreshToken ? { refresh_token: refreshToken } : {}),

  switchOrg: (targetOrgId: string) =>
    apiClient.post('/auth/switch-org', { target_org_id: targetOrgId }),
};

/**
 * Document service methods
 */
export const documentService = {
  list: (orgId: string) =>
    apiClient.get('/documents', { params: { org_id: orgId } }),

  get: (docId: string) =>
    apiClient.get(`/documents/${docId}`),

  create: (title: string, sourceType: string) =>
    apiClient.post('/documents', { title, source_type: sourceType }),

  delete: (docId: string) =>
    apiClient.delete(`/documents/${docId}`),

  upload: (file: File, docId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/documents/${docId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

/**
 * Chat service methods
 */
export const chatService = {
  createSession: (title: string) =>
    apiClient.post('/chat/sessions', { title }),

  listSessions: () =>
    apiClient.get('/chat/sessions'),

  getSession: (sessionId: string) =>
    apiClient.get(`/chat/sessions/${sessionId}`),

  sendMessage: (sessionId: string, query: string) =>
    apiClient.post(`/chat/sessions/${sessionId}/messages`, { query }),
};

/**
 * Usage/Analytics service methods
 */
export const usageService = {
  getMetrics: (orgId: string) =>
    apiClient.get('/usage/metrics', { params: { org_id: orgId } }),

  getDocumentUsage: (docId: string) =>
    apiClient.get(`/usage/documents/${docId}`),
};
