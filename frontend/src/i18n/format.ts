import type { Locale } from './config'

const intlLocale = (l: Locale) => (l === 'de' ? 'de-DE' : 'en-US')

export function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale)).format(n)
}

export function formatCurrency(n: number, locale: Locale, currency = 'EUR'): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}
