/**
 * Temporary debug page: MapView with fixed passenger and driver coordinates (Lisbon).
 * Use to verify marker and route rendering without the full pipeline.
 * Route: /debug/map
 */
import { MapView } from '../../maps/MapView'

const LISBON_PASSENGER = { lat: 38.7223, lng: -9.1393 }
const LISBON_DRIVER = { lat: 38.726, lng: -9.142 }
const LISBON_DEST = { lat: 38.7369, lng: -9.1386 }

export function DebugMapPage() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-foreground">Debug: Map</h1>
      <p className="text-sm text-muted-foreground">
        Fixed passenger (Lisbon center), driver (nearby), and route. If markers/line render here, rendering is OK.
      </p>
      <MapView
        passengerLocation={LISBON_PASSENGER}
        driverLocation={LISBON_DRIVER}
        route={{
          from: LISBON_PASSENGER,
          to: LISBON_DEST,
        }}
      />
    </div>
  )
}
