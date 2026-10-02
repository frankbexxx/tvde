export function cleanPartnerText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null
  return trimmed
}

type NamedDriver = {
  user_id: string
  user: { name: string | null }
}

/** Name already present on the loaded fleet roster. Never returns an id. */
export function partnerDriverNameForTrip(
  driverId: string | null | undefined,
  drivers: readonly NamedDriver[],
): string | null {
  if (!driverId) return null
  const row = drivers.find((driver) => driver.user_id === driverId)
  return cleanPartnerText(row?.user.name)
}

/**
 * Human trip title from fields the partner already has.
 * Place names only when the caller already resolved them.
 * The trip id is never part of this title.
 */
export function partnerTripHumanTitle(input: {
  originLabel?: string | null
  destinationLabel?: string | null
  driverName?: string | null
  vehiclePlate?: string | null
  createdAtLabel: string
}): string {
  const origin = cleanPartnerText(input.originLabel)
  const destination = cleanPartnerText(input.destinationLabel)
  if (origin && destination) return `${origin} → ${destination}`
  if (origin) return origin
  if (destination) return destination
  const who = [cleanPartnerText(input.driverName), cleanPartnerText(input.vehiclePlate)]
    .filter(Boolean)
    .join(' · ')
  if (who) return who
  return input.createdAtLabel
}
