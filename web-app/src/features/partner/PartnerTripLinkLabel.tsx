import { useTranslation } from 'react-i18next'
import type { PartnerDriverRow, PartnerTripRow } from '../../api/partner'
import { formatDateTime } from '../../i18n/format'
import { partnerTripStatusLabel } from './partnerLabels'
import { partnerDriverNameForTrip, partnerTripHumanTitle } from './partnerTripIdentity'

export function PartnerTripLinkLabel({
  trip,
  drivers,
}: {
  trip: PartnerTripRow
  drivers: readonly PartnerDriverRow[]
}) {
  const { t } = useTranslation('partner')
  const title = partnerTripHumanTitle({
    driverName: partnerDriverNameForTrip(trip.driver_id, drivers),
    vehiclePlate: trip.vehicle_plate,
    createdAtLabel: formatDateTime(trip.created_at),
  })

  return (
    <>
      <span className="block font-medium break-words" data-testid={`partner-trip-title-${trip.trip_id}`}>
        {title}
      </span>
      <span className="block text-xs font-normal text-foreground/80">{partnerTripStatusLabel(trip.status)}</span>
      <span
        className="block text-xs font-normal text-muted-foreground break-all"
        data-testid={`partner-trip-ref-${trip.trip_id}`}
      >
        {t('trips.reference', { id: trip.trip_id })}
      </span>
    </>
  )
}
