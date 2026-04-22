import { useEffect, useRef, useState } from 'react'
import { isMockLocationModeEnabled } from '../dev/mockLocation'
import { MOCK_DRIVER_START, MOCK_PASSENGER_POSITION } from '../dev/mockPositions'
import { warn as logWarn } from '../utils/logger'

type LatLng = {
  lat: number
  lng: number
} | null

/** Movimento mínimo para atualizar estado — mais baixo = rasto mais “vivo” em deslocação real. */
const METERS_THRESHOLD = 4

/** Câmara Municipal de Oeiras, Largo Marquês de Pombal */
export const OEIRAS_FALLBACK = {
  lat: 38.6973,
  lng: -9.30836,
} as const

const DEMO_LOCATION_KEY = 'tvde_demo_location'
const GEOLOCATION_FAILED_KEY = 'tvde_geolocation_failed'

/** Check if demo location mode is active (no geolocation, use Oeiras fallback). */
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

/** Enable demo location (Oeiras fallback, no permission prompt). Persists until disabled. */
export function setDemoLocationEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(DEMO_LOCATION_KEY, '1')
      sessionStorage.removeItem(GEOLOCATION_FAILED_KEY)
    } else {
      localStorage.removeItem(DEMO_LOCATION_KEY)
      sessionStorage.removeItem(GEOLOCATION_FAILED_KEY)
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

export type GeolocationResult = {
  position: LatLng
  /** True when using fallback due to error/timeout (not demo mode). */
  usedFallback: boolean
  /**
   * Tenta novamente obter a localização real: limpa o flag de «falha desta sessão»
   * e re-subscreve `watchPosition`. Útil quando o utilizador move-se para um
   * local com melhor sinal, ou acabou de conceder permissão.
   *
   * No-op se o hook estiver em mock mode ou demo mode (não há o que tentar).
   */
  retry: () => void
}

export type GeolocationMockRole = 'passenger' | 'driver'

export type UseGeolocationOptions = {
  /** Em modo mock (dev): posição fixa — passageiro na recolha, motorista afastado (até simulação pós-aceitar). */
  mockRole?: GeolocationMockRole
}

function mockFixedPosition(role: GeolocationMockRole) {
  return role === 'driver' ? MOCK_DRIVER_START : MOCK_PASSENGER_POSITION
}

/**
 * Timeout (ms) antes de cair para Oeiras quando o browser ainda não deu posição.
 *
 * Valor subido de 3s para 10s em 2026-04-22: em desktop (Vivaldi/Firefox) a
 * geolocalização wifi via Google costuma demorar 3-8s; com 3s caíamos quase
 * sempre para fallback, marcávamos `sessionStorage.tvde_geolocation_failed=1`
 * e o passenger ficava preso em Oeiras para o resto da sessão. 10s dá uma
 * janela razoável sem tornar a app lenta no arranque em mobile (onde o GPS
 * hardware responde quase sempre em <1s e cancela o timer).
 */
const FALLBACK_AFTER_MS = 10_000

/**
 * Timeout (ms) do próprio `navigator.geolocation.watchPosition`. Mais generoso
 * que o nosso timer de fallback — se o browser responder entre os 10s e 15s
 * ainda aproveitamos a posição real. O onError tratará a janela >15s.
 */
const WATCH_POSITION_TIMEOUT_MS = 15_000

/**
 * Watches the user's geolocation using the browser Geolocation API.
 * - Returns { position, usedFallback, retry }
 * - After first failure, uses Oeiras without prompting again (sessionStorage).
 * - Uses high accuracy when possible
 * - Ignores tiny movements (< ~5m) to reduce React re-renders and jitter.
 */
export function useGeolocation(options?: UseGeolocationOptions): GeolocationResult {
  const mockRole = options?.mockRole ?? 'passenger'

  const [position, setPosition] = useState<LatLng>(() => {
    if (isMockLocationModeEnabled()) {
      const p = mockFixedPosition(mockRole)
      return { lat: p.lat, lng: p.lng }
    }
    if (isDemoLocationEnabled()) {
      return { lat: OEIRAS_FALLBACK.lat, lng: OEIRAS_FALLBACK.lng }
    }
    return null
  })
  const [usedFallback, setUsedFallback] = useState(false)
  /**
   * Contador de tentativas. Quando `retry()` é chamado, incrementamos este
   * valor — está nas dependências do `useEffect`, por isso força a re-execução
   * (re-subscribe do watchPosition + novo fallback timer).
   */
  const [retryCounter, setRetryCounter] = useState(0)
  const lastPositionRef = useRef<LatLng>(position)
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isMockLocationModeEnabled()) {
      const fixed = mockFixedPosition(mockRole)
      lastPositionRef.current = fixed
      queueMicrotask(() => {
        setPosition(fixed)
        setUsedFallback(false)
      })
      return
    }

    if (isDemoLocationEnabled()) {
      const fallback = { lat: OEIRAS_FALLBACK.lat, lng: OEIRAS_FALLBACK.lng }
      lastPositionRef.current = fallback
      queueMicrotask(() => {
        setPosition(fallback)
        setUsedFallback(false)
      })
      return
    }

    // After a previous geolocation failure in this session:
    // - passenger: keep fallback without prompting again (avoids repeated prompts on refresh)
    // - driver: keep trying to obtain a real fix (driver tracking should recover when permissions are granted later)
    try {
      if (sessionStorage.getItem(GEOLOCATION_FAILED_KEY) === '1') {
        const fallback = { lat: OEIRAS_FALLBACK.lat, lng: OEIRAS_FALLBACK.lng }
        lastPositionRef.current = fallback
        queueMicrotask(() => {
          setPosition(fallback)
          setUsedFallback(true)
        })
        if (mockRole !== 'driver') return
      }
    } catch {
      /* ignore */
    }

    if (!('geolocation' in navigator)) {
      logWarn('Geolocation is not available in this browser.')
      return
    }

    const applyFallback = () => {
      try {
        sessionStorage.setItem(GEOLOCATION_FAILED_KEY, '1')
      } catch {
        /* ignore */
      }
      const fallback = { lat: OEIRAS_FALLBACK.lat, lng: OEIRAS_FALLBACK.lng }
      lastPositionRef.current = fallback
      setPosition(fallback)
      setUsedFallback(true)
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
      setUsedFallback(false)

      // We have a real GPS fix – cancel any pending fallback.
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current)
        fallbackTimeoutRef.current = null
      }
    }

    const onError = (err: GeolocationPositionError) => {
      logWarn('Geolocation error:', err.code, err.message)
      applyFallback()
    }

    // If we don't get any position within FALLBACK_AFTER_MS, fall back to Oeiras (Câmara Municipal).
    fallbackTimeoutRef.current = setTimeout(() => {
      if (!lastPositionRef.current) {
        logWarn('Geolocation fallback: using Oeiras (Câmara Municipal) coordinates')
        applyFallback()
      }
    }, FALLBACK_AFTER_MS)

    const watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: WATCH_POSITION_TIMEOUT_MS,
    })

    return () => {
      navigator.geolocation.clearWatch(watchId)
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current)
        fallbackTimeoutRef.current = null
      }
    }
  }, [mockRole, retryCounter])

  const retry = () => {
    // Em mock/demo não há o que retentar — posição vem de uma constante.
    if (isMockLocationModeEnabled() || isDemoLocationEnabled()) return
    try {
      sessionStorage.removeItem(GEOLOCATION_FAILED_KEY)
    } catch {
      /* ignore */
    }
    setUsedFallback(false)
    lastPositionRef.current = null
    setPosition(null)
    setRetryCounter((n) => n + 1)
  }

  return { position, usedFallback, retry }
}


