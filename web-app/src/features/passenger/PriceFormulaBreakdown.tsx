import { useTranslation } from 'react-i18next'
import type { PriceBreakdown } from '../../api/trips'

function moneyLabel(value: number | null | undefined): string | null {
  if (value == null) return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return n.toFixed(2)
}

/** Display the trip snapshot. Does not compute a fare. */
export function PriceFormulaBreakdown({
  breakdown,
}: {
  breakdown?: PriceBreakdown | null
}) {
  const { t } = useTranslation('passenger')
  if (breakdown == null) return null
  const base = moneyLabel(breakdown.base_fare)
  const perKm = moneyLabel(breakdown.price_per_km)
  const perMin = moneyLabel(breakdown.price_per_min)
  if (base == null || perKm == null || perMin == null) return null
  const minimum = moneyLabel(breakdown.minimum_fare)
  const adjustment = moneyLabel(breakdown.minimum_fare_adjustment)
  const showAdjustment = adjustment != null && Number(adjustment) > 0
  return (
    <div data-testid="passenger-price-formula">
      <p data-testid="passenger-price-formula-base">
        {t('priceFormula.baseLine', { base, perKm, perMin })}
      </p>
      {minimum != null ? (
        <p data-testid="passenger-price-formula-minimum">
          {t('priceFormula.minimumLine', { minimum })}
        </p>
      ) : null}
      {showAdjustment ? (
        <p data-testid="passenger-price-formula-adjustment">
          {t('priceFormula.adjustmentLine', { adjustment })}
        </p>
      ) : null}
    </div>
  )
}
