/**
 * A019: MapTiler reverse geocoding (coords → morada legível).
 * Forward search: mesma API MapTiler Geocoding (texto → sugestões).
 */
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined

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

/**
 * Pesquisa de locais (MapTiler). Sem chave devolve lista vazia.
 */
export async function forwardGeocodeSearch(
  query: string,
  limit = 5
): Promise<GeocodeSuggestion[]> {
  const q = query.trim()
  if (q.length < 2 || !MAPTILER_KEY) return []

  try {
    const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${encodeURIComponent(MAPTILER_KEY)}&limit=${limit}`
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

export async function reverseGeocode(lng: number, lat: number): Promise<string> {
  if (!MAPTILER_KEY) {
    return 'Local selecionado'
  }
  try {
    const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${encodeURIComponent(MAPTILER_KEY)}`
    const res = await fetch(url)
    if (!res.ok) {
      return 'Local selecionado'
    }
    const data = (await res.json()) as { features?: Array<{ place_name?: string }> }
    const name = data.features?.[0]?.place_name
    if (typeof name === 'string' && name.trim()) {
      return name.trim()
    }
    return 'Local selecionado'
  } catch {
    return 'Local selecionado'
  }
}
