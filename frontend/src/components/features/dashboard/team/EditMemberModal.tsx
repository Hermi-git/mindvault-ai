'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { TeamMember } from '@/services/api/team';

interface EditMemberModalProps {
  isOpen: boolean;
  member: TeamMember | null;
  onClose: () => void;
  onSave: (memberId: string, newRole: 'admin' | 'member') => Promise<void>;
  isLoading?: boolean;
}

export function EditMemberModal({
  isOpen,
  member,
  onClose,
  onSave,
  isLoading = false,
}: EditMemberModalProps) {
  const [selectedRole, setSelectedRole] = useState<'admin' | 'member'>(
    (member?.role as 'admin' | 'member') || 'member'
  );

  React.useEffect(() => {
    if (member) {
      setSelectedRole((member.role as 'admin' | 'member') || 'member');
    }
  }, [member]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (member && selectedRole !== member.role) {
      await onSave(member.user_id, selectedRole);
    } else {
      onClose();
    }
  };

  const memberDisplay = member?.full_name || member?.user_id?.slice(0, 8) || 'Member';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">Change Member Role</h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Member Info */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Member</label>
            <div className="px-3 py-2 rounded-md bg-slate-800 text-slate-300 text-sm">
              {memberDisplay}
            </div>
          </div>

          {/* Current Role */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Current Role</label>
            <div className="px-3 py-2 rounded-md bg-slate-800">
              <span className="text-sm capitalize font-medium">
                {member?.role === 'owner' ? (
                  <span className="text-purple-400">Owner</span>
                ) : member?.role === 'admin' ? (
                  <span className="text-blue-400">Admin</span>
                ) : (
                  <span className="text-slate-400">Member</span>
                )}
              </span>
            </div>
          </div>

          {/* New Role Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">New Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as 'admin' | 'member')}
              className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <p className="text-xs text-slate-500">
              {selectedRole === 'admin'
                ? 'Admins can invite members and manage organization data'
                : 'Members can access and collaborate on documents'}
            </p>
          </div>
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
            onClick={handleSave}
            disabled={isLoading || selectedRole === member?.role}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
