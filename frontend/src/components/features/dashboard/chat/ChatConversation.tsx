'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import {
  Send,
  Square,
  Sparkles,
  FileText,
  Plus,
  Bot,
  User as UserIcon,
} from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import type { ChatMessage, Citation } from '@/services/api';

function formatCitation(c: Citation): string {
  const parts = [c.source || 'Unknown source'];
  if (c.page_number != null) parts.push(`p. ${c.page_number}`);
  if (c.line_from != null) {
    parts.push(
      c.line_to != null && c.line_to !== c.line_from
        ? `lines ${c.line_from}–${c.line_to}`
        : `line ${c.line_from}`
    );
  }
  return parts.join(' · ');
}

function Citations({ citations }: { citations: Citation[] }) {
  if (!citations.length) return null;
  return (
    <div className="mt-3 border-t border-slate-800 pt-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        Sources
      </p>
      <ul className="flex flex-wrap gap-2">
        {citations.map((c, i) => (
          <li
            key={i}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/50 px-2 py-1 text-xs text-cyan-300"
          >
            <FileText className="h-3 w-3" />
            {formatCitation(c)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          isUser ? 'bg-indigo-600' : 'bg-slate-700'
        )}
      >
        {isUser ? (
          <UserIcon className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-cyan-300" />
        )}
      </div>
      <div
        className={cn(
          'max-w-[80%] rounded-xl px-4 py-3 text-sm',
          isUser
            ? 'bg-indigo-600/20 text-white'
            : 'border border-slate-800 bg-slate-900/60 text-slate-200'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800 prose-code:text-cyan-300">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content || (message.streaming ? '' : '…')}
              </ReactMarkdown>
            </div>
            {message.streaming && (
              <span className="inline-block h-4 w-1.5 animate-pulse bg-cyan-400 align-middle" />
            )}
            {message.citations && (
              <Citations citations={message.citations} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  'Summarize the key points across my documents',
  'What does our policy say about remote work?',
  'List the main topics covered in my vault',
];

export function ChatConversation() {
  const { messages, isStreaming, error, send, stop, reset } = useChat();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    send(text);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-8 py-4">
        <div>
          <h1 className="text-xl font-bold text-white">Chat</h1>
          <p className="text-sm text-slate-400">
            Streamed answers grounded in your vault, with sources.
          </p>
        </div>
        {!isEmpty && (
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" /> New chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-400/20">
              <Sparkles className="h-7 w-7 text-cyan-400" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-white">
              Ask your knowledge vault
            </h2>
            <p className="mb-6 max-w-md text-sm text-slate-400">
              Answers are generated only from your uploaded documents and come
              with source citations.
            </p>
            <div className="flex max-w-lg flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-cyan-400/40 hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-800 px-8 py-4">
        <div className="mx-auto max-w-3xl">
          {error && (
            <p className="mb-2 text-sm text-red-400">{error}</p>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder="Ask anything about your documents…"
              className="max-h-40 flex-1 resize-none rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
            />
            {isStreaming ? (
              <button
                onClick={stop}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 text-slate-300 transition-colors hover:bg-slate-800"
                title="Stop"
              >
                <Square className="h-4 w-4 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-400 text-white transition-all hover:shadow-lg hover:shadow-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                title="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-xs text-slate-500">
            Enter to send · Shift+Enter for a new line
          </p>
        </div>
      </div>
    </div>
  );
}
