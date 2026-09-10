/**
 * Compact pet / assistance badges for driver offer + active trip.
 */
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  buildDriverPetSummary,
  type DriverPetTripFields,
} from './driverTripPetDisplay'

function Chip({
  children,
  testId,
  muted = false,
}: {
  children: ReactNode
  testId?: string
  muted?: boolean
}) {
  return (
    <span
      data-testid={testId}
      className={`inline-flex max-w-full items-center rounded-md border px-2 py-1 text-xs font-medium leading-snug ${
        muted
          ? 'border-border/70 bg-muted/40 text-foreground/80'
          : 'border-border bg-muted/50 text-foreground'
      }`}
    >
      {children}
    </span>
  )
}

export type DriverPetTripInfoProps = {
  trip: DriverPetTripFields
  /** Hide surcharge line (e.g. when price already shows total). */
  showSurcharge?: boolean
  className?: string
}

export function DriverPetTripInfo({
  trip,
  showSurcharge = true,
  className = '',
}: DriverPetTripInfoProps) {
  const { t } = useTranslation('driver')
  const summary = buildDriverPetSummary(trip)

  if (summary.mode === 'none') return null

  if (summary.mode === 'assistance') {
    return (
      <div
        className={`flex flex-wrap gap-1.5 ${className}`}
        data-testid="driver-pet-info"
        data-pet-mode="assistance"
      >
        <Chip testId="driver-pet-badge-assistance">{t('pet.badgeAssistance')}</Chip>
        {showSurcharge ? (
          <Chip muted testId="driver-pet-no-surcharge">
            {t('pet.noSurcharge')}
          </Chip>
        ) : null}
      </div>
    )
  }

  if (summary.mode === 'legacy') {
    return (
      <div
        className={`flex flex-wrap gap-1.5 ${className}`}
        data-testid="driver-pet-info"
        data-pet-mode="legacy"
      >
        <Chip testId="driver-pet-badge-legacy">{t('pet.badgeLegacy')}</Chip>
      </div>
    )
  }

  return (
    <div
      className={`flex flex-wrap gap-1.5 ${className}`}
      data-testid="driver-pet-info"
      data-pet-mode="commercial"
    >
      <Chip testId="driver-pet-badge-commercial">{t('pet.badgePet')}</Chip>
      {summary.size ? (
        <Chip testId={`driver-pet-size-${summary.size}`}>
          {t(`pet.size.${summary.size}`)}
        </Chip>
      ) : null}
      {summary.transport ? (
        <Chip testId={`driver-pet-transport-${summary.transport}`}>
          {t(`pet.transport.${summary.transport}`)}
        </Chip>
      ) : null}
      {summary.occupiesSeat ? (
        <Chip testId="driver-pet-occupies-seat">{t('pet.occupiesSeat')}</Chip>
      ) : null}
      {showSurcharge && summary.surcharge != null && summary.surcharge > 0 ? (
        <Chip testId="driver-pet-surcharge">
          {t('pet.surchargeLine', { amount: summary.surcharge.toFixed(2) })}
        </Chip>
      ) : null}
    </div>
  )
}
