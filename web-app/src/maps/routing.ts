/**
 * A017: rota OSRM para pré-visualização em modo planeamento.
 * Usa a mesma implementação que `services/routingService` (um só sítio para URL/retry).
 */
import type { FeatureCollection, LineString } from 'geojson'
import { getRoute, type LatLng } from '../services/routingService'

export async function getRouteGeoJSON(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<FeatureCollection<LineString> | null> {
  return getRoute(from as LatLng, to as LatLng)
}
