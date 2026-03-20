# Full System Diagnostic: Geolocation + Map + Driver Tracking + Dispatch

**Scope:** GEOLOCATION, MAP, DRIVER TRACKING, DISPATCH  
**Purpose:** Explain what exists, what does not, what is partial, what is incorrect, and why it behaves the way it does.  
**No code changes. Analysis only.**

---

## 1. GEOLOCATION PIPELINE (STEP BY STEP)

### Step 1: How driver location is obtained (frontend)

- **Source:** Browser Geolocation API via `navigator.geolocation.watchPosition()` in `useGeolocation` hook.
- **Used by:** `DriverDashboard` (driver) and `PassengerDashboard` (passenger, for pickup marker).
- **Options:** `enableHighAccuracy: true`, `maximumAge: 0`, `timeout: 8000`.
- **Fallbacks:**
  - **Demo Oeiras:** If `localStorage.tvde_demo_location=1` or `?demo=1`, returns Oeiras (38.6973, -9.30836) immediately. No API call.
  - **Session fallback:** If `sessionStorage.tvde_geolocation_failed=1` (from previous error), returns Oeiras without calling `watchPosition`.
  - **Timeout/error:** After 3s without fix, or on `onError`, uses Oeiras and sets `sessionStorage.tvde_geolocation_failed=1`.
- **Jitter filter:** Ignores movements &lt; 5 m to reduce re-renders.

### Step 2: How often driver location is sent

- **Interval:** Every **3 seconds** (`setInterval(..., 3000)` in `DriverDashboard`).
- **Conditions:** Driver must be **online** (toggle "Disponível") and have `driverLocation` from `useGeolocation`.
- **First send:** The first `POST /drivers/location` happens **3 seconds after** the effect runs (first `setInterval` tick). There is **no immediate send on mount**.
- **When stopped:** When driver goes offline or `driverLocation` becomes null, the interval is cleared.

### Step 3: What endpoint receives it

- **Endpoint:** `POST /drivers/location`
- **Auth:** Requires `Role.driver` (JWT with driver role). Token from `tokenGetter` (AuthContext).
- **Payload:** `{ lat, lng, timestamp }` (timestamp = `Date.now()`).
- **Validation:** Lat -90..90, lng -180..180, timestamp within ±1 hour of server time.
- **BETA:** If no `Driver` row exists, one is auto-created (approved).

### Step 4: How it is stored in DB

- **Table:** `driver_locations` (one row per `driver_id`, primary key).
- **Columns:** `driver_id`, `lat`, `lng`, `timestamp`.
- **Operation:** Upsert — insert if no row, update if exists.
- **Side effects:** On each upsert:
  - If driver has active trip (accepted/arriving/ongoing): `hub.publish_driver_location(trip_id, lat, lng, timestamp)` → WebSocket broadcast.
  - In BETA: if no offers exist for any `requested` trip, auto-assign oldest requested trip to this driver.

### Step 5: How dispatch uses it

- **When:** On `POST /trips` (create_trip) → `create_offers_for_trip(db, trip)`.
- **Query:** `Driver` JOIN `DriverLocation` WHERE `Driver.status=approved` AND `Driver.is_available=True`.
- **Distance:** Haversine between `(trip.origin_lat, trip.origin_lng)` and `(loc.lat, loc.lng)`.
- **Filter:** Only drivers with `distance_km <= GEO_RADIUS_KM` (default 50).
- **Selection:** Top N by distance (OFFER_TOP_N=5).
- **Critical:** Dispatch runs **at trip creation time**. It uses whatever is in `driver_locations` at that moment. No re-query later.

### Step 6: How passenger retrieves driver location

- **Endpoint:** `GET /trips/{trip_id}/driver-location`
- **Auth:** Passenger or driver token. Backend validates trip ownership.
- **Backend logic:** `get_driver_location_for_trip`:
  - Trip must exist.
  - `trip.driver_id` must be non-null (driver assigned).
  - `trip.status` must be in `accepted`, `arriving`, `ongoing`.
  - Row in `driver_locations` for `trip.driver_id` must exist.
- **Frontend:** `PassengerDashboard` polls every **2 seconds** when `activeTripId` exists.
- **On 404:** `driver_not_assigned` or `driver_location_not_found` → catch block logs warning, `setDriverLocation` not called → driver marker not shown.

### Step 7: How map renders it

- **Component:** `MapView` receives `driverLocation?: LatLng | null`.
- **Passenger marker:** Green circle (PassengerMarker) at `passengerLocation` (from `useGeolocation` or `activeTrip.origin` or DEMO_ORIGIN).
- **Driver marker:** Blue circle (DriverMarker) at `driverLocation` — **only rendered when `driverLocation` is truthy**.
- **Route:** Purple line from OSRM (`router.project-osrm.org`) between `route.from` and `route.to`. Fetched when route prop changes. On failure, `routeGeometry` stays null → no line.
- **Initial center:** Oeiras (38.6973, -9.30836). Recenters on first `passengerLocation` availability.

---

## 2. CURRENT IMPLEMENTATION STATUS

| Component | Status | Notes |
|-----------|--------|------|
| **Driver geolocation capture** | FULLY IMPLEMENTED | `useGeolocation` + Demo Oeiras + fallbacks. Real GPS when available. |
| **Location sending (frontend → backend)** | PARTIALLY IMPLEMENTED | Sends every 3s when online. **No immediate send on mount** — first send 3s after driver opens app. |
| **driver_locations persistence** | FULLY IMPLEMENTED | Upsert, validated. |
| **Distance calculation (Haversine / OSRM)** | PARTIALLY IMPLEMENTED | Haversine used for dispatch. OSRM used for route line and pricing (when OSRM_BASE_URL set). Public OSRM demo for route line. |
| **Dispatch usage of location** | FULLY IMPLEMENTED | JOIN DriverLocation, Haversine filter, top N. |
| **Passenger retrieval of driver location** | FULLY IMPLEMENTED | GET endpoint, polling every 2s. |
| **Map rendering (driver marker)** | FULLY IMPLEMENTED | Renders when `driverLocation` provided. |
| **Route rendering** | PARTIALLY IMPLEMENTED | OSRM fetch; on failure, no line. No fallback (e.g. straight line). |
| **Real-time updates** | PARTIALLY IMPLEMENTED | Backend broadcasts `driver.location` via WebSocket when driver sends location. **Frontend does not subscribe** — passenger uses polling only. |

---

## 3. DATA FLOW VALIDATION

| Question | Answer |
|----------|--------|
| **Is driver location guaranteed to exist before dispatch?** | **No.** Dispatch runs at trip creation. If the driver has never sent `POST /drivers/location` (e.g. just opened app, first send is 3s away), they have no row. If the driver opened the app &lt; 3s before passenger creates trip, they may not have sent yet. |
| **Is driver location updated continuously?** | **Yes** — every 3s when driver is online and has geolocation. |
| **Can driver_locations be stale?** | **Yes.** Last update is only as recent as the last successful POST. If the driver is offline, or the app is backgrounded, the last known location is used. No TTL or expiry. |
| **Can dispatch run with outdated location?** | **Yes.** Dispatch uses whatever is in the DB at trip creation. If the driver moved 10 km since last update, dispatch still uses the old coordinates. |
| **Can passenger request location before driver is assigned?** | **Yes.** Passenger starts polling as soon as `activeTripId` exists. Backend returns 404 `driver_not_assigned` until driver accepts. Frontend catches, logs, does not update state. No driver marker until success. |

---

## 4. KNOWN FAILURE MODES

| Failure mode | Cause | Symptom | How to detect |
|--------------|-------|---------|---------------|
| **Driver has no location row** | Driver never sent `POST /drivers/location`, or sent before Driver row existed. | Dispatch creates 0 offers. Passenger gets 404 `driver_location_not_found` after driver accepts. | `GET /debug/driver-locations` (dev). `GET /debug/driver-eligibility` (driver token). |
| **Location not updated** | Driver offline, app closed, or send failing (network, 401). | Stale coordinates in dispatch and on passenger map. | Compare `driver_locations.timestamp` with now. |
| **Frontend not sending GPS** | Geolocation permission denied, timeout, or Demo Oeiras with wrong coordinates. | Driver uses Oeiras; if real location is far, dispatch may exclude them. | Console: "Geolocation error", "Geolocation fallback". |
| **Fallback Oeiras masking real issues** | Demo Oeiras or session fallback always returns Oeiras. | All drivers appear at Oeiras; dispatch works if trip origin is in Oeiras. | Check `isDemoLocationEnabled()`, `sessionStorage.tvde_geolocation_failed`. |
| **Dispatch using stale coordinates** | Driver moved; last POST was minutes ago. | Driver may be outside radius or not in top N. | Compare `driver_locations.timestamp` with trip creation time. |
| **Passenger polling too early** | Polling starts as soon as trip exists. | 404 until driver assigned. Normal; no driver marker until driver accepts. | Expected. |
| **WebSocket not used for location** | Passenger frontend only polls. | 2s delay between driver movement and map update. No push. | No WebSocket connection from passenger to `/ws/trips/{trip_id}`. |
| **Map rendering null coordinates** | `driverLocation` passed as null when GET fails or driver not assigned. | No driver marker. | MapView receives `driverLocation={undefined}`. |
| **First send 3s delay** | `setInterval` first tick is 3s after mount. | Driver can accept a trip before first location is stored. | If driver accepts before first POST, `driver_location_not_found` on passenger. |
| **OSRM route failure** | Public OSRM demo rate limit, CORS, or network error. | No purple route line on map. | Console: "OSRM route request failed". |
| **Token mismatch** | Driver on wrong tab or tokenGetter returns wrong role. | `POST /drivers/location` 403 if token is wrong. | 403 in Network tab. |

---

## 5. FRONTEND VS BACKEND MISALIGNMENT

| Area | Frontend expects | Backend provides | Mismatch |
|------|------------------|-------------------|----------|
| **Driver-location endpoint** | 200 with `{lat, lng, timestamp}` when driver assigned and trip active. | Same. 404 when driver not assigned or no location. | None. |
| **Trip states vs map rendering** | Driver marker when `driverLocation` from GET. | GET returns 404 for `requested`, `assigned` (before driver assigned). | `assigned` can mean admin-assigned; driver_id may be set. Backend allows GET only for `accepted|arriving|ongoing`. |
| **Timing** | Passenger polls every 2s. | No push. | 2s latency. WebSocket exists for push but frontend does not use it. |
| **Route** | Purple line from OSRM. | N/A (frontend fetches OSRM directly). | OSRM public demo can fail; no backend fallback. |

---

## 6. DEBUG STRATEGY

### Step 1: Verify driver has location

```
GET /debug/driver-locations
```
(Requires ENV=dev or ENABLE_DEV_TOOLS or BETA_MODE.)

- Empty → no driver has ever sent location.
- Rows present → check `timestamp`; if old, driver may have stopped sending.

### Step 2: Driver self-check

As driver, expand Dev → **Diagnóstico motorista**.

- `NO_LOCATION` → driver has no row; never sent or send failed.
- `OFFLINE` → `is_available=false`.
- `NO_OFFERS` → dispatch did not include this driver (radius, or no location at trip creation).

### Step 3: Passenger trip check

As passenger with active trip, expand Dev → **Diagnóstico viagem**.

- `ZERO_OFFERS: 0 drivers with location` → no drivers in DB with location.
- `ZERO_OFFERS: N drivers but 0 within Xkm` → drivers too far.
- `OK: N pending offers` → offers exist; driver should see them.

### Step 4: DB inspection

```sql
SELECT driver_id, lat, lng, timestamp FROM driver_locations;
```

- Compare `timestamp` with current time.
- Check if driver_id matches the driver who accepted.

### Step 5: Network tab

- `POST /drivers/location` every 3s when driver online? If not, check token, offline state, or `driverLocation` null.
- `GET /trips/{id}/driver-location` every 2s from passenger? Check for 404 vs 200.

### Step 6: Logs

- Backend: `create_offers_for_trip: drivers_with_loc_count`, `candidates_in_radius`.
- Backend: `get_driver_location_for_trip: driver not assigned` or `driver_location_not_found`.

---

## 7. ROOT CAUSE HYPOTHESIS

**Why geolocation feels "bugged":**

1. **Order dependency is strict.** Dispatch needs drivers with location **before** the trip is created. If the driver opens the app and the passenger creates a trip within 3 seconds, the driver has no location yet (first send is at t=3s). Result: 0 offers.

2. **Demo Oeiras hides real GPS problems.** With Demo Oeiras, the driver always has Oeiras. Real GPS failures (permission, timeout) are bypassed. In production, without demo, the same failures would surface.

3. **No immediate location send.** The driver sends 3s after mount. A driver who opens the app and immediately sees a trip can accept before their first location is stored. Passenger then gets `driver_location_not_found` until the next successful POST.

4. **WebSocket for location exists but is unused.** The backend broadcasts `driver.location` on each upsert. The passenger never subscribes to `/ws/trips/{trip_id}`. All updates come from 2s polling, so there is always up to 2s delay and extra load.

5. **Single source of truth is timing.** The system assumes: driver online first → sends location → passenger creates trip. Any other order breaks the flow. There is no retry or "wait for location" in dispatch.

---

## 8. MISSING PIECES (CRITICAL)

To make geolocation reliable, real-time, and production-ready:

1. **Immediate first send** — Driver should send location as soon as it is available, not wait 3s.
2. **Passenger WebSocket subscription** — Subscribe to `/ws/trips/{trip_id}` and use `driver.location` events instead of (or in addition to) polling.
3. **Dispatch retry or deferred matching** — If 0 offers at creation, consider a short retry or a "wait for drivers" step before giving up.
4. **Staleness handling** — Define max age for `driver_locations` (e.g. 5 min) and treat older rows as invalid for dispatch.
5. **Route fallback** — If OSRM fails, draw a straight line or clearly indicate route unavailable.
6. **Pre-dispatch check** — Before creating a trip, optionally check that at least one driver has recent location (e.g. for UX feedback).
7. **Diagnostics in production** — `/debug/*` endpoints depend on BETA_MODE/ENABLE_DEV_TOOLS; production needs a controlled way to run diagnostics without exposing them broadly.
