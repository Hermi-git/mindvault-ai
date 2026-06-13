import { apiClient } from './client';
import type {
  ChatSession,
  DocumentChunksResponse,
  DocumentResponse,
  DocumentStatus,
  LoginResult,
  MeResponse,
  MFAEnrollResponse,
  Organization,
  Paginated,
  RegisterResponse,
  SearchResponse,
  SwitchOrgResponse,
  TokenPairResponse,
  UsageResponse,
} from './types';

export * from './types';

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

/**
 * Authentication service.
 * Maps 1:1 to backend routes under /auth.
 */
export const authService = {
  register: (data: RegisterRequest) =>
    apiClient.post<RegisterResponse>('/auth/register', data),

  login: (data: LoginRequest) =>
    apiClient.post<LoginResult>('/auth/login', data),

  getMe: () => apiClient.get<MeResponse>('/auth/me'),

  logout: () => apiClient.post('/auth/logout'),

  refresh: (refreshToken: string) =>
    apiClient.post<TokenPairResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    }),

  switchOrg: (targetOrgId: string) =>
    apiClient.post<SwitchOrgResponse>('/auth/switch-org', {
      target_org_id: targetOrgId,
    }),

  // MFA
  mfaEnroll: () => apiClient.post<MFAEnrollResponse>('/auth/mfa/enroll'),

  mfaEnable: (code: string) =>
    apiClient.post<void>('/auth/mfa/enable', { code }),

  mfaVerify: (mfaAttemptToken: string, code: string) =>
    apiClient.post<TokenPairResponse>('/auth/mfa/verify', {
      mfa_attempt_token: mfaAttemptToken,
      code,
    }),
};

/**
 * Organization service.
 */
export const orgService = {
  listMine: (page = 1, pageSize = 50) =>
    apiClient.get<Paginated<Organization>>('/auth/me/orgs', {
      params: { page, page_size: pageSize },
    }),
};

/**
 * Document service.
 * Upload is multipart -> 202 Accepted; processing happens async in Celery.
 */
export const documentService = {
  list: (params?: { page?: number; page_size?: number; status?: DocumentStatus }) =>
    apiClient.get<Paginated<DocumentResponse>>('/documents', { params }),

  get: (docId: string) =>
    apiClient.get<DocumentResponse>(`/documents/${docId}`),

  getStatus: (docId: string) =>
    apiClient.get<DocumentResponse>(`/documents/${docId}/status`),

  listChunks: (docId: string) =>
    apiClient.get<DocumentChunksResponse>(`/documents/${docId}/chunks`),

  upload: (
    file: File,
    opts?: { title?: string; sourceType?: string },
    onUploadProgress?: (percent: number) => void
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    if (opts?.title) formData.append('title', opts.title);
    if (opts?.sourceType) formData.append('source_type', opts.sourceType);
    return apiClient.post<DocumentResponse>('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onUploadProgress && e.total) {
          onUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    });
  },

  remove: (docId: string) => apiClient.delete<void>(`/documents/${docId}`),
};

/**
 * Semantic search service. Pure vector search, no LLM.
 */
export const searchService = {
  query: (query: string, topK = 5) =>
    apiClient.post<SearchResponse>('/search', { query, top_k: topK }),
};

/**
 * Usage / analytics service.
 */
export const usageService = {
  getMonthly: () => apiClient.get<UsageResponse>('/usage'),
};

/**
 * Chat service. Session creation is a normal JSON call; the answer stream is
 * handled separately via fetch (see streamChatAnswer) because it's SSE over a
 * POST with a bearer token, which axios/EventSource can't do in the browser.
 */
export const chatService = {
  createSession: (title: string) =>
    apiClient.post<ChatSession>('/chats', { title }),
};
