import { useTranslation } from 'react-i18next'

/** Display the trip snapshot. No commercial default when the API omits the field. */
function formatIntermediationRate(rate: number): string {
  const n = Number(rate)
  if (!Number.isFinite(n)) return ''
  return String(n)
}

export function PassengerIntermediationRateLine({
  rate,
}: {
  rate?: number | null
}) {
  const { t } = useTranslation('passenger')
  if (rate == null || !Number.isFinite(Number(rate))) return null
  return (
    <p data-testid="passenger-intermediation-rate">
      {t('intermediation.rateLine', { rate: formatIntermediationRate(rate) })}
    </p>
  )
}
