import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './config'
import { en, type Messages } from './messages/en'
import { de } from './messages/de'

const CATALOGS: Record<Locale, Messages> = { en, de }

// Server-side locale from cookie (used by dynamic routes; safe to call in RSC).
export async function getLocale(): Promise<Locale> {
  try {
    const c = await cookies()
    const v = c.get(LOCALE_COOKIE)?.value
    return isLocale(v) ? v : DEFAULT_LOCALE
  } catch {
    return DEFAULT_LOCALE
  }
}

// Server translator: const t = await getT('report'); t('key', { var })
export async function getT<NS extends keyof Messages>(ns: NS) {
  const locale = await getLocale()
  const dict = CATALOGS[locale][ns] as Record<string, string>
  return (key: keyof Messages[NS] & string, vars?: Record<string, string | number>) => {
    let s = dict[key] ?? String(key)
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
    return s
  }
}
