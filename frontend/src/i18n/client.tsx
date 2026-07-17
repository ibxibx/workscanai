'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './config'
import { en, type Messages } from './messages/en'
import { de } from './messages/de'

const CATALOGS: Record<Locale, Messages> = { en, de }

type Ctx = { locale: Locale; setLocale: (l: Locale) => void }
const I18nContext = createContext<Ctx>({ locale: DEFAULT_LOCALE, setLocale: () => {} })

function readCookieLocale(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE
  const m = document.cookie.match(new RegExp('(?:^|; )' + LOCALE_COOKIE + '=([^;]+)'))
  return isLocale(m?.[1]) ? (m![1] as Locale) : DEFAULT_LOCALE
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // SSR-safe: start at default (EN), adopt the cookie locale after mount.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    const l = readCookieLocale()
    if (l !== locale) setLocaleState(l)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((l: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${l};path=/;max-age=31536000;samesite=lax`
    setLocaleState(l)
  }, [])

  return <I18nContext.Provider value={{ locale, setLocale }}>{children}</I18nContext.Provider>
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale
}

export function useSetLocale(): (l: Locale) => void {
  return useContext(I18nContext).setLocale
}

// useT('common') -> t('signIn') / t('key', { name: 'x' })
export function useT<NS extends keyof Messages>(ns: NS) {
  const { locale } = useContext(I18nContext)
  return useCallback(
    (key: keyof Messages[NS] & string, vars?: Record<string, string | number>) => {
      const dict = CATALOGS[locale][ns] as Record<string, string>
      let s = dict[key] ?? String(key)
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
      return s
    },
    [locale, ns],
  )
}
