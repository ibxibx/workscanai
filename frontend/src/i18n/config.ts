// i18n core config — dependency-free, cookie-based locale.
export const LOCALES = ['en', 'de'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALE_COOKIE = 'wsai_locale'

export function isLocale(v: unknown): v is Locale {
  return v === 'en' || v === 'de'
}
