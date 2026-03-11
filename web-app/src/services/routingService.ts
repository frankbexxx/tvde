import type { LineString } from 'geojson'

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

  const fetchRoute = async () => {
    const res = await fetch(url)
    if (!res.ok) {
      console.warn('OSRM route request failed', res.status, res.statusText)
      return null
    }

    const data = (await res.json()) as {
      routes?: Array<{ geometry: LineString }>
    }

    const geometry = data.routes?.[0]?.geometry
    if (!geometry || geometry.type !== 'LineString' || !geometry.coordinates) {
      return null
    }

    const featureCollection: RouteGeometry = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: geometry.coordinates,
          },
          properties: {},
        },
      ],
    }

    return featureCollection
  }

  try {
    return await fetchRoute()
  } catch (err) {
    console.warn('OSRM route request failed, retrying once...', err)
    try {
      return await fetchRoute()
    } catch (err2) {
      console.warn('OSRM route retry failed, giving up.', err2)
      return null
    }
  }
}


