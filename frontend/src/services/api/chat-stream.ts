import { TokenStorage } from '@/lib/auth/storage';
import type { Citation, ChatStreamEvent } from './types';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface StreamCallbacks {
  onToken: (content: string) => void;
  onCitations: (citations: Citation[]) => void;
  signal?: AbortSignal;
}

/**
 * Stream an answer from POST /chats/{sessionId}/ask.
 *
 * The endpoint is SSE over an authenticated POST, so neither EventSource (no
 * headers, GET only) nor axios (no streaming body in browsers) fit — we read
 * the ReadableStream by hand and parse `data:` frames. The backend emits:
 *   data: {"type":"token","content":"..."}   (repeated)
 *   data: {"type":"citations","citations":[...]}
 *   data: [DONE]
 */
export async function streamChatAnswer(
  sessionId: string,
  message: string,
  { onToken, onCitations, signal }: StreamCallbacks
): Promise<void> {
  const token = TokenStorage.getAccessToken();

  const response = await fetch(`${API_URL}/chats/${sessionId}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message }),
    signal,
  });

  if (!response.ok || !response.body) {
    let detail = `Chat request failed (${response.status})`;
    try {
      const data = await response.json();
      if (data?.detail) detail = data.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line.
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      const line = frame
        .split('\n')
        .find((l) => l.startsWith('data:'));
      if (!line) continue;

      const data = line.slice(5).trim();
      if (!data) continue;
      if (data === '[DONE]') return;

      try {
        const event = JSON.parse(data) as ChatStreamEvent;
        if (event.type === 'token') {
          onToken(event.content);
        } else if (event.type === 'citations') {
          onCitations(event.citations);
        }
      } catch {
        // Ignore unparseable frames rather than killing the stream.
      }
    }
  }
}
