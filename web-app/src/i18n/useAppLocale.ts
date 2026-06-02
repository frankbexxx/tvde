import { useContext } from 'react'
import { LocaleContext } from './localeContext'

export function useAppLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error('useAppLocale must be used within LocaleProvider')
  }
  return ctx
}
