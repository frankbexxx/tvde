import { useTranslation } from 'react-i18next'
import { LEGAL_PRIVACY_URL, LEGAL_TERMS_URL } from './legalLinks'

type LegalAcceptanceCheckboxProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  id?: string
  termsUrl?: string
  privacyUrl?: string
}

export function LegalAcceptanceCheckbox({
  checked,
  onChange,
  id = 'legal-accept',
  termsUrl = LEGAL_TERMS_URL,
  privacyUrl = LEGAL_PRIVACY_URL,
}: LegalAcceptanceCheckboxProps) {
  const { t } = useTranslation('auth')
  return (
    <label htmlFor={id} className="flex items-start gap-2 text-sm text-foreground">
      <input
        id={id}
        data-testid="legal-accept-checkbox"
        type="checkbox"
        className="mt-1"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        {t('legalAcceptPrefix')}{' '}
        <a
          href={termsUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="legal-terms-link"
          className="underline"
        >
          {t('termsLink')}
        </a>{' '}
        {t('legalAcceptAnd')}{' '}
        <a
          href={privacyUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="legal-privacy-link"
          className="underline"
        >
          {t('privacyLink')}
        </a>
        .
      </span>
    </label>
  )
}
