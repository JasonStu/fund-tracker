import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'zh'],

  // Used when no locale matches
  defaultLocale: 'zh'
});

// Cookie name for locale storage
export const NEXT_LOCALE = 'NEXT_LOCALE';

export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);
