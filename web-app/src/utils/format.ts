/**
 * Format coords for display - user-friendly, no raw IDs.
 * Demo: Lisbon area -> simple labels.
 */
export function formatPickup(lat: number, lng: number): string {
  // Demo: Lisbon coords
  if (lat >= 38.7 && lat <= 38.75 && lng >= -9.2 && lng <= -9.1) {
    return 'Centro de Lisboa'
  }
  return `${lat.toFixed(2)}, ${lng.toFixed(2)}`
}

export function formatDestination(lat: number, lng: number): string {
  if (lat >= 38.7 && lat <= 38.75 && lng >= -9.2 && lng <= -9.1) {
    return 'Lisboa'
  }
  return `${lat.toFixed(2)}, ${lng.toFixed(2)}`
}
