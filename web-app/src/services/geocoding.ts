/**
 * A019: Forward/reverse geocoding.
 *
 * Provider primário: MapTiler (quando `VITE_MAPTILER_KEY` está definida).
 * Fallback: OpenStreetMap Nominatim (sem chave), para garantir que a
 * pesquisa de morada funciona no piloto mesmo sem chave MapTiler
 * configurada no ambiente.
 */
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined

/**
 * Coordenadas aproximadas da área metropolitana de Lisboa usadas como
 * viewbox/proximity hint para melhorar a qualidade das sugestões durante
 * o piloto (Oeiras/Lisboa/Cascais). Não restringe resultados — apenas
 * aproxima-os geograficamente.
 */
const LISBON_PROXIMITY = { lng: -9.1393, lat: 38.7223 }
const PORTUGAL_BOUNDS = [
  { minLng: -9.7, minLat: 36.8, maxLng: -6.1, maxLat: 42.3 }, // Continente
  { minLng: -17.4, minLat: 32.2, maxLng: -16.1, maxLat: 33.3 }, // Madeira
  { minLng: -31.4, minLat: 36.8, maxLng: -24.8, maxLat: 40.1 }, // Acores
]

export type GeocodeSuggestion = {
  id: string
  lat: number
  lng: number
  primary: string
  secondary: string
}

type MTFeature = {
  type?: string
  geometry?: { type?: string; coordinates?: number[] }
  place_name?: string
  text?: string
}

type NominatimItem = {
  place_id?: number | string
  lat?: string | number
  lon?: string | number
  display_name?: string
  name?: string
  address?: Record<string, string | undefined>
}

export function isLikelyInPortugal(lng: number, lat: number): boolean {
  return PORTUGAL_BOUNDS.some(
    (b) => lng >= b.minLng && lng <= b.maxLng && lat >= b.minLat && lat <= b.maxLat
  )
}

/** Expõe para testes unitários. */
export function splitPlaceName(placeName: string): { primary: string; secondary: string } {
  const trimmed = placeName.trim()
  const i = trimmed.indexOf(',')
  if (i === -1) return { primary: trimmed, secondary: '' }
  return {
    primary: trimmed.slice(0, i).trim(),
    secondary: trimmed.slice(i + 1).trim(),
  }
}

export function mapMtilerFeatureToSuggestion(
  feature: MTFeature,
  index: number
): GeocodeSuggestion | null {
  const coords = feature.geometry?.coordinates
  if (!Array.isArray(coords) || coords.length < 2) return null
  const lng = Number(coords[0])
  const lat = Number(coords[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (!isLikelyInPortugal(lng, lat)) return null
  const raw =
    typeof feature.place_name === 'string' && feature.place_name.trim()
      ? feature.place_name.trim()
      : typeof feature.text === 'string' && feature.text.trim()
        ? feature.text.trim()
        : ''
  if (!raw) return null
  const { primary, secondary } = splitPlaceName(raw)
  return {
    id: `${index}-${lat.toFixed(5)}-${lng.toFixed(5)}`,
    lat,
    lng,
    primary,
    secondary,
  }
}

export function mapNominatimItemToSuggestion(
  item: NominatimItem,
  index: number
): GeocodeSuggestion | null {
  const lat = Number(item.lat)
  const lng = Number(item.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (!isLikelyInPortugal(lng, lat)) return null
  const display =
    typeof item.display_name === 'string' && item.display_name.trim()
      ? item.display_name.trim()
      : typeof item.name === 'string' && item.name.trim()
        ? item.name.trim()
        : ''
  if (!display) return null
  const { primary, secondary } = splitPlaceName(display)
  const pid = item.place_id != null ? String(item.place_id) : `${index}`
  return {
    id: `nom-${pid}-${lat.toFixed(5)}-${lng.toFixed(5)}`,
    lat,
    lng,
    primary,
    secondary,
  }
}

async function maptilerForwardSearch(q: string, limit: number): Promise<GeocodeSuggestion[]> {
  if (!MAPTILER_KEY) return []
  try {
    const params = new URLSearchParams({
      key: MAPTILER_KEY,
      limit: String(limit),
      language: 'pt',
      country: 'pt',
      proximity: `${LISBON_PROXIMITY.lng},${LISBON_PROXIMITY.lat}`,
    })
    const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?${params.toString()}`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = (await res.json()) as { features?: MTFeature[] }
    const features = data.features ?? []
    const out: GeocodeSuggestion[] = []
    for (let i = 0; i < features.length; i++) {
      const s = mapMtilerFeatureToSuggestion(features[i], i)
      if (s) out.push(s)
    }
    return out
  } catch {
    return []
  }
}

async function nominatimForwardSearch(q: string, limit: number): Promise<GeocodeSuggestion[]> {
  try {
    const params = new URLSearchParams({
      format: 'json',
      q,
      limit: String(limit),
      addressdetails: '0',
      'accept-language': 'pt',
      countrycodes: 'pt',
    })
    // viewbox (left,top,right,bottom) ~ Lisboa metro, sem bounded para não restringir
    params.set(
      'viewbox',
      `${LISBON_PROXIMITY.lng - 0.8},${LISBON_PROXIMITY.lat + 0.5},${LISBON_PROXIMITY.lng + 0.8},${LISBON_PROXIMITY.lat - 0.5}`
    )
    const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return []
    const data = (await res.json()) as NominatimItem[]
    const out: GeocodeSuggestion[] = []
    for (let i = 0; i < data.length; i++) {
      const s = mapNominatimItemToSuggestion(data[i], i)
      if (s) out.push(s)
    }
    return out
  } catch {
    return []
  }
}

/**
 * Pesquisa de locais. Usa MapTiler se houver chave; caso contrário,
 * (ou se o MapTiler falhar/devolver vazio) cai para Nominatim.
 */
export async function forwardGeocodeSearch(
  query: string,
  limit = 5
): Promise<GeocodeSuggestion[]> {
  const q = query.trim()
  if (q.length < 2) return []

  if (MAPTILER_KEY) {
    const primary = await maptilerForwardSearch(q, limit)
    if (primary.length > 0) return primary
  }
  return nominatimForwardSearch(q, limit)
}

async function maptilerReverseGeocode(lng: number, lat: number): Promise<string | null> {
  if (!MAPTILER_KEY) return null
  try {
    const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${encodeURIComponent(MAPTILER_KEY)}&language=pt`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = (await res.json()) as { features?: Array<{ place_name?: string }> }
    const name = data.features?.[0]?.place_name
    if (typeof name === 'string' && name.trim()) return name.trim()
    return null
  } catch {
    return null
  }
}

async function nominatimReverseGeocode(lng: number, lat: number): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      format: 'json',
      lat: String(lat),
      lon: String(lng),
      'accept-language': 'pt',
      zoom: '18',
      addressdetails: '0',
    })
    const url = `https://nominatim.openstreetmap.org/reverse?${params.toString()}`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const data = (await res.json()) as { display_name?: string }
    if (typeof data.display_name === 'string' && data.display_name.trim()) {
      return data.display_name.trim()
    }
    return null
  } catch {
    return null
  }
}

export async function reverseGeocode(lng: number, lat: number): Promise<string> {
  const fromMaptiler = await maptilerReverseGeocode(lng, lat)
  if (fromMaptiler) return fromMaptiler
  const fromNominatim = await nominatimReverseGeocode(lng, lat)
  if (fromNominatim) return fromNominatim
  return 'Local selecionado'
}
