const DRIVER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
}

export const ADMIN_DRIVER_NAME_FALLBACK = 'Motorista sem nome disponível'
export const ADMIN_DRIVER_NO_FLEET = 'Sem frota associada'
export const ADMIN_DRIVER_FLEET_UNKNOWN = 'Frota não identificada'

function clean(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null
  return trimmed
}

export type AdminDriverContext = {
  nameLabel: string
  phone: string | null
  statusLabel: string
  fleetLabel: string
  fleetNamed: boolean
}

/** Joins a driver row to people and fleets already loaded on the Dados tab. */
export function adminDriverContext(input: {
  status: string
  user: { name?: string | null; phone?: string | null } | null
  partnerId: string | null | undefined
  partnerFound: boolean
  partnerName?: string | null
}): AdminDriverContext {
  const name = input.user ? clean(input.user.name) : null
  const phone = input.user ? clean(input.user.phone) : null
  const partnerId = clean(input.partnerId)
  const partnerName = input.partnerFound ? clean(input.partnerName) : null
  let fleetLabel = ADMIN_DRIVER_NO_FLEET
  let fleetNamed = false
  if (partnerId) {
    if (partnerName) {
      fleetLabel = partnerName
      fleetNamed = true
    } else {
      fleetLabel = ADMIN_DRIVER_FLEET_UNKNOWN
    }
  }
  const rawStatus = clean(input.status) ?? ''
  const human = DRIVER_STATUS_LABELS[rawStatus]
  return {
    nameLabel: name ?? ADMIN_DRIVER_NAME_FALLBACK,
    phone,
    statusLabel: human ? `${human} (${rawStatus})` : rawStatus,
    fleetLabel,
    fleetNamed,
  }
}
