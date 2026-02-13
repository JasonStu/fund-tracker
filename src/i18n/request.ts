import {getRequestConfig} from 'next-intl/server';
import {routing, NEXT_LOCALE} from './routing';
import {cookies} from 'next/headers';

type Locale = typeof routing.locales[number];
const isLocale = (val: unknown): val is Locale =>
  typeof val === 'string' && routing.locales.includes(val as Locale);

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const incoming = cookieStore.get(NEXT_LOCALE)?.value;

  const locale: Locale = isLocale(incoming) ? incoming : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
