import { useEffect, useRef, useState } from 'react'

type LatLng = {
  lat: number
  lng: number
} | null

const METERS_THRESHOLD = 5

export const LISBON_FALLBACK = {
  lat: 38.7223,
  lng: -9.1393,
} as const

const DEMO_LOCATION_KEY = 'tvde_demo_location'

/** Check if demo location mode is active (no geolocation, use Lisbon). */
export function isDemoLocationEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (localStorage.getItem(DEMO_LOCATION_KEY) === '1') return true
    const params = new URLSearchParams(window.location.search)
    return params.get('demo') === '1' || params.get('demo') === 'true'
  } catch {
    return false
  }
}

/** Enable demo location (Lisbon, no permission prompt). Persists until disabled. */
export function setDemoLocationEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(DEMO_LOCATION_KEY, '1')
    } else {
      localStorage.removeItem(DEMO_LOCATION_KEY)
    }
  } catch {
    /* ignore */
  }
}

function toRadians(deg: number) {
  return (deg * Math.PI) / 180
}

// Haversine distance in meters between two lat/lng points
function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000 // earth radius in meters
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)

  const v =
    sinDLat * sinDLat +
    sinDLng * sinDLng * Math.cos(lat1) * Math.cos(lat2)

  const c = 2 * Math.atan2(Math.sqrt(v), Math.sqrt(1 - v))
  return R * c
}

/**
 * Watches the user's geolocation using the browser Geolocation API.
 * - Returns { lat, lng } (or null while unavailable)
 * - Uses high accuracy when possible
 * - Handles permission errors gracefully (logs to console)
 * - Ignores tiny movements (< ~5m) to reduce React re-renders and jitter.
 */
export function useGeolocation(): LatLng {
  const [position, setPosition] = useState<LatLng>(() => {
    if (isDemoLocationEnabled()) {
      return { lat: LISBON_FALLBACK.lat, lng: LISBON_FALLBACK.lng }
    }
    return null
  })
  const lastPositionRef = useRef<LatLng>(position)
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isDemoLocationEnabled()) {
      const fallback = { lat: LISBON_FALLBACK.lat, lng: LISBON_FALLBACK.lng }
      lastPositionRef.current = fallback
      setPosition(fallback)
      return
    }

    if (!('geolocation' in navigator)) {
      console.warn('Geolocation is not available in this browser.')
      return
    }

    const onSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords
      const next = { lat: latitude, lng: longitude }

      const prev = lastPositionRef.current
      if (prev) {
        const dist = distanceMeters(prev, next)
        if (dist < METERS_THRESHOLD) {
          return
        }
      }

      lastPositionRef.current = next
      setPosition(next)

      // We have a real GPS fix – cancel any pending fallback.
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current)
        fallbackTimeoutRef.current = null
      }
    }

    const onError = (err: GeolocationPositionError) => {
      console.warn('Geolocation error:', err.code, err.message)
      // Keep last known position if any; do not throw.
    }

    // If we don't get any position within 5s, fall back to Lisbon center.
    fallbackTimeoutRef.current = setTimeout(() => {
      if (!lastPositionRef.current) {
        console.warn('Geolocation fallback: using Lisbon center coordinates')
        const fallback = { lat: LISBON_FALLBACK.lat, lng: LISBON_FALLBACK.lng }
        lastPositionRef.current = fallback
        setPosition(fallback)
      }
    }, 5000)

    const watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    })

    return () => {
      navigator.geolocation.clearWatch(watchId)
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current)
        fallbackTimeoutRef.current = null
      }
    }
  }, [])

  return position
}


