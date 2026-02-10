'use client';

import { Link, usePathname, useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';

export default function Navbar() {
  const t = useTranslations('Navbar');
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();

  const switchLocale = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <nav className="relative bg-[#0d0d15] border-b border-[#2a2a3a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 bg-[#1a1a25] border border-[#ff00ff] rounded flex items-center justify-center shadow-[0_0_15px_rgba(255,0,255,0.4)] group-hover:shadow-[0_0_25px_rgba(255,0,255,0.6)] transition-all">
                <svg className="w-5 h-5 text-[#ff00ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-xl font-bold text-[#00ffff] glitch-text" data-text={t('title')}>
                {t('title')}
              </span>
            </Link>
          </div>

          {/* Nav Links */}
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
          </div>

          {/* Language Switcher */}
          <div className="flex items-center gap-1 p-0.5 bg-[#12121a] border border-[#2a2a3a]">
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
    </nav>
  );
}
