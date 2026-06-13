/**
 * Backend DTO mirrors. These intentionally match the FastAPI response models
 * in app/application/dto so the frontend stays in lockstep with the API.
 */

// ---- Auth ----
export interface TokenPairResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface MFAPartialResponse {
  status: 'MFA_REQUIRED';
  mfa_attempt_token: string;
  expires_in_seconds: number;
}

export type LoginResult = TokenPairResponse | MFAPartialResponse;

export function isMfaRequired(result: LoginResult): result is MFAPartialResponse {
  return (result as MFAPartialResponse).status === 'MFA_REQUIRED';
}

export interface RegisterResponse {
  user_id: string;
  default_org_id: string | null;
}

export interface MeResponse {
  user_id: string;
  org_id: string;
  role: string;
}

export interface MFAEnrollResponse {
  secret: string;
  provisioning_uri: string;
}

export interface SwitchOrgResponse {
  access_token: string;
  refresh_token: string;
  active_org_id: string;
}

// ---- Organizations & members ----
export type Role = 'OWNER' | 'ADMIN' | 'MEMBER';
export type MemberStatus = 'ACTIVE' | 'SUSPENDED' | 'INVITED';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role: Role;
}

export interface Member {
  user_id: string;
  org_id: string;
  full_name: string | null;
  email: string | null;
  role: Role;
  status: MemberStatus;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface InviteMemberResponse {
  invitation_token: string;
  invite_url: string;
}

// ---- Documents ----
export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'failed';

export interface DocumentResponse {
  id: string;
  org_id: string;
  title: string;
  source_type: string;
  status: DocumentStatus;
  chunk_count: number;
  token_count: number;
  checksum: string | null;
  error_message: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DocumentChunk {
  id: string;
  chunk_index: number;
  content: string;
  content_hash: string;
  token_count_estimate: number;
}

export interface DocumentChunksResponse {
  document_id: string;
  items: DocumentChunk[];
  total: number;
}

// ---- Search ----
export interface Citation {
  source: string;
  page_number: number | null;
  line_from: number | null;
  line_to: number | null;
  score: number;
}

export interface SearchChunk {
  id: string;
  text: string;
  score: number;
  source: string;
  metadata: Record<string, unknown>;
  vector_score: number | null;
  key_score: number | null;
  rerank_score: number | null;
  retrieval_sources: string[];
  citation: Citation;
}

export interface SearchResponse {
  items: SearchChunk[];
  citations: Citation[];
  total: number;
}

// ---- Chat ----
export interface ChatSession {
  id: string;
  title: string;
  created_at: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  streaming?: boolean;
}

// Server-sent event payloads from POST /chats/{id}/ask
export type ChatStreamEvent =
  | { type: 'token'; content: string }
  | { type: 'citations'; citations: Citation[] };

// ---- Usage ----
export interface UsageResponse {
  org_id: string;
  period_start: string;
  total_tokens: number;
  total_documents: number;
  total_events: number;
}
