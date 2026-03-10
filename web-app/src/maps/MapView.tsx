import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import Map from 'react-map-gl/maplibre'
import type { MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { PassengerMarker } from './PassengerMarker'
import { DriverMarker } from './DriverMarker'
import { RouteLine } from './RouteLine'

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
}

const LISBON_CENTER: LatLng = { lat: 38.7223, lng: -9.1393 }

export function MapView({ passengerLocation, driverLocation, route, className, overlay }: MapViewProps) {
  const mapRef = useRef<MapRef | null>(null)
  const [hasInitialFit, setHasInitialFit] = useState(false)

  const initialViewState = useMemo(
    () => ({
      latitude: LISBON_CENTER.lat,
      longitude: LISBON_CENTER.lng,
      zoom: 13,
    }),
    []
  )

  // Compute simple straight-line route GeoJSON when route is provided
  const routeGeoJSON = useMemo(() => {
    if (!route) return null
    return {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: [
              [route.from.lng, route.from.lat],
              [route.to.lng, route.to.lat],
            ],
          },
          properties: {},
        },
      ],
    }
  }, [route])

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

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden shadow-card bg-card ${className ?? ''}`}>
      <div className="h-[45vh] min-h-[220px] max-h-[420px]">
        <Map
          ref={mapRef}
          mapLib={maplibregl}
          initialViewState={initialViewState}
          reuseMaps
          style={{ width: '100%', height: '100%' }}
          mapStyle="https://demotiles.maplibre.org/style.json"
        >
          {/* Passenger marker */}
          {passengerLocation && (
            <PassengerMarker longitude={passengerLocation.lng} latitude={passengerLocation.lat} />
          )}

          {/* Driver marker */}
          {driverLocation && (
            <DriverMarker longitude={driverLocation.lng} latitude={driverLocation.lat} />
          )}

          {/* Straight-line route */}
          {routeGeoJSON && (
            <RouteLine
              from={route!.from}
              to={route!.to}
            />
          )}
        </Map>
      </div>

      {overlay && <div className="pointer-events-none absolute inset-0">{overlay}</div>}
    </div>
  )
}

