import i18n from './index'
import { intlLocaleTag, type AppLocale } from './localeStorage'

export function activeIntlTag(): string {
  const lng = i18n.language
  return intlLocaleTag(lng === 'en' ? 'en' : 'pt')
}

export function formatDateTime(iso: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleString(activeIntlTag(), options)
}

export function formatDate(iso: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleDateString(activeIntlTag(), options)
}

export function formatTime(iso: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleTimeString(activeIntlTag(), options)
}

export function formatHeaderDateTime(now: Date): { dateStr: string; timeStr: string } {
  const tag = activeIntlTag()
  return {
    dateStr: now.toLocaleDateString(tag, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }),
    timeStr: now.toLocaleTimeString(tag, {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}

export function formatMoneyEur(amount: number, locale?: AppLocale): string {
  const tag = locale ? intlLocaleTag(locale) : activeIntlTag()
  return new Intl.NumberFormat(tag, { style: 'currency', currency: 'EUR' }).format(amount)
}
