import { useEffect, useRef, useState } from 'react'

type LatLng = {
  lat: number
  lng: number
} | null

const METERS_THRESHOLD = 5

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
  const [position, setPosition] = useState<LatLng>(null)
  const lastPositionRef = useRef<LatLng>(null)

  useEffect(() => {
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
    }

    const onError = (err: GeolocationPositionError) => {
      console.warn('Geolocation error:', err.code, err.message)
      // Keep last known position if any; do not throw.
    }

    const watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    })

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [])

  return position
}


