'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, CheckCircle, Clock, Trash2, Loader, Edit2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMembers, useInviteMember, useDeleteMember, useEditMember } from '@/hooks/useTeam';
import { EditMemberModal } from './EditMemberModal';
import { DeleteMemberConfirm } from './DeleteMemberConfirm';
import type { TeamMember } from '@/services/api/team';

// Role Badge Component
function RoleBadge({ role }: { role: string }) {
  const roleColors: Record<string, { bg: string; text: string; label: string }> = {
    owner: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Owner' },
    admin: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Admin' },
    member: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'Member' },
    viewer: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Viewer' },
  };

  const roleConfig = roleColors[role] || roleColors.viewer;

  return (
    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', roleConfig.bg, roleConfig.text)}>
      {roleConfig.label}
    </span>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: 'active' | 'pending' }) {
  if (status === 'active') {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="text-sm text-emerald-400">Active</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Clock className="w-4 h-4 text-yellow-400" />
      <span className="text-sm text-yellow-400">Invite pending</span>
    </div>
  );
}

// Member Avatar Component
function MemberAvatar({ name, email }: { name: string; email: string }) {
  const initials = (name || '')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shrink-0">
      <span className="text-white text-sm font-semibold">{initials}</span>
    </div>
  );
}

// Member Actions - Simple Icon Buttons
function MemberActions({
  member,
  currentUserRole,
  currentUserId,
  onEdit,
  onDelete,
}: {
  member: TeamMember;
  currentUserRole: string;
  currentUserId: string;
  onEdit: (member: TeamMember) => void;
  onDelete: (member: TeamMember) => void;
}) {
  // Cannot edit yourself
  const isOwnProfile = member.user_id === currentUserId;
  // Only owner can change roles or delete
  const canEdit = currentUserRole === 'owner' && !isOwnProfile;

  if (!canEdit) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onEdit(member)}
        className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-blue-400"
        title="Edit member role"
      >
        <Edit2 className="w-4 h-4" />
      </button>
      <button
        onClick={() => onDelete(member)}
        className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-red-400"
        title="Remove member"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function TeamManagement() {
  const { user } = useAuth();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');

  // Edit/Delete Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingMember, setDeletingMember] = useState<TeamMember | null>(null);

  // Fetch members data
  const { data: membersData, isLoading: isLoadingMembers, error: membersError } = useMembers(user?.org_id || '');

  // Mutations
  const { mutate: inviteMemberMutate, isPending: isInviting, error: inviteError } = useInviteMember();
  const { mutate: deleteM, isPending: isDeleting } = useDeleteMember();
  const { mutate: editM, isPending: isEditing } = useEditMember();

  // Handle inviting
  const handleInvite = () => {
    if (!inviteEmail.includes('@')) return;
    inviteMemberMutate({ email: inviteEmail, role: inviteRole }, {
      onSuccess: () => {
        setInviteEmail('');
        setShowInviteModal(false);
      },
    });
  };

  // Handle edit member - opens modal
  const handleOpenEditModal = (member: TeamMember) => {
    setEditingMember(member);
    setShowEditModal(true);
  };

  // Handle save edit member
  const handleSaveEditMember = (memberId: string, newRole: 'admin' | 'member') => {
    return new Promise<void>((resolve) => {
      editM({ userId: memberId, role: newRole }, {
        onSuccess: () => {
          setShowEditModal(false);
          setEditingMember(null);
          resolve();
        },
        onError: () => {
          resolve(); // Modal handles error display
        },
      });
    });
  };

  // Handle delete member - opens confirm dialog
  const handleOpenDeleteModal = (member: TeamMember) => {
    setDeletingMember(member);
    setShowDeleteModal(true);
  };

  // Handle confirm delete member
  const handleConfirmDeleteMember = (memberId: string) => {
    return new Promise<void>((resolve) => {
      deleteM({ userId: memberId }, {
        onSuccess: () => {
          setShowDeleteModal(false);
          setDeletingMember(null);
          resolve();
        },
        onError: () => {
          resolve(); // Modal handles error display
        },
      });
    });
  };

  // Extract members from response
  const members = membersData?.items || [];
  const activemembers = members.filter((m) => m.status === 'active').length;
  const pendingCount = members.filter((m) => m.status === 'pending').length;

  // Check role-based permissions
  const canInvite = user?.role === 'owner' || user?.role === 'admin';

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-white">Team & access</h1>
          {canInvite && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-linear-to-r from-indigo-600 to-cyan-400 text-white font-medium hover:shadow-lg hover:shadow-indigo-500/50 transition-all"
            >
              <Plus className="w-4 h-4" />
              Invite member
            </button>
          )}
        </div>
        <p className="text-slate-400">
          Manage who can access your organization's vault and what they can do.
        </p>
      </div>

      {/* Tenant Isolation Notice */}
      <div className="mb-6 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-white mb-1">Your data is secure and private</h3>
            <p className="text-sm text-slate-300">
              All documents and data in this workspace are kept separate and secure. Only members of your organization can access them.
            </p>
          </div>
        </div>
      </div>

      {/* Members Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">
          Members ({activemembers} total · {pendingCount} pending)
        </h2>

        {isLoadingMembers ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-12 text-center">
            <Loader className="w-8 h-8 text-slate-400 mx-auto mb-4 animate-spin" />
            <p className="text-slate-400">Loading members...</p>
          </div>
        ) : membersError ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-red-400">Failed to load members. Please try again.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Member</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Role</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300 w-12">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                        No members yet. Invite someone to get started.
                      </td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <tr key={member.user_id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <MemberAvatar name={member.full_name || member.user_id} email={member.email || ''} />
                            <div>
                              <p className="text-sm font-medium text-white">{member.full_name || member.user_id}</p>
                              {member.email && <p className="text-xs text-slate-400">{member.email}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <RoleBadge role={member.role} />
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={member.status} />
                        </td>
                        <td className="px-6 py-4">
                          <MemberActions
                            member={member}
                            currentUserRole={user?.role || 'member'}
                            currentUserId={user?.user_id || ''}
                            onDelete={handleOpenDeleteModal}
                            onEdit={handleOpenEditModal}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>



      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-white mb-4">Invite member</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">Email address</label>
              <input
                type="email"
                placeholder="member@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {inviteError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-400">{inviteError.message || 'Failed to send invite'}</p>
              </div>
            )}

            <p className="text-sm text-slate-400 mb-6">
              An invitation will be sent to this email address. The recipient can accept to join your organization.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail.includes('@') || isInviting}
                className="flex-1 px-4 py-2 rounded-lg bg-linear-to-r from-indigo-600 to-cyan-400 text-white font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isInviting ? 'Sending...' : 'Send invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      <EditMemberModal
        isOpen={showEditModal}
        member={editingMember}
        onClose={() => {
          setShowEditModal(false);
          setEditingMember(null);
        }}
        onSave={handleSaveEditMember}
        isLoading={isEditing}
      />

      {/* Delete Member Confirmation */}
      <DeleteMemberConfirm
        isOpen={showDeleteModal}
        member={deletingMember}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingMember(null);
        }}
        onConfirm={handleConfirmDeleteMember}
        isLoading={isDeleting}
      />
    </div>
  );
}
