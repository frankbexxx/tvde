export const LOCALE_STORAGE_KEY = 'tvde_locale'

export type AppLocale = 'pt' | 'en'

export function isAppLocale(v: string | null | undefined): v is AppLocale {
  return v === 'pt' || v === 'en'
}

export function readStoredLocale(): AppLocale {
  if (typeof window === 'undefined') return 'pt'
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
  return isAppLocale(stored) ? stored : 'pt'
}

export function writeStoredLocale(locale: AppLocale): void {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
}

/** Intl BCP 47 tag for dates/numbers. */
export function intlLocaleTag(locale: AppLocale): string {
  return locale === 'en' ? 'en-GB' : 'pt-PT'
}

/** Geocoding / MapTiler language param. */
export function geocodingLanguage(locale: AppLocale): string {
  return locale === 'en' ? 'en' : 'pt'
}
