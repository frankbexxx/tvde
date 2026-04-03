import type { LatLng, RouteGeometry } from '../services/routingService'

function distM(a: LatLng, b: LatLng): number {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return R * (2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)))
}

function coordsToPath(coords: [number, number][]): LatLng[] {
  return coords.map(([lng, lat]) => ({ lat, lng }))
}

function downsamplePath(path: LatLng[], maxPoints: number): LatLng[] {
  if (path.length <= maxPoints) return path
  const out: LatLng[] = []
  const n = path.length
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.round((i * (n - 1)) / (maxPoints - 1))
    out.push(path[idx])
  }
  return out
}

/**
 * Converte geometria OSRM numa polilinha para `startTripSimulation`, com início em `from` e fim exacto em `pickup`.
 */
export function buildMockDriverApproachPath(
  from: LatLng,
  pickup: LatLng,
  osrm: RouteGeometry | null,
  maxPoints = 90
): LatLng[] {
  const fc = osrm?.features?.[0]?.geometry
  if (!fc || fc.type !== 'LineString' || !fc.coordinates?.length) {
    return [from, pickup]
  }

  let path = coordsToPath(fc.coordinates as [number, number][])
  path = downsamplePath(path, maxPoints)
  if (distM(from, path[0]) > 150) {
    path = [from, ...path]
  }
  const lastI = path.length - 1
  if (distM(path[lastI], pickup) > 100) {
    path = [...path, pickup]
  } else {
    path = [...path.slice(0, lastI), pickup]
  }
  return path
}
