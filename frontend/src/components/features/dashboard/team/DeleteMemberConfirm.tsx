'use client';

import React from 'react';
import { X } from 'lucide-react';
import { TeamMember } from '@/services/api/team';

interface DeleteMemberConfirmProps {
  isOpen: boolean;
  member: TeamMember | null;
  onClose: () => void;
  onConfirm: (memberId: string) => Promise<void>;
  isLoading?: boolean;
}

export function DeleteMemberConfirm({
  isOpen,
  member,
  onClose,
  onConfirm,
  isLoading = false,
}: DeleteMemberConfirmProps) {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (member) {
      await onConfirm(member.user_id);
    }
  };

  const memberDisplay = member?.full_name || member?.user_id?.slice(0, 8) || 'Member';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">Remove Member</h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-slate-300 mb-4">
            Are you sure you want to remove <span className="font-semibold text-white">{memberDisplay}</span> from the organization?
          </p>
          <p className="text-sm text-slate-400">This action cannot be undone.</p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-800">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Removing...' : 'Remove Member'}
          </button>
        </div>
      </div>
    </div>
  );
}
