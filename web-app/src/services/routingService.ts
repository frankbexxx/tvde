import type { FeatureCollection, LineString } from 'geojson'

export interface LatLng {
  lat: number
  lng: number
}

export interface RouteGeometry {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: LineString
    properties: Record<string, unknown>
  }>
}

/**
 * Fetch a driving route between two points using the public OSRM demo server.
 *
 * Service URL:
 *   https://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=geojson
 */
export async function getRoute(from: LatLng, to: LatLng): Promise<RouteGeometry | null> {
  const baseUrl = 'https://router.project-osrm.org/route/v1/driving'
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`
  const url = `${baseUrl}/${coords}?overview=full&geometries=geojson`

  const res = await fetch(url)
  if (!res.ok) {
    console.warn('OSRM route request failed', res.status, res.statusText)
    return null
  }

  const data = (await res.json()) as {
    routes?: Array<{ geometry: FeatureCollection<LineString> }>
  }

  const geometry = data.routes?.[0]?.geometry
  if (!geometry) {
    return null
  }

  // Normalize to a FeatureCollection<LineString> for MapLibre Source
  const featureCollection: RouteGeometry = {
    type: 'FeatureCollection',
    features: geometry.features.map((f) => ({
      type: 'Feature',
      geometry: f.geometry,
      properties: f.properties ?? {},
    })),
  }

  return featureCollection
}

