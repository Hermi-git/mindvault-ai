'use client';

import { MessageSquare, Plus } from 'lucide-react';

export default function ChatPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-white">Chat</h1>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-linear-to-r from-indigo-600 to-cyan-400 text-white font-medium hover:shadow-lg hover:shadow-indigo-500/50 transition-all">
            <Plus className="w-4 h-4" />
            New conversation
          </button>
        </div>
        <p className="text-slate-400">
          Chat with your knowledge vault to find answers and insights.
        </p>
      </div>

      {/* Empty State */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-12 text-center">
        <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">No conversations yet</h3>
        <p className="text-slate-400 mb-6">
          Start a new conversation to begin chatting with your documents.
        </p>
        <button className="px-6 py-2 rounded-lg bg-linear-to-r from-indigo-600 to-cyan-400 text-white font-medium hover:shadow-lg hover:shadow-indigo-500/50 transition-all">
          Start chatting
        </button>
      </div>
    </div>
  );
}
