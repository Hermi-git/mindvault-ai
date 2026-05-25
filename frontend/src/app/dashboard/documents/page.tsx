'use client';

import { FileText, Upload, Filter } from 'lucide-react';

export default function DocumentsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-white">Documents</h1>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-linear-to-r from-indigo-600 to-cyan-400 text-white font-medium hover:shadow-lg hover:shadow-indigo-500/50 transition-all">
            <Upload className="w-4 h-4" />
            Upload document
          </button>
        </div>
        <p className="text-slate-400">
          Manage all documents in your knowledge vault.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-3">
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Empty State */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-12 text-center">
        <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">No documents yet</h3>
        <p className="text-slate-400 mb-6">
          Start by uploading your first document to your knowledge vault.
        </p>
        <button className="px-6 py-2 rounded-lg bg-linear-to-r from-indigo-600 to-cyan-400 text-white font-medium hover:shadow-lg hover:shadow-indigo-500/50 transition-all">
          Upload your first document
        </button>
      </div>
    </div>
  );
}
