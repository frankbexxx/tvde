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

/** Copy curta para UI passageiro (PT). */
export function formatApproxDistanceKm(km: number): string {
  if (km < 1) return `a ~${Math.round(km * 1000)} m`
  return `a ~${km.toFixed(1)} km`
}
