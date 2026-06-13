'use client';

import { useCallback, useRef, useState } from 'react';
import { chatService } from '@/services/api';
import { streamChatAnswer } from '@/services/api/chat-stream';
import type { ChatMessage } from '@/services/api';

let messageCounter = 0;
const nextId = () => `m-${Date.now()}-${messageCounter++}`;

/**
 * Drives a single chat conversation: lazily creates a session on first send,
 * appends the user message, then streams the assistant answer token-by-token.
 */
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    sessionIdRef.current = null;
    setMessages([]);
    setError(null);
    setIsStreaming(false);
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((m) => (m.streaming ? { ...m, streaming: false } : m))
    );
  }, []);

  const send = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || isStreaming) return;

    setError(null);

    // Ensure a session exists (created from the first user message).
    if (!sessionIdRef.current) {
      try {
        const title = content.slice(0, 60);
        const res = await chatService.createSession(title);
        sessionIdRef.current = res.data.id;
      } catch {
        setError('Could not start a conversation. Please try again.');
        return;
      }
    }

    const userMsg: ChatMessage = {
      id: nextId(),
      role: 'user',
      content,
    };
    const assistantId = nextId();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      streaming: true,
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChatAnswer(sessionIdRef.current, content, {
        signal: controller.signal,
        onToken: (token) =>
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content + token }
                : m
            )
          ),
        onCitations: (citations) =>
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, citations } : m
            )
          ),
      });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(
          (err as Error).message || 'The answer stream was interrupted.'
        );
      }
    } finally {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, streaming: false } : m
        )
      );
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [isStreaming]);

  return { messages, isStreaming, error, send, stop, reset };
}
