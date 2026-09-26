/** Deep links para apps de navegação (abrem fora da TVDE). */

const LAT_LIMIT = 90
const LNG_LIMIT = 180

/** Latitude/longitude finitas e dentro dos limites geográficos. */
export function isValidNavCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= LAT_LIMIT &&
    Math.abs(lng) <= LNG_LIMIT
  )
}

function coordPair(lat: number, lng: number): string {
  return encodeURIComponent(`${lat},${lng}`)
}

/** App Waze instalada. `geo:` não é usado: abriria o handler por omissão, não o Waze. */
export function wazeAppUrl(lat: number, lng: number): string {
  return `waze://?ll=${coordPair(lat, lng)}&navigate=yes`
}

/** Fallback HTTPS quando a app Waze não está instalada. */
export function wazeNavigateUrl(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${coordPair(lat, lng)}&navigate=yes`
}

/** Navegação na app Google Maps (`google.navigation`). */
export function googleMapsAppUrl(lat: number, lng: number): string {
  return `google.navigation:q=${coordPair(lat, lng)}&mode=d`
}

/** Fallback HTTPS de direcções. */
export function googleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${coordPair(lat, lng)}&travelmode=driving`
}

/** Pesquisa de um ponto (parceiro). Não é navegação turno-a-turno. */
export function googleMapsSearchUrl(lat: number, lng: number): string | null {
  if (!isValidNavCoordinate(lat, lng)) return null
  return `https://www.google.com/maps/search/?api=1&query=${coordPair(lat, lng)}`
}
