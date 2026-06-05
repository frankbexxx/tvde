import { useTranslation } from 'react-i18next'

type LegalLocaleNoticeProps = {
  className?: string
}

/** X3 opção B: em EN, aviso de que o texto legal vinculante é PT. */
export function LegalLocaleNotice({ className }: LegalLocaleNoticeProps) {
  const { i18n, t } = useTranslation('common')
  if (!i18n.language.toLowerCase().startsWith('en')) return null

  return (
    <p className={className} data-testid="legal-locale-notice">
      {t('legalEnSummary')}{' '}
      <span className="text-foreground/90">{t('legalPtBinding')}</span>
    </p>
  )
}
