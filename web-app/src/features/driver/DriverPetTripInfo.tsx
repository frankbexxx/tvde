/**
 * Compact occupancy + pet / assistance badges for driver offer + active trip.
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
  const pax =
    trip.passenger_count != null && !Number.isNaN(Number(trip.passenger_count))
      ? Math.max(1, Number(trip.passenger_count))
      : 1

  const chips: ReactNode[] = [
    <Chip key="pax" testId="driver-passenger-count">
      {pax === 1 ? t('pet.passengersLineOne') : t('pet.passengersLine', { count: pax })}
    </Chip>,
  ]

  if (summary.mode === 'assistance') {
    chips.push(
      <Chip key="assist" testId="driver-pet-badge-assistance">
        {t('pet.badgeAssistance')}
      </Chip>,
    )
    if (trip.pet_occupies_seat) {
      chips.push(
        <Chip key="seat" testId="driver-pet-occupies-seat">
          {t('pet.occupiesSeat')}
        </Chip>,
      )
    }
    if (showSurcharge) {
      chips.push(
        <Chip key="nosurch" muted testId="driver-pet-no-surcharge">
          {t('pet.noSurcharge')}
        </Chip>,
      )
    }
  } else if (summary.mode === 'legacy') {
    chips.push(
      <Chip key="legacy" testId="driver-pet-badge-legacy">
        {t('pet.badgeLegacy')}
      </Chip>,
    )
  } else if (summary.mode === 'commercial') {
    chips.push(
      <Chip key="pet" testId="driver-pet-badge-commercial">
        {t('pet.badgePet')}
      </Chip>,
    )
    if (summary.size) {
      chips.push(
        <Chip key="size" testId={`driver-pet-size-${summary.size}`}>
          {t(`pet.size.${summary.size}`)}
        </Chip>,
      )
    }
    if (summary.transport) {
      chips.push(
        <Chip key="tr" testId={`driver-pet-transport-${summary.transport}`}>
          {t(`pet.transport.${summary.transport}`)}
        </Chip>,
      )
    }
    if (summary.occupiesSeat) {
      chips.push(
        <Chip key="seat" testId="driver-pet-occupies-seat">
          {t('pet.occupiesSeat')}
        </Chip>,
      )
    }
    if (showSurcharge && summary.surcharge != null && summary.surcharge > 0) {
      chips.push(
        <Chip key="surch" testId="driver-pet-surcharge">
          {t('pet.surchargeLine', { amount: summary.surcharge.toFixed(2) })}
        </Chip>,
      )
    }
  }

  return (
    <div
      className={`flex flex-wrap gap-1.5 ${className}`}
      data-testid="driver-pet-info"
      data-pet-mode={summary.mode}
    >
      {chips}
    </div>
  )
}
