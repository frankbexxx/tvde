/**
 * A019: MapTiler reverse geocoding (coords → morada legível).
 * Usa a mesma chave que o mapa (VITE_MAPTILER_KEY).
 */
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined

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
