import { useEffect, useState } from 'react'

type LatLng = {
  lat: number
  lng: number
} | null

/**
 * Watches the user's geolocation using the browser Geolocation API.
 * - Returns { lat, lng } (or null while unavailable)
 * - Uses high accuracy when possible
 * - Handles permission errors gracefully (logs to console)
 */
export function useGeolocation(): LatLng {
  const [position, setPosition] = useState<LatLng>(null)

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      console.warn('Geolocation is not available in this browser.')
      return
    }

    const onSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords
      setPosition({ lat: latitude, lng: longitude })
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

