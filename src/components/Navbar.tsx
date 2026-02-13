'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Dialog, DialogPanel } from '@headlessui/react';
import { useAuth } from '@/components/AuthProvider';

const NEXT_LOCALE = 'NEXT_LOCALE';

const navItems = [
  { href: '/', key: 'dashboard', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )},
  { href: '/editor', key: 'editor', icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )},
];

export default function Navbar() {
  const t = useTranslations('Navbar');
  const pathname = usePathname();
  const router = useRouter();
  const [locale, setLocale] = useState('zh');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, isAuthenticated, logout, isLoading: authLoading } = useAuth();

  // Read locale from cookie on mount
  useEffect(() => {
    const cookieLocale = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${NEXT_LOCALE}=`))
      ?.split('=')[1];

    if (cookieLocale === 'en' || cookieLocale === 'zh') {
      setLocale(cookieLocale);
    }
  }, []);

  const switchLocale = (newLocale: string) => {
    document.cookie = `${NEXT_LOCALE}=${newLocale}; path=/; max-age=31536000`;
    setLocale(newLocale);
    router.refresh();
    setIsSidebarOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const NavLink = ({ href, children, isActive }: { href: string; children: React.ReactNode; isActive: boolean }) => (
    <Link
      href={href}
      onClick={() => setIsSidebarOpen(false)}
      className={`flex items-center gap-3 px-4 py-3 text-base font-medium border transition-all duration-200 ${
        isActive
          ? 'text-[#00ffff] border-[#00ffff] bg-[rgba(0,255,255,0.1)] shadow-[0_0_10px_rgba(0,255,255,0.3)]'
          : 'text-gray-400 hover:text-[#00ffff] hover:border-[#00ffff]/50'
      }`}
    >
      {children}
    </Link>
  );

  return (
    <>
      <nav className="relative bg-[#0d0d15] border-b border-[#2a2a3a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#1a1a25] border border-[#ff00ff] rounded flex items-center justify-center shadow-[0_0_15px_rgba(255,0,255,0.4)] group-hover:shadow-[0_0_25px_rgba(255,0,255,0.6)] transition-all">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#ff00ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="text-lg sm:text-xl font-bold text-[#00ffff] glitch-text hidden sm:inline" data-text={t('title')}>
                  {t('title')}
                </span>
                <span className="text-lg sm:text-xl font-bold text-[#00ffff] glitch-text sm:hidden" data-text={t('title')}>
                  {t('title')}
                </span>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="sm:hidden p-2 text-gray-400 hover:text-[#00ffff] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Desktop Nav Links */}
            <div className="hidden sm:flex items-center gap-1">
              <Link
                href="/"
                className={`px-4 py-2 text-sm font-medium border border-transparent transition-all duration-200 ${
                  pathname === '/'
                    ? 'text-[#00ffff] border-[#00ffff] bg-[rgba(0,255,255,0.1)] shadow-[0_0_10px_rgba(0,255,255,0.3)]'
                    : 'text-gray-400 hover:text-[#00ffff] hover:border-[#00ffff]/50'
                }`}
              >
                {t('dashboard')}
              </Link>
              <Link
                href="/editor"
                className={`px-4 py-2 text-sm font-medium border border-transparent transition-all duration-200 ${
                  pathname === '/editor'
                    ? 'text-[#00ffff] border-[#00ffff] bg-[rgba(0,255,255,0.1)] shadow-[0_0_10px_rgba(0,255,255,0.3)]'
                    : 'text-gray-400 hover:text-[#00ffff] hover:border-[#00ffff]/50'
                }`}
              >
                {t('editor')}
              </Link>
              {isAuthenticated && user?.role === 'admin' && (
                <Link
                  href="/admin"
                  className={`px-4 py-2 text-sm font-medium border border-transparent transition-all duration-200 ${
                    pathname === '/admin'
                      ? 'text-[#ff00ff] border-[#ff00ff] bg-[rgba(255,0,255,0.1)] shadow-[0_0_10px_rgba(255,0,255,0.3)]'
                      : 'text-gray-400 hover:text-[#ff00ff] hover:border-[#ff00ff]/50'
                  }`}
                >
                  Admin
                </Link>
              )}
            </div>

            {/* Desktop User Menu & Language */}
            <div className="hidden sm:flex items-center gap-2">
              {/* User Menu */}
              {authLoading ? (
                <div className="w-8 h-8 rounded-full bg-[#1a1a25] border border-[#2a2a3a] animate-pulse" />
              ) : isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400 truncate max-w-[150px]">
                    {user?.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 text-sm font-medium border border-[#ff3333] text-[#ff3333] hover:bg-[#ff3333] hover:text-[#1a1a25] transition-colors"
                  >
                    {t('logout')}
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-sm font-medium border border-[#00ffff] text-[#00ffff] hover:bg-[#00ffff] hover:text-[#1a1a25] transition-colors"
                >
                  {t('login')}
                </Link>
              )}

              {/* Language Switcher */}
              <div className="flex items-center gap-1 p-0.5 ml-2 bg-[#12121a] border border-[#2a2a3a]">
                <button
                  onClick={() => switchLocale('en')}
                  className={`px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                    locale === 'en'
                      ? 'bg-[#ff00ff] text-black shadow-[0_0_10px_rgba(255,0,255,0.5)]'
                      : 'text-gray-500 hover:text-[#ff00ff]'
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => switchLocale('zh')}
                  className={`px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                    locale === 'zh'
                      ? 'bg-[#ff00ff] text-black shadow-[0_0_10px_rgba(255,0,255,0.5)]'
                      : 'text-gray-500 hover:text-[#ff00ff]'
                  }`}
                >
                  中文
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <Dialog
        open={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        className="relative z-50 sm:hidden"
      >
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

        {/* Sidebar Position */}
        <div className="fixed inset-y-0 left-0 w-72 sm:w-80">
          <DialogPanel className="h-full bg-[#0d0d15] border-r border-[#2a2a3a] shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-[#2a2a3a]">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-[#00ffff]">{t('title')}</span>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 text-gray-400 hover:text-[#e0e0e0] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Nav Items */}
            <div className="flex-1 p-4 space-y-2">
              <NavLink href="/" isActive={pathname === '/'}>
                {navItems[0].icon}
                {t('dashboard')}
              </NavLink>
              <NavLink href="/editor" isActive={pathname === '/editor'}>
                {navItems[1].icon}
                {t('editor')}
              </NavLink>
              {isAuthenticated && user?.role === 'admin' && (
                <NavLink href="/admin" isActive={pathname === '/admin'}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Admin
                </NavLink>
              )}
            </div>

            {/* User Section */}
            <div className="p-4 border-t border-[#2a2a3a] space-y-3">
              {authLoading ? (
                <div className="h-10 bg-[#1a1a25] rounded animate-pulse" />
              ) : isAuthenticated ? (
                <>
                  <div className="text-sm text-gray-400 truncate">
                    {user?.email}
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsSidebarOpen(false);
                    }}
                    className="w-full py-2.5 text-sm font-medium border border-[#ff3333] text-[#ff3333] hover:bg-[#ff3333] hover:text-[#1a1a25] transition-colors"
                  >
                    {t('logout')}
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsSidebarOpen(false)}
                  className="block w-full py-2.5 text-sm font-medium text-center border border-[#00ffff] text-[#00ffff] hover:bg-[#00ffff] hover:text-[#1a1a25] transition-colors"
                >
                  {t('login')}
                </Link>
              )}
            </div>

            {/* Language Switcher */}
            <div className="p-4 border-t border-[#2a2a3a]">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <span className="text-sm text-gray-500">Language / 语言</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => switchLocale('en')}
                  className={`flex-1 py-2.5 text-sm font-medium border transition-all duration-200 ${
                    locale === 'en'
                      ? 'bg-[#ff00ff] text-black border-[#ff00ff]'
                      : 'text-gray-400 border-[#2a2a3a] hover:border-[#ff00ff]/50'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => switchLocale('zh')}
                  className={`flex-1 py-2.5 text-sm font-medium border transition-all duration-200 ${
                    locale === 'zh'
                      ? 'bg-[#ff00ff] text-black border-[#ff00ff]'
                      : 'text-gray-400 border-[#2a2a3a] hover:border-[#ff00ff]/50'
                  }`}
                >
                  中文
                </button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
