# TASK
Improve trip ordering for drivers.

Goal:
Drivers should see closest trips first.

Current behavior:

trips appear in arbitrary order.

New behavior:

sort trips by distance to driver.

---

# TARGET ENDPOINT

GET /driver/trips/available

---

# IMPLEMENTATION

Reuse distance calculation from Geo Matching.

Compute distance for each candidate trip.

Sort results.

---

# PSEUDOCODE

candidate_trips = []

for trip in assigned_trips:

    distance = haversine(...)

    if distance <= radius:

        candidate_trips.append(
            (trip, distance)
        )

sort candidate_trips by distance

return ordered trips

---

# RESPONSE FORMAT

Do NOT change API response schema.

Only change ordering.

---

# LOGGING

Add debug logs:

driver_id
trip_id
distance

Example:

driver 4 sees trip 18 at distance 1.2 km

---

# TEST PLAN

Create multiple trips in different locations.

Driver should see:

closest trip first