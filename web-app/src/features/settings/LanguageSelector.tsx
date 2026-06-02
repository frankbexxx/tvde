import { useTranslation } from 'react-i18next'
import { useAppLocale } from '@/i18n/useAppLocale'
import type { AppLocale } from '@/i18n/localeStorage'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type LanguageSelectorProps = {
  /** Settings sheet (default) vs login/landing compact row */
  variant?: 'default' | 'compact'
}

export function LanguageSelector({ variant = 'default' }: LanguageSelectorProps) {
  const { t } = useTranslation('settings')
  const { effectiveLocale, setLocale } = useAppLocale()
  const compact = variant === 'compact'
  const testIdPrefix = compact ? 'login-locale' : 'locale'

  const pick = (loc: AppLocale) => (
    <Button
      type="button"
      variant={effectiveLocale === loc ? 'default' : 'outline'}
      className={cn('font-medium', compact ? 'min-h-9 px-3 text-xs' : 'flex-1')}
      data-testid={loc === 'pt' ? `${testIdPrefix}-pt` : `${testIdPrefix}-en`}
      onClick={() => setLocale(loc)}
    >
      {loc === 'pt' ? t('languagePt') : t('languageEn')}
    </Button>
  )

  if (compact) {
    return (
      <div className="flex items-center justify-end gap-2" data-testid="language-selector-compact">
        <span className="sr-only">{t('language')}</span>
        {pick('pt')}
        {pick('en')}
      </div>
    )
  }

  return (
    <div className="space-y-2" data-testid="language-selector">
      <div>
        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">{t('language')}</p>
        <p className="text-xs text-muted-foreground leading-snug">{t('languageHint')}</p>
      </div>
      <div className="flex gap-2">{pick('pt')}{pick('en')}</div>
    </div>
  )
}
