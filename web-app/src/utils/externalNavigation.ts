/** Deep links para apps de navegação (abrem fora da TVDE). */

export function wazeNavigateUrl(lat: number, lng: number): string {
  const ll = `${lat},${lng}`
  return `https://waze.com/ul?ll=${encodeURIComponent(ll)}&navigate=yes`
}

export function googleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}&travelmode=driving`
}

/** Abre a home Waze (sessão / app em primeiro plano) — uma vez por sessão de browser. */
export function wazeWarmSessionUrl(): string {
  return 'https://www.waze.com/'
}
