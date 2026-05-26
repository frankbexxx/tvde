const DISMISSED_OFFERS_STORAGE_KEY = 'tvde_dismissed_offer_trip_ids'

export function readDismissedOfferTripIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISSED_OFFERS_STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0))
  } catch {
    return new Set()
  }
}

export function persistDismissedOfferTripIds(ids: Set<string>): void {
  try {
    sessionStorage.setItem(DISMISSED_OFFERS_STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    /* ignore quota / private mode */
  }
}

export function isDriverOfferExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false
  const ms = Date.parse(expiresAt)
  if (Number.isNaN(ms)) return false
  return ms <= Date.now()
}
