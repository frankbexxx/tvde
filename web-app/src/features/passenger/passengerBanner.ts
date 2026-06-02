/**
 * A014: Cópia e variante do painel superior — alinhado com estados reais da trip (API).
 */
import type { StatusVariant } from '../../components/layout/StatusHeader'
import type { TripDetailResponse } from '../../api/trips'
import { passengerTripStatusLabel } from '../../constants/tripStatusLabels'
import type { PassengerUxState } from './usePassengerUxState'
import { humanizeCancelError, humanizeCreateTripError } from '../../i18n/apiErrors'
import i18n from '../../i18n'

export { humanizeCreateTripError, humanizeCancelError }

function dedupeEstadoSubLabel(label: string, subLabel?: string): string | undefined {
  if (!subLabel) return undefined
  const prefix = i18n.language === 'en' ? /^Status:\s*/i : /^Estado:\s*/i
  if (!prefix.test(subLabel)) return subLabel
  const tail = subLabel.replace(prefix, '').trim()
  if (tail === label.trim()) return undefined
  return subLabel
}

export function getPassengerBannerState(params: {
  creating: boolean
  activeTripId: string | null
  activeTripLoading: boolean
  activeTrip: TripDetailResponse | null | undefined
  uxState: PassengerUxState | null
  isOnline: boolean
}): { label: string; variant: StatusVariant; subLabel?: string } {
  const { creating, activeTripId, activeTripLoading, activeTrip, uxState, isOnline } = params

  if (creating && !activeTripId) {
    return { label: i18n.t('passenger:banner.creating'), variant: 'requested' }
  }
  if (!activeTripId) {
    return { label: i18n.t('passenger:banner.ready'), variant: 'idle' }
  }
  if (activeTripId && !isOnline) {
    return {
      label: i18n.t('passenger:banner.offline'),
      variant: 'idle',
      subLabel: i18n.t('passenger:banner.offlineSub'),
    }
  }
  if (activeTrip?.payment_status === 'failed') {
    return {
      label: i18n.t('passenger:banner.paymentFailed'),
      variant: 'error',
      subLabel: i18n.t('passenger:banner.paymentFailedSub'),
    }
  }
  if (activeTrip?.status === 'cancelled') {
    return { label: passengerTripStatusLabel('cancelled'), variant: 'idle' }
  }
  if (activeTrip?.status === 'failed') {
    return { label: passengerTripStatusLabel('failed'), variant: 'error' }
  }
  if (activeTripLoading && !activeTrip) {
    return { label: i18n.t('passenger:banner.syncing'), variant: 'idle' }
  }
  if (!uxState) {
    return { label: i18n.t('passenger:banner.syncing'), variant: 'idle' }
  }

  const statusLine = (s: string) =>
    i18n.t('trip:stateLine', { status: passengerTripStatusLabel(s) })

  switch (uxState) {
    case 'SEARCHING_DRIVER': {
      const label = i18n.t('passenger:banner.searching')
      return {
        label,
        variant: 'requested' as const,
        subLabel: activeTrip ? dedupeEstadoSubLabel(label, statusLine(activeTrip.status)) : undefined,
      }
    }
    case 'DRIVER_ASSIGNED':
      if (activeTrip?.status === 'assigned') {
        const label = i18n.t('passenger:banner.assigned')
        return {
          label,
          variant: 'assigned',
          subLabel: dedupeEstadoSubLabel(label, statusLine(activeTrip.status)),
        }
      }
      {
        const label = i18n.t('passenger:banner.enRoute')
        return {
          label,
          variant: 'accepted',
          subLabel: activeTrip ? dedupeEstadoSubLabel(label, statusLine(activeTrip.status)) : undefined,
        }
      }
    case 'DRIVER_ARRIVING': {
      const label = passengerTripStatusLabel('arriving')
      return {
        label,
        variant: 'arriving',
        subLabel: activeTrip ? dedupeEstadoSubLabel(label, statusLine(activeTrip.status)) : undefined,
      }
    }
    case 'TRIP_ONGOING': {
      const label = i18n.t('passenger:banner.ongoing')
      return {
        label,
        variant: 'ongoing',
        subLabel: activeTrip ? dedupeEstadoSubLabel(label, statusLine(activeTrip.status)) : undefined,
      }
    }
    case 'TRIP_COMPLETED': {
      const ps = activeTrip?.payment_status
      if (ps === 'succeeded') {
        return {
          label: i18n.t('passenger:banner.completed'),
          variant: 'completed',
          subLabel: i18n.t('passenger:banner.paymentConfirmed'),
        }
      }
      if (ps === 'processing' || ps === 'pending') {
        return {
          label: i18n.t('passenger:banner.completed'),
          variant: 'completed',
          subLabel: i18n.t('passenger:banner.paymentProcessing'),
        }
      }
      return { label: i18n.t('passenger:banner.completed'), variant: 'completed' }
    }
    default:
      return { label: i18n.t('passenger:banner.syncing'), variant: 'idle' }
  }
}
