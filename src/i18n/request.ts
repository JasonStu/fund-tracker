import {getRequestConfig} from 'next-intl/server';
import {routing} from './routing';

type Locale = typeof routing.locales[number];
const isLocale = (val: unknown): val is Locale =>
  typeof val === 'string' && routing.locales.includes(val as Locale);

export default getRequestConfig(async ({requestLocale}) => {
  // This typically corresponds to the `[locale]` segment
  const incoming = await requestLocale;

  // Ensure that a valid locale is used
  const locale: Locale = isLocale(incoming) ? incoming : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
