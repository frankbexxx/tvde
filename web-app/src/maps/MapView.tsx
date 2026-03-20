import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import Map from 'react-map-gl/maplibre'
import type { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { FeatureCollection, LineString } from 'geojson'
import { PassengerMarker } from './PassengerMarker'
import { DriverMarker } from './DriverMarker'
import { RouteLine } from './RouteLine'
import { getRoute } from '../services/routingService'

type LatLng = {
  lat: number
  lng: number
}

type RoutePoints = {
  from: LatLng
  to: LatLng
}

export interface MapViewProps {
  passengerLocation?: LatLng | null
  driverLocation?: LatLng | null
  route?: RoutePoints | null
  className?: string
  overlay?: ReactNode
  /** A014: false = placeholder com mesma altura (ex. requested ou sem GPS do motorista) */
  showMap?: boolean
  /** Mensagem quando showMap é false */
  mapPlaceholder?: string
  /** A015/A016: recolha (âmbar) */
  pickupSelection?: LatLng | null
  /** A016: destino (cor distinta) */
  dropoffSelection?: LatLng | null
  /** A016: um clique → pickup se ainda não existe, senão atualiza só dropoff */
  onPlanningMapClick?: (coords: LatLng) => void
}

/** Câmara Municipal de Oeiras — centro inicial do mapa */
const OEIRAS_CENTER: LatLng = { lat: 38.6973, lng: -9.30836 }

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY
const DEFAULT_MAP_STYLE = 'https://demotiles.maplibre.org/style.json'
// basic-v2 has fewer sprites than streets-v2, avoids "image could not be loaded" errors
const MAPTILER_STYLE = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/basic-v2/style.json?key=${MAPTILER_KEY}`
  : DEFAULT_MAP_STYLE

export function MapView({
  passengerLocation,
  driverLocation,
  route,
  className,
  overlay,
  showMap = true,
  mapPlaceholder = 'Mapa indisponível neste momento.',
  pickupSelection = null,
  dropoffSelection = null,
  onPlanningMapClick,
}: MapViewProps) {
  const mapRef = useRef<MapRef | null>(null)
  const prevDriverRef = useRef<LatLng | null>(null)
  const [hasInitialFit, setHasInitialFit] = useState(false)
  const [routeGeometry, setRouteGeometry] = useState<FeatureCollection<LineString> | null>(null)
  const [lastRouteKey, setLastRouteKey] = useState<string | null>(null)

  const initialViewState = useMemo(
    () => ({
      latitude: OEIRAS_CENTER.lat,
      longitude: OEIRAS_CENTER.lng,
      zoom: 13,
    }),
    []
  )

  // Fetch OSRM route when endpoints change (debounced by key)
  useEffect(() => {
    if (!showMap) {
      setRouteGeometry(null)
      setLastRouteKey(null)
      return
    }
    if (!route) {
      setRouteGeometry(null)
      setLastRouteKey(null)
      return
    }

    const key = `${route.from.lat},${route.from.lng}|${route.to.lat},${route.to.lng}`
    if (key === lastRouteKey && routeGeometry) {
      return
    }

    let cancelled = false
    setLastRouteKey(key)

    const fetchRoute = async () => {
      try {
        const geo = await getRoute(route.from, route.to)
        if (!cancelled) {
          setRouteGeometry(geo as FeatureCollection<LineString> | null)
        }
      } catch (err) {
        console.warn('Failed to fetch route from OSRM', err)
      }
    }

    void fetchRoute()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMap, route?.from.lat, route?.from.lng, route?.to.lat, route?.to.lng])

  // On first availability of a passenger location, gently recenter the map
  useEffect(() => {
    if (!passengerLocation || hasInitialFit) return
    const map = mapRef.current?.getMap()
    if (!map) return

    map.easeTo({
      center: [passengerLocation.lng, passengerLocation.lat],
      duration: 800,
      zoom: 14,
    })
    setHasInitialFit(true)
  }, [passengerLocation, hasInitialFit])

  // When driver appears (ASSIGNED state), smooth pan to driver
  useEffect(() => {
    if (!driverLocation) return
    const map = mapRef.current?.getMap()
    if (!map) return
    if (prevDriverRef.current?.lat === driverLocation.lat && prevDriverRef.current?.lng === driverLocation.lng) return
    prevDriverRef.current = driverLocation

    map.easeTo({
      center: [driverLocation.lng, driverLocation.lat],
      duration: 700,
      zoom: 15,
    })
  }, [driverLocation])

  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      if (!onPlanningMapClick) return
      const { lng, lat } = e.lngLat
      onPlanningMapClick({ lat, lng })
    },
    [onPlanningMapClick]
  )

  const frameClass = `relative w-full rounded-2xl overflow-hidden shadow-card bg-card transition-opacity duration-500 ease-out motion-reduce:transition-none ${className ?? ''}`

  if (!showMap) {
    return (
      <div className={frameClass}>
        <div
          className="h-[45vh] min-h-[220px] max-h-[420px] flex flex-col items-center justify-center gap-3 px-6 bg-muted/60 border border-dashed border-border animate-in fade-in duration-500"
          role="region"
          aria-label="Mapa"
        >
          <p className="text-center text-base font-medium text-foreground max-w-sm">{mapPlaceholder}</p>
          <p className="text-center text-sm text-muted-foreground max-w-xs">
            O mapa aparece quando o motorista tiver posição ativa.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${frameClass} animate-in fade-in duration-500`}>
      <div className="h-[45vh] min-h-[220px] max-h-[420px]">
        <Map
          ref={mapRef}
          mapLib={maplibregl}
          initialViewState={initialViewState}
          reuseMaps
          style={{
            width: '100%',
            height: '100%',
            cursor: onPlanningMapClick ? 'crosshair' : undefined,
          }}
          mapStyle={MAPTILER_STYLE}
          onClick={onPlanningMapClick ? handleMapClick : undefined}
        >
          {/* A015/A016: pickup âmbar; passageiro só se ainda sem pickup */}
          {pickupSelection ? (
            <PassengerMarker
              longitude={pickupSelection.lng}
              latitude={pickupSelection.lat}
              colorClassName="bg-amber-500 ring-amber-400/60 shadow-lg"
            />
          ) : (
            passengerLocation && (
              <PassengerMarker longitude={passengerLocation.lng} latitude={passengerLocation.lat} />
            )
          )}
          {dropoffSelection ? (
            <PassengerMarker
              longitude={dropoffSelection.lng}
              latitude={dropoffSelection.lat}
              colorClassName="bg-emerald-600 ring-emerald-400/60 shadow-lg"
            />
          ) : null}

          {/* Driver marker */}
          {driverLocation && (
            <DriverMarker longitude={driverLocation.lng} latitude={driverLocation.lat} />
          )}

          {/* OSRM route */}
          {routeGeometry && (
            <RouteLine id="route-source" geometry={routeGeometry} />
          )}
        </Map>
      </div>

      {overlay && <div className="pointer-events-none absolute inset-0">{overlay}</div>}
    </div>
  )
}

