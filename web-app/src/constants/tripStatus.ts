import type { StatusVariant } from '../components/layout/StatusHeader'
import type { TripCreateResponse, TripDetailResponse } from '../api/trips'

/** Ordem do ciclo de vida da viagem (API ↔ UI). */
export const TRIP_STATE_RANK: Record<string, number> = {
  requested: 0,
  assigned: 1,
  accepted: 2,
  arriving: 3,
  ongoing: 4,
  completed: 10,
  cancelled: 10,
  failed: 10,
}

export function tripStateRank(s: string): number {
  return TRIP_STATE_RANK[s] ?? -1
}

export function isActiveTripStatus(status: string): boolean {
  return !['completed', 'cancelled', 'failed'].includes(status)
}

export function isFinalTripStatus(status: string): boolean {
  return ['completed', 'cancelled', 'failed'].includes(status)
}

/** Antes do motorista chegar ao ponto de recolha (visão passageiro). */
export function isPrePickupStatus(status: string): boolean {
  return status === 'requested' || status === 'assigned'
}

export function mergeDriverPolledWithOverride(
  polled: string | undefined,
  override: string | null,
  fallback: string
): string {
  if (!override) return polled ?? fallback
  const pr = polled !== undefined ? tripStateRank(polled) : -1
  const or = tripStateRank(override)
  if (pr >= or) return polled ?? fallback
  return override
}

export function mergePassengerPolledWithPending(
  polled: TripDetailResponse | null,
  pending: TripDetailResponse | null,
  tripId: string | null
): TripDetailResponse | null {
  if (!tripId) return polled
  if (!pending || pending.trip_id !== tripId) return polled
  if (!polled) return pending
  const pr = tripStateRank(polled.status)
  const pe = tripStateRank(pending.status)
  if (pr >= pe) return polled
  return { ...polled, status: pending.status }
}

/** Labels — passageiro (estado API → texto humano). */
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
export const DRIVER_ACTIVE_TRIP_UI: Record<string, { label: string; variant: StatusVariant }> = {
  assigned: { label: 'Viagem atribuída — confirma para avançar', variant: 'assigned' },
  accepted: { label: 'A caminho do passageiro', variant: 'accepted' },
  arriving: { label: 'No local de recolha', variant: 'arriving' },
  ongoing: { label: 'Em viagem', variant: 'ongoing' },
  completed: { label: 'Viagem concluída', variant: 'completed' },
}

export function driverActiveTripUi(status: string): { label: string; variant: StatusVariant } {
  return DRIVER_ACTIVE_TRIP_UI[status] ?? { label: status, variant: 'idle' }
}

/** Pedidos na lista «disponíveis» — API não envia `status` por item. */
export const DRIVER_AVAILABLE_TRIP_STATUS_LABEL = 'Pedido disponível'

export const DRIVER_NEW_TRIP_LIST_HINT = 'Nova viagem disponível'

/** P6: leitura rápida no ecrã do motorista. */
export const DRIVER_STATUS_BADGE_SHORT: Record<string, string> = {
  requested: 'Aguardando',
  assigned: 'Aguardando',
  accepted: 'A caminho',
  arriving: 'A caminho',
  ongoing: 'Em curso',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  failed: 'Interrompida',
}

export function driverTripBadgeShort(status: string): string {
  return DRIVER_STATUS_BADGE_SHORT[status] ?? status
}

/**
 * Classe Tailwind para um dot de 8px colorido, usado no histórico de viagens
 * (passenger e driver). Pattern semântico alinhado com a paleta do tema
 * (ver docs/meta/THEME_REFACTOR_2026-04-20.md):
 *
 *  - completed → verde `success` (resultado positivo).
 *  - failed    → `destructive/70` (algo correu mal, vale a atenção).
 *  - cancelled → cinza muted (cancelada é comum e normal; vermelho seria
 *                 alarmista para algo que o utilizador frequentemente inicia).
 *  - outros    → cinza muted (fallback defensivo).
 *
 * Uso típico:
 *   <span className={`h-2 w-2 rounded-full shrink-0 ${historyStatusDotColor(t.status)}`} />
 */
export function historyStatusDotColor(status: string): string {
  if (status === 'completed') return 'bg-success'
  if (status === 'failed') return 'bg-destructive/70'
  return 'bg-muted-foreground/40'
}

export function tripDetailFromCreateResponse(
  res: TripCreateResponse,
  pickup: { lat: number; lng: number },
  dropoff: { lat: number; lng: number }
): TripDetailResponse {
  const now = new Date().toISOString()
  return {
    trip_id: res.trip_id,
    status: res.status,
    passenger_id: '',
    origin_lat: pickup.lat,
    origin_lng: pickup.lng,
    destination_lat: dropoff.lat,
    destination_lng: dropoff.lng,
    estimated_price: res.estimated_price,
    final_price: res.final_price,
    created_at: now,
    updated_at: now,
    payment_status: res.payment_status,
  }
}
