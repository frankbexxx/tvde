import { useTranslation } from 'react-i18next'
import { useAppLocale } from '@/i18n/useAppLocale'
import type { AppLocale } from '@/i18n/localeStorage'
import { Button } from '@/components/ui/button'

export function LanguageSelector() {
  const { t } = useTranslation('settings')
  const { effectiveLocale, setLocale } = useAppLocale()

  const pick = (loc: AppLocale) => (
    <Button
      type="button"
      variant={effectiveLocale === loc ? 'default' : 'outline'}
      className="flex-1 font-medium"
      data-testid={loc === 'pt' ? 'locale-pt' : 'locale-en'}
      onClick={() => setLocale(loc)}
    >
      {loc === 'pt' ? t('languagePt') : t('languageEn')}
    </Button>
  )

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
