'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useTranslations } from 'next-intl';
import { InvitationCode } from '@/types/auth';

export default function AdminPage() {
  const t = useTranslations('Admin');
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [invitations, setInvitations] = useState<InvitationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newCode, setNewCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchInvitations();
    }
  }, [user]);

  const fetchInvitations = async () => {
    try {
      const res = await fetch('/api/auth/invitations');
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t('error.fetchFailed'));
        return;
      }

      setInvitations(data.invitations || []);
    } catch {
      setError(t('error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const createInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const res = await fetch('/api/auth/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode || undefined,
          expiresAt: expiresAt || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t('error.createFailed'));
        return;
      }

      setNewCode('');
      setExpiresAt('');
      fetchInvitations();
    } catch {
      setError(t('error.unknown'));
    } finally {
      setCreating(false);
    }
  };

  const deleteInvitation = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return;

    try {
      const res = await fetch(`/api/auth/invitations/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t('error.deleteFailed'));
        return;
      }

      fetchInvitations();
    } catch {
      setError(t('error.unknown'));
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">{t('loading')}</div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">{t('accessDenied')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#e0e0e0]">{t('title')}</h1>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Create Invitation Form */}
      <div className="panel-metal rounded-none p-6">
        <h2 className="text-lg font-semibold text-[#e0e0e0] mb-4">{t('createTitle')}</h2>

        <form onSubmit={createInvitation} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="newCode" className="block text-sm font-medium text-gray-300 mb-2">
              {t('codeLabel')}
            </label>
            <input
              id="newCode"
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-2 rounded-lg bg-[#0d0d15] border border-[#2a2a3a] text-[#e0e0e0] placeholder-gray-500 focus:border-[#00ffff] focus:outline-none transition-colors uppercase"
              placeholder={t('codePlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="expiresAt" className="block text-sm font-medium text-gray-300 mb-2">
              {t('expiresLabel')}
            </label>
            <input
              id="expiresAt"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-[#0d0d15] border border-[#2a2a3a] text-[#e0e0e0] placeholder-gray-500 focus:border-[#00ffff] focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className="px-6 py-2 rounded-lg bg-[#00ffff] text-black font-medium hover:bg-[#00ffff]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {creating ? t('creating') : t('create')}
          </button>
        </form>
      </div>

      {/* Invitations List */}
      <div className="panel-metal rounded-none p-6">
        <h2 className="text-lg font-semibold text-[#e0e0e0] mb-4">{t('listTitle')}</h2>

        {loading ? (
          <div className="text-gray-400">{t('loading')}</div>
        ) : invitations.length === 0 ? (
          <div className="text-gray-400">{t('noInvitations')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-400 border-b border-[#2a2a3a]">
                  <th className="pb-3 pr-4">{t('table.code')}</th>
                  <th className="pb-3 pr-4">{t('table.status')}</th>
                  <th className="pb-3 pr-4">{t('table.usedBy')}</th>
                  <th className="pb-3 pr-4">{t('table.createdAt')}</th>
                  <th className="pb-3 pr-4">{t('table.expiresAt')}</th>
                  <th className="pb-3">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a3a]">
                {invitations.map((invitation) => (
                  <tr key={invitation.id} className="text-sm">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <code className="bg-[#0d0d15] px-2 py-1 rounded text-[#00ffff] font-mono">
                          {invitation.code}
                        </code>
                        <button
                          onClick={() => copyToClipboard(invitation.code)}
                          className="p-1 text-gray-400 hover:text-[#00ffff] transition-colors"
                          title={t('copy')}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {invitation.used_by ? (
                        <span className="text-gray-400">{t('status.used')}</span>
                      ) : invitation.expires_at && isExpired(invitation.expires_at) ? (
                        <span className="text-red-400">{t('status.expired')}</span>
                      ) : invitation.is_active ? (
                        <span className="text-green-400">{t('status.active')}</span>
                      ) : (
                        <span className="text-gray-400">{t('status.disabled')}</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-400">
                      {invitation.used_by || '-'}
                    </td>
                    <td className="py-3 pr-4 text-gray-400">
                      {new Date(invitation.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4 text-gray-400">
                      {invitation.expires_at
                        ? new Date(invitation.expires_at).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => deleteInvitation(invitation.id)}
                        className="px-3 py-1 rounded bg-[#1a1a25] border border-[#ff3333] text-[#ff3333] hover:bg-[#ff3333] hover:text-[#1a1a25] transition-colors text-sm"
                      >
                        {t('delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
