import i18n from '../../i18n'

/** Trip status label for Partner UI only — unknown codes fall back to raw API value. */
export function partnerTripStatusLabel(status: string): string {
  const key = `partner:status.trip.${status}`
  if (i18n.exists(key)) return i18n.t(key)
  return status
}

/** Driver roster status label for Partner UI — pending | approved | rejected; else raw. */
export function partnerDriverStatusLabel(status: string): string {
  const key = `partner:status.driver.${status}`
  if (i18n.exists(key)) return i18n.t(key)
  return status
}
