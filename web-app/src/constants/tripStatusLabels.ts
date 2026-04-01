import type { StatusVariant } from '../components/layout/StatusHeader'
import type { PaymentStatus } from '../api/trips'

/** Labels alinhados com UX_MINI_ROADMAP — passageiro (estado API → texto humano). */
export const PASSENGER_TRIP_STATUS_LABELS: Record<string, string> = {
  requested: 'À procura de motorista',
  assigned: 'Motorista atribuído',
  accepted: 'Motorista a caminho',
  arriving: 'Motorista quase a chegar',
  ongoing: 'Viagem em curso',
  completed: 'Viagem concluída',
  cancelled: 'Viagem cancelada',
  failed: 'Viagem não concluída',
}

export function passengerTripStatusLabel(status: string): string {
  return PASSENGER_TRIP_STATUS_LABELS[status] ?? status
}

/** Viagem ativa no ecrã do motorista — label + variante do header. */
export const DRIVER_ACTIVE_TRIP_UI: Record<
  string,
  { label: string; variant: StatusVariant }
> = {
  assigned: { label: 'Viagem atribuída — confirma para avançar', variant: 'assigned' },
  accepted: { label: 'A caminho do passageiro', variant: 'accepted' },
  arriving: { label: 'No local de recolha', variant: 'arriving' },
  ongoing: { label: 'Em viagem', variant: 'ongoing' },
  completed: { label: 'Viagem concluída', variant: 'completed' },
}

/** Pedidos na lista «disponíveis» — a API não envia `status` por item; é o estado implícito da fila. */
export const DRIVER_AVAILABLE_TRIP_STATUS_LABEL = 'Pedido disponível'

export function driverActiveTripUi(status: string): { label: string; variant: StatusVariant } {
  return DRIVER_ACTIVE_TRIP_UI[status] ?? { label: status, variant: 'idle' }
}

/** Lista de pedidos disponíveis — linha de contexto acima do cartão. */
export const DRIVER_NEW_TRIP_LIST_HINT = 'Nova viagem disponível'

/** Estado de pagamento vindo da API (`payment_status`) — só UI. */
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'Pagamento pendente',
  processing: 'Pagamento a processar…',
  succeeded: 'Pagamento concluído',
  failed: 'Pagamento recusado',
}

export function paymentStatusLabel(status: PaymentStatus | undefined | null): string | null {
  if (status == null) return null
  return PAYMENT_STATUS_LABEL[status] ?? null
}
