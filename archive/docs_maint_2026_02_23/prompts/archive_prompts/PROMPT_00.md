# TASK
Introduce structured logging and request tracing across the backend.

Goal:
Make debugging and system observation easier without changing business logic.

This task MUST NOT modify API behavior or database schema.

Only logging improvements are allowed.

---

# OBJECTIVES

1. Standardize backend logging
2. Add request tracing
3. Add consistent log structure
4. Ensure all critical events are logged

This will support debugging for:

- trip lifecycle
- driver dispatch
- location updates
- payment flow

---

# CURRENT PROBLEM

Logs are inconsistent and sometimes hard to correlate.

Example issues:

- no request correlation
- inconsistent log format
- missing identifiers (trip_id, driver_id)

---

# IMPLEMENTATION PLAN

Introduce:

1️⃣ Request ID middleware  
2️⃣ Structured logging format  
3️⃣ Consistent log fields for core entities

---

# STEP 1 — Request ID Middleware

Create middleware that assigns a unique request ID to every request.

Suggested file:

backend/middleware/request_id.py

---

# PSEUDOCODE

import uuid

async def request_id_middleware(request, call_next):

    request_id = uuid.uuid4()

    request.state.request_id = str(request_id)

    response = await call_next(request)

    response.headers["X-Request-ID"] = str(request_id)

    return response

---

# INTEGRATION

Register middleware in FastAPI app.

Example:

app.middleware("http")(request_id_middleware)

---

# STEP 2 — Logging Helper

Create logging helper to standardize logs.

Suggested file:

backend/utils/logging.py

---

# PSEUDOCODE

import logging

logger = logging.getLogger("tvde")

def log_event(event_name, **fields):

    logger.info({
        "event": event_name,
        **fields
    })

---

# STEP 3 — Core Logging Events

Add logs in critical flows.

DO NOT remove existing logs.

Only add additional logs where useful.

---

# DRIVER LOCATION

File:

driver_location.py

Add:

log_event(
    "driver_location_update",
    driver_id=driver_id,
    lat=lat,
    lng=lng
)

---

# TRIP CREATION

File:

trips.py

Add:

log_event(
    "trip_created",
    trip_id=trip.id,
    passenger_id=trip.passenger_id
)

---

# TRIP ACCEPT

log_event(
    "trip_accepted",
    trip_id=trip.id,
    driver_id=driver_id
)

---

# TRIP STATE CHANGE

log_event(
    "trip_state_change",
    trip_id=trip.id,
    from_state=old_state,
    to_state=new_state
)

---

# DISPATCH EVENTS

When auto-dispatch occurs:

log_event(
    "trip_auto_dispatched",
    trip_id=trip.id,
    driver_id=driver_id
)

---

# LOCATION READ

When passenger reads driver location:

log_event(
    "driver_location_requested",
    trip_id=trip_id,
    user_id=user_id
)

---

# LOG FORMAT

Prefer structured JSON logs.

Example output:

{
  "event": "trip_accepted",
  "trip_id": 482,
  "driver_id": 14
}

---

# SAFETY RULES

Do NOT:

- change endpoint behavior
- change return values
- change DB schema
- refactor existing services

Only add middleware and logging helpers.

---

# TEST PLAN

Run backend locally.

Perform:

1. create trip
2. driver sends location
3. driver accepts trip
4. passenger polls driver location

Verify logs include:

trip_created  
driver_location_update  
trip_accepted  
trip_state_change

Also confirm:

response header includes:

X-Request-ID