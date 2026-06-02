import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import i18n from './index'
import { LocaleContext, type LocaleContextValue } from './localeContext'
import { type AppLocale, readStoredLocale, writeStoredLocale } from './localeStorage'

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const adminForced = pathname.startsWith('/admin')
  const [locale, setLocaleState] = useState<AppLocale>(() => readStoredLocale())

  const effectiveLocale: AppLocale = adminForced ? 'pt' : locale

  const setLocale = useCallback(
    (next: AppLocale) => {
      if (adminForced) return
      writeStoredLocale(next)
      setLocaleState(next)
      void i18n.changeLanguage(next)
    },
    [adminForced]
  )

  useEffect(() => {
    void i18n.changeLanguage(effectiveLocale)
  }, [effectiveLocale])

  useEffect(() => {
    document.documentElement.lang = effectiveLocale === 'en' ? 'en' : 'pt'
  }, [effectiveLocale])

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, effectiveLocale }),
    [locale, setLocale, effectiveLocale]
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}
