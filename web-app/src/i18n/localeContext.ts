import { createContext } from 'react'
import type { AppLocale } from './localeStorage'

export type LocaleContextValue = {
  locale: AppLocale
  setLocale: (next: AppLocale) => void
  effectiveLocale: AppLocale
}

export const LocaleContext = createContext<LocaleContextValue | null>(null)
