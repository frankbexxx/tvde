/**
 * A014: Cópia e variante do painel superior — alinhado com estados reais da trip (API).
 */
import type { StatusVariant } from '../../components/layout/StatusHeader'
import type { TripDetailResponse } from '../../api/trips'
import { passengerTripStatusLabel } from '../../constants/tripStatusLabels'
import type { PassengerUxState } from './usePassengerUxState'
import { formatApiErrorFromUnknown } from '../../utils/apiErrorDetail'

/** Evita «Estado: X» quando X já é o título — menos ruído com StatusHeader + cartão A014. */
function dedupeEstadoSubLabel(label: string, subLabel?: string): string | undefined {
  if (!subLabel) return undefined
  if (!/^Estado:\s*/i.test(subLabel)) return subLabel
  const tail = subLabel.replace(/^Estado:\s*/i, '').trim()
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
    return { label: 'A enviar pedido…', variant: 'requested' }
  }
  if (!activeTripId) {
    return { label: 'Pronto', variant: 'idle' }
  }
  if (activeTripId && !isOnline) {
    return {
      label: 'Sem ligação — verifica a rede',
      variant: 'idle',
      subLabel: 'Quando voltares a ficar online, a app volta a atualizar sozinha. Podes tentar recarregar a página.',
    }
  }
  if (activeTrip?.payment_status === 'failed') {
    return {
      label: 'Pagamento recusado',
      variant: 'error',
      subLabel: 'Tenta pedir de novo ou contacta o suporte se o problema continuar.',
    }
  }
  if (activeTrip?.status === 'cancelled') {
    return { label: passengerTripStatusLabel('cancelled'), variant: 'idle' }
  }
  if (activeTrip?.status === 'failed') {
    return { label: passengerTripStatusLabel('failed'), variant: 'error' }
  }
  if (activeTripLoading && !activeTrip) {
    return { label: 'A sincronizar viagem…', variant: 'idle' }
  }
  if (!uxState) {
    return { label: 'A sincronizar viagem…', variant: 'idle' }
  }

  const statusLine = (s: string) => `Estado: ${passengerTripStatusLabel(s)}`

  switch (uxState) {
    case 'SEARCHING_DRIVER': {
      const label = 'À procura de motorista'
      return {
        label,
        variant: 'requested' as const,
        subLabel: activeTrip ? dedupeEstadoSubLabel(label, statusLine(activeTrip.status)) : undefined,
      }
    }
    case 'DRIVER_ASSIGNED':
      if (activeTrip?.status === 'assigned') {
        const label = 'Motorista atribuído'
        return {
          label,
          variant: 'assigned',
          subLabel: dedupeEstadoSubLabel(label, statusLine(activeTrip.status)),
        }
      }
      {
        const label = 'Motorista a caminho'
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
      const label = 'Viagem em curso'
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
          label: 'Viagem concluída',
          variant: 'completed',
          subLabel: 'Pagamento confirmado.',
        }
      }
      if (ps === 'processing' || ps === 'pending') {
        return {
          label: 'Viagem concluída',
          variant: 'completed',
          subLabel:
            'O pagamento pode demorar alguns segundos a aparecer como concluído — mantém esta página aberta.',
        }
      }
      return { label: 'Viagem concluída', variant: 'completed' }
    }
    default:
      return { label: 'A sincronizar viagem…', variant: 'idle' }
  }
}

export function humanizeCreateTripError(errOrDetail: unknown): string {
  const raw = formatApiErrorFromUnknown(errOrDetail)
  const s = raw.toLowerCase()
  if (s.includes('timeout') || s.includes('indispon') || s.includes('abort')) {
    return 'Servidor lento ou indisponível. Tenta novamente dentro de momentos.'
  }
  if (s.includes('rate') || s.includes('limite') || s.includes('too many')) {
    return 'Muitos pedidos seguidos. Aguarda um pouco e tenta de novo.'
  }
  if (raw.length > 0 && raw.length < 160) {
    return raw
  }
  return 'Não foi possível pedir a viagem. Verifica a ligação e tenta de novo.'
}

export function humanizeCancelError(errOrDetail: unknown): string {
  const raw = formatApiErrorFromUnknown(errOrDetail)
  const s = raw.toLowerCase()
  if (s.includes('timeout') || s.includes('indispon') || s.includes('network')) {
    return 'Não foi possível cancelar agora — verifica a ligação e tenta de novo.'
  }
  if (raw.length > 0 && raw.length < 160) return raw
  return 'Não foi possível cancelar a viagem. Tenta de novo.'
}
