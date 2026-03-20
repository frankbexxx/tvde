# TASK
Add geographic filtering to driver trip discovery.

Goal:
Drivers should only see trips close to them.

Current behavior:

Drivers see ALL assigned trips.

New behavior:

Drivers see trips within radius (5km).

---

# TARGET ENDPOINT

GET /driver/trips/available

File likely:

backend/routers/driver_trips.py

---

# REQUIRED DATA

Driver location from:

driver_locations table

Trip pickup coordinates from:

trips.pickup_lat
trips.pickup_lng

---

# DISTANCE METHOD

Use Haversine formula.

---

# PSEUDOCODE

function haversine(lat1, lon1, lat2, lon2):

    R = 6371 km

    dLat = radians(lat2-lat1)
    dLon = radians(lon2-lon1)

    a =
        sin²(dLat/2)
        + cos(lat1) * cos(lat2) * sin²(dLon/2)

    c = 2 * atan2(√a, √(1−a))

    return R * c

---

# FILTER LOGIC

driver_location = fetch_driver_location(driver_id)

for trip in assigned_trips:

    distance = haversine(
        driver_location.lat,
        driver_location.lng,
        trip.pickup_lat,
        trip.pickup_lng
    )

    if distance <= 5:
        include trip

---

# SAFETY

If driver_location does not exist:

fallback to current behavior.

Driver sees all trips.

---

# PERFORMANCE

For MVP:

distance calculation in Python is acceptable.

Optimization can happen later.

---

# TEST PLAN

Driver near pickup:

trip visible

Driver far away:

trip hidden

Driver with no location:

trip visible