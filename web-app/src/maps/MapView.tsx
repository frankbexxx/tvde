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
import { isMockLocationModeEnabled } from '../dev/mockLocation'
import { useSmoothedLatLng } from '../hooks/useSmoothedLatLng'
import { log as devLog } from '../utils/logger'

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
  /** A017: GeoJSON pré-calculado (planeamento); separado da rota de viagem ativa */
  planningRouteGeometry?: FeatureCollection<LineString> | null
  /** A021: planeamento = mapa em destaque; subdued = suporte (overlay leve) */
  mapVisualWeight?: 'emphasized' | 'subdued'
  /** Recentrar suavemente (ex.: destino escolhido na pesquisa por texto). */
  planningRecenter?: LatLng | null
  /** Incrementar para repetir animação para o mesmo ponto. */
  planningRecenterKey?: number
  /** Recolha / destino da viagem ativa (marcadores distintos do planeamento). */
  tripPickup?: LatLng | null
  tripDropoff?: LatLng | null
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
  planningRouteGeometry = null,
  mapVisualWeight = 'emphasized',
  planningRecenter = null,
  planningRecenterKey = 0,
  tripPickup = null,
  tripDropoff = null,
}: MapViewProps) {
  const mapRef = useRef<MapRef | null>(null)
  const prevDriverRef = useRef<LatLng | null>(null)
  const mapAnchor = useMemo(
    () => tripPickup ?? passengerLocation ?? null,
    [tripPickup?.lat, tripPickup?.lng, passengerLocation?.lat, passengerLocation?.lng]
  )
  const [hasInitialFit, setHasInitialFit] = useState(false)
  const [routeGeometry, setRouteGeometry] = useState<FeatureCollection<LineString> | null>(null)
  const [lastRouteKey, setLastRouteKey] = useState<string | null>(null)
  const driverSmoothMs =
    import.meta.env.DEV && isMockLocationModeEnabled() ? 320 : 480
  const smoothedDriver = useSmoothedLatLng(driverLocation, driverSmoothMs)

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
        devLog('[MapView] route fetch failed (non-fatal)', err)
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

  // Passageiro + motorista: enquadrar os dois; só motorista: seguir só o motorista.
  // Em dev + mock: centrar no motorista (easeTo) — sem alterar produção nem o fluxo normal de fitBounds.
  useEffect(() => {
    if (!showMap || !driverLocation) {
      if (!driverLocation) prevDriverRef.current = null
      return
    }
    const map = mapRef.current?.getMap()
    if (!map) return
    if (prevDriverRef.current?.lat === driverLocation.lat && prevDriverRef.current?.lng === driverLocation.lng) {
      return
    }
    prevDriverRef.current = driverLocation

    const hasActiveTripMarkers = Boolean(tripPickup && tripDropoff)
    const mockMapFollow =
      import.meta.env.DEV &&
      isMockLocationModeEnabled() &&
      (!onPlanningMapClick || hasActiveTripMarkers)

    if (mockMapFollow) {
      map.easeTo({
        center: [driverLocation.lng, driverLocation.lat],
        duration: 800,
      })
      return
    }

    if (mapAnchor) {
      const bounds = new maplibregl.LngLatBounds()
      bounds.extend([mapAnchor.lng, mapAnchor.lat])
      bounds.extend([driverLocation.lng, driverLocation.lat])
      map.fitBounds(bounds, {
        padding: { top: 64, bottom: 64, left: 48, right: 48 },
        maxZoom: 16,
        duration: 650,
      })
      return
    }

    map.easeTo({
      center: [driverLocation.lng, driverLocation.lat],
      duration: 700,
      zoom: 15,
    })
  }, [showMap, driverLocation, mapAnchor, onPlanningMapClick, tripPickup, tripDropoff])

  useEffect(() => {
    if (!planningRecenter || !planningRecenterKey) return
    const map = mapRef.current?.getMap()
    if (!map) return
    map.easeTo({
      center: [planningRecenter.lng, planningRecenter.lat],
      duration: 650,
      zoom: Math.max(map.getZoom(), 13),
    })
  }, [planningRecenter, planningRecenterKey])

  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      if (!onPlanningMapClick) return
      const { lng, lat } = e.lngLat
      onPlanningMapClick({ lat, lng })
    },
    [onPlanningMapClick]
  )

  const isSubdued = mapVisualWeight === 'subdued'
  const frameClass = `relative w-full rounded-2xl overflow-hidden bg-card transition-all duration-300 ease-out motion-reduce:transition-none ${
    isSubdued ? 'shadow-sm opacity-95' : 'shadow-card'
  } ${className ?? ''}`

  if (!showMap) {
    return (
      <div className={`${frameClass} relative`}>
        <div
          className="h-[45vh] min-h-[220px] max-h-[420px] flex flex-col items-center justify-center gap-3 px-6 bg-muted/60 border border-dashed border-border animate-in fade-in duration-500"
          role="region"
          aria-label="Mapa"
        >
          <p className="text-center text-base font-medium text-foreground max-w-sm">{mapPlaceholder}</p>
          <p className="text-center text-sm text-foreground/80 max-w-xs">
            O mapa aparece quando o motorista tiver posição ativa.
          </p>
        </div>
        {isSubdued && (
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl bg-background/25 transition-opacity duration-300"
            aria-hidden
          />
        )}
      </div>
    )
  }

  const supportOverlay = isSubdued ? (
    <div
      className="pointer-events-none absolute inset-0 z-[1] rounded-2xl bg-background/20 dark:bg-black/25 transition-opacity duration-500 ease-out"
      aria-hidden
    />
  ) : null

  return (
    <div className={`${frameClass} animate-in fade-in duration-500 relative`}>
      <div className="relative h-[45vh] min-h-[220px] max-h-[420px]">
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
          {/* Viagem ativa: recolha + destino (P30) */}
          {tripPickup && tripDropoff ? (
            <>
              <PassengerMarker
                longitude={tripPickup.lng}
                latitude={tripPickup.lat}
                colorClassName="bg-amber-500 ring-amber-400/60 shadow-md"
              />
              <PassengerMarker
                longitude={tripDropoff.lng}
                latitude={tripDropoff.lat}
                colorClassName="bg-emerald-600 ring-emerald-400/60 shadow-md"
              />
            </>
          ) : null}

          {/* A015/A016: pickup âmbar; passageiro só se ainda sem pickup */}
          {!tripPickup || !tripDropoff
            ? pickupSelection ? (
                <PassengerMarker
                  longitude={pickupSelection.lng}
                  latitude={pickupSelection.lat}
                  colorClassName="bg-amber-500 ring-amber-400/60 shadow-md"
                />
              ) : (
                passengerLocation && (
                  <PassengerMarker longitude={passengerLocation.lng} latitude={passengerLocation.lat} />
                )
              )
            : null}
          {!tripPickup || !tripDropoff
            ? dropoffSelection ? (
                <PassengerMarker
                  longitude={dropoffSelection.lng}
                  latitude={dropoffSelection.lat}
                  colorClassName="bg-emerald-600 ring-emerald-400/60 shadow-md"
                />
              ) : null
            : null}

          {/* Driver marker (posição suavizada — o enquadramento usa GPS cru) */}
          {smoothedDriver && (
            <DriverMarker longitude={smoothedDriver.lng} latitude={smoothedDriver.lat} />
          )}

          {/* Rota viagem ativa (OSRM interno via prop `route`) */}
          {routeGeometry && (
            <RouteLine id="route-source" geometry={routeGeometry} />
          )}
          {/* A017: pré-visualização pickup→dropoff em planeamento */}
          {planningRouteGeometry && planningRouteGeometry.features?.length ? (
            <RouteLine
              id="planning-route-source"
              geometry={planningRouteGeometry}
              layerProps={{
                paint: {
                  'line-color': '#8b5cf6',
                  'line-width': 4,
                  'line-opacity': 0.8,
                },
              }}
            />
          ) : null}
        </Map>
        {supportOverlay}
      </div>

      {overlay && <div className="pointer-events-none absolute inset-0 z-[2]">{overlay}</div>}
    </div>
  )
}

