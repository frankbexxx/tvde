/**
 * Format coords for display - user-friendly, no raw IDs.
 */
export function formatPickup(lat: number, lng: number): string {
  if (lat >= 38.68 && lat <= 38.72 && lng >= -9.35 && lng <= -9.25) {
    return 'Oeiras'
  }
  if (lat >= 38.7 && lat <= 38.75 && lng >= -9.2 && lng <= -9.1) {
    return 'Centro de Lisboa'
  }
  return `${lat.toFixed(2)}, ${lng.toFixed(2)}`
}

export function formatDestination(lat: number, lng: number): string {
  if (lat >= 38.68 && lat <= 38.72 && lng >= -9.35 && lng <= -9.25) {
    return 'Oeiras'
  }
  if (lat >= 38.7 && lat <= 38.75 && lng >= -9.2 && lng <= -9.1) {
    return 'Lisboa'
  }
  return `${lat.toFixed(2)}, ${lng.toFixed(2)}`
}
