/**
 * Temporary debug page: MapView with fixed passenger and driver coordinates (Lisbon).
 * Use to verify marker and route rendering without the full pipeline.
 * Route: /debug/map
 */
import { MapView } from '../../maps/MapView'

/** Oeiras (Câmara Municipal) e Lisboa */
const OEIRAS_PASSENGER = { lat: 38.6973, lng: -9.30836 }
const OEIRAS_DRIVER = { lat: 38.699, lng: -9.305 }
const LISBOA_DEST = { lat: 38.7223, lng: -9.1393 }

export function DebugMapPage() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-foreground">Debug: Map</h1>
      <p className="text-sm text-muted-foreground">
        Fixed passenger (Oeiras), driver (nearby), route to Lisboa. If markers/line render here, rendering is OK.
      </p>
      <MapView
        passengerLocation={OEIRAS_PASSENGER}
        driverLocation={OEIRAS_DRIVER}
        route={{
          from: OEIRAS_PASSENGER,
          to: LISBOA_DEST,
        }}
      />
    </div>
  )
}
