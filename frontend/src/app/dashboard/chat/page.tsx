'use client';

import { MessageSquare, Construction } from 'lucide-react';
import Link from 'next/link';

export default function ChatPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Chat</h1>
        <p className="mt-2 text-slate-400">
          Ask questions and get streamed, cited answers grounded in your vault.
        </p>
      </div>

      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500/10">
          <Construction className="h-7 w-7 text-yellow-400" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-white">
          Awaiting backend support
        </h3>
        <p className="mx-auto mb-6 max-w-md text-slate-400">
          The chat answer stream (<code className="text-cyan-300">POST /chats/{'{session_id}'}/ask</code>)
          is ready, but there is no endpoint yet to create or list chat
          sessions. Once the backend exposes session management, this page will
          light up with streaming, source-cited conversations.
        </p>
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2 text-sm text-slate-300">
          <MessageSquare className="h-4 w-4 text-slate-500" />
          In the meantime, try{' '}
          <Link
            href="/dashboard/search"
            className="font-medium text-cyan-400 hover:text-cyan-300"
          >
            Semantic Search
          </Link>
        </div>
      </div>
    </div>
  );
}
