# A006_GEO_STABILITY_LAYER_FEATURE

# GOAL

Stabilize geolocation + dispatch pipeline.

Remove timing dependency between:

driver coming online
driver sending location
passenger creating trip

System must behave correctly regardless of action order.

---

# CONTEXT

Current behavior:

- driver sends location every 3s
- first send is delayed (no immediate send)
- dispatch runs instantly on trip creation
- dispatch depends on existing driver_locations rows

Problem:

If driver has not sent location yet → dispatch sees zero drivers

---

# OBJECTIVES

1. Ensure driver location exists immediately
2. Ensure dispatch does not fail due to timing
3. Ensure location freshness
4. Prepare system for real-time behavior

---

# STEP 1 — IMMEDIATE LOCATION SEND

Modify driver frontend logic:

When driverLocation becomes available:

- send POST /drivers/location immediately
- THEN start interval (3s)

Pseudo:

onLocationReady:
    sendLocation()
    startInterval(3s)

Requirement:

No driver should exist online without at least one location in DB.

---

# STEP 2 — LOCATION STALENESS CONTROL

Add freshness validation to dispatch.

Define:

LOCATION_MAX_AGE_SECONDS = 15

In offer_dispatch:

Only consider drivers where:

now - driver_locations.timestamp <= LOCATION_MAX_AGE_SECONDS

If timestamp too old:

exclude driver from candidates

---

# STEP 3 — DISPATCH RETRY WINDOW

If create_offers_for_trip results in:

0 offers

Then:

Retry dispatch for a short window.

Implementation:

- wait 2 seconds
- re-query drivers
- retry up to 3 times

Stop early if offers created.

---

# STEP 4 — DRIVER READINESS CHECK

Before dispatch:

Check:

- driver has location
- driver is_available = true

Optional:

If no drivers ready:

log:

"NO_READY_DRIVERS_AT_DISPATCH"

---

# STEP 5 — OPTIONAL PRE-DISPATCH VALIDATION

Before creating trip:

Check:

Are there drivers with recent location?

If none:

Allow trip creation, but mark internally:

trip.waiting_for_drivers = true

---

# STEP 6 — LOGGING

Add structured logs:

driver_location_first_send
dispatch_retry_attempt
dispatch_retry_success
dispatch_retry_failed
stale_location_filtered

---

# RULES

Do not break existing dispatch logic.

Do not modify database schema unless strictly necessary.

Keep changes minimal and localized.

---

# AFTER IMPLEMENTATION

1. Run pytest
2. Validate no regressions
3. Add new tests:

tests/test_geo_stability.py

Cases:

driver sends immediate location
dispatch succeeds after retry
stale drivers excluded

---

# OUTPUT

- implementation
- updated dispatch logic
- updated frontend behavior
- new tests
- confirmation all tests pass