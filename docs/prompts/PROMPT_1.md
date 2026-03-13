# TASK
Implement Trip State Guardrails to enforce valid trip lifecycle transitions.

Goal:
Prevent invalid state transitions that may corrupt trip lifecycle.

This change MUST NOT alter existing endpoints or API responses.

---

# CURRENT STATES

Trip states currently used:

requested
assigned
accepted
arriving
ongoing
completed
cancelled

---

# VALID STATE TRANSITIONS

The system must only allow the following transitions:

requested → assigned
assigned → accepted
accepted → arriving
arriving → ongoing
ongoing → completed

Cancel rules:

requested → cancelled
assigned → cancelled

No other transitions should be allowed.

---

# IMPLEMENTATION PLAN

Create a validation function that enforces allowed transitions.

Location suggestion:

backend/services/trips.py
or
backend/utils/state_machine.py

Function:

validate_trip_transition(old_state, new_state)

---

# PSEUDOCODE

allowed_transitions = {
    "requested": ["assigned", "cancelled"],
    "assigned": ["accepted", "cancelled"],
    "accepted": ["arriving"],
    "arriving": ["ongoing"],
    "ongoing": ["completed"],
}

function validate_trip_transition(old_state, new_state):

    if old_state == new_state:
        return True

    allowed = allowed_transitions.get(old_state, [])

    if new_state not in allowed:
        raise HTTPException(
            status_code=409,
            detail="invalid_trip_state_transition"
        )

---

# INTEGRATION

This validation must be called BEFORE any trip state change.

Example locations:

accept_trip
driver_arriving
start_trip
complete_trip
cancel_trip

---

# LOGGING

Add structured logs when transition fails.

Example:

logger.warning(
    "invalid_trip_transition",
    extra={
        "trip_id": trip.id,
        "from": old_state,
        "to": new_state
    }
)

---

# DO NOT

Do NOT modify database schema.

Do NOT change API responses.

Do NOT remove existing logic.

Only add validation layer.

---

# TEST PLAN

Manual tests:

1 Create trip
2 Accept trip
3 Try skipping states:

accepted → completed

Expected:

HTTP 409

Valid flow must still work:

requested → assigned → accepted → arriving → ongoing → completed