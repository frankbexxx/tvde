/** Earth mean radius km — Haversine distance between two WGS84 points. */
const EARTH_RADIUS_KM = 6371

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const la1 = toRad(a.lat)
  const la2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Raio para o motorista poder «Iniciar viagem» em relação ao ponto de recolha (contrato no mapa). */
export const DRIVER_START_TRIP_MAX_DISTANCE_M = 50

export function isWithinHaversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  maxMeters: number
): boolean {
  return haversineKm(a, b) * 1000 <= maxMeters
}

/** Copy curta para UI passageiro (PT). */
export function formatApproxDistanceKm(km: number): string {
  if (km < 1) return `a ~${Math.round(km * 1000)} m`
  return `a ~${km.toFixed(1)} km`
}
