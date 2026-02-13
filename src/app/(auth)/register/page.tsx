'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/components/AuthProvider';
import { useTranslations } from 'next-intl';

export default function RegisterPage() {
  const t = useTranslations('Register');
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [step, setStep] = useState<'code' | 'details'>('code');
  const [invitationCode, setInvitationCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const validateCode = async () => {
    if (!invitationCode.trim()) {
      setError(t('error.noCode'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: invitationCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t('error.invalidCode'));
        return;
      }

      setStep('details');
    } catch {
      setError(t('error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('error.passwordMismatch'));
      return;
    }

    if (password.length < 8) {
      setError(t('error.passwordTooShort'));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: invitationCode,
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t('error.registerFailed'));
        return;
      }

      // Redirect to login
      router.push('/login?registered=true');
    } catch {
      setError(t('error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="panel-metal rounded-none p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#e0e0e0] mb-2">{t('title')}</h1>
            <p className="text-sm text-gray-500">{t('description')}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {step === 'code' ? (
            <div className="space-y-6">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('invitationCode')}
                </label>
                <input
                  id="code"
                  type="text"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-lg bg-[#0d0d15] border border-[#2a2a3a] text-[#e0e0e0] placeholder-gray-500 focus:border-[#00ffff] focus:outline-none transition-colors uppercase"
                  placeholder={t('codePlaceholder')}
                  required
                />
              </div>

              <button
                type="button"
                onClick={validateCode}
                disabled={loading || !invitationCode.trim()}
                className="w-full py-3 px-4 rounded-lg bg-[#00ffff] text-black font-medium hover:bg-[#00ffff]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? t('validating') : t('continue')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('email')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[#0d0d15] border border-[#2a2a3a] text-[#e0e0e0] placeholder-gray-500 focus:border-[#00ffff] focus:outline-none transition-colors"
                  placeholder={t('emailPlaceholder')}
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('password')}
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[#0d0d15] border border-[#2a2a3a] text-[#e0e0e0] placeholder-gray-500 focus:border-[#00ffff] focus:outline-none transition-colors"
                  placeholder={t('passwordPlaceholder')}
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('confirmPassword')}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[#0d0d15] border border-[#2a2a3a] text-[#e0e0e0] placeholder-gray-500 focus:border-[#00ffff] focus:outline-none transition-colors"
                  placeholder={t('confirmPasswordPlaceholder')}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg bg-[#00ffff] text-black font-medium hover:bg-[#00ffff]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? t('registering') : t('submit')}
              </button>

              <button
                type="button"
                onClick={() => setStep('code')}
                className="w-full py-2 text-sm text-gray-400 hover:text-[#00ffff] transition-colors"
              >
                {t('back')}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              {t('hasAccount')}{' '}
              <a href="/login" className="text-[#00ffff] hover:underline">
                {t('loginLink')}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
