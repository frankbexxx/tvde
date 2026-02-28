# Manual WS Smoke Test (Admin Live)

This is a minimal, repeatable local ritual to validate:
1) audit_events rows are created
2) WS admin receives TripStatusChangedEvent in order

It avoids new infrastructure and keeps the domain unchanged.

## Preconditions
- Postgres running and reachable via DATABASE_URL.
- API server running (do not start it here if already running):
  - Example: `uvicorn app.main:app --reload` from `backend/`.
- JWT_SECRET_KEY set (same value for API and token generation).

## Step 1 - Create users/driver in DB
Use psql or a DB GUI. Example SQL (adjust IDs if needed):

```sql
-- Passenger
insert into users (id, role, name, phone, status)
values ('11111111-1111-1111-1111-111111111111', 'passenger', 'passenger', '+351900000001', 'active');

-- Driver user + profile
insert into users (id, role, name, phone, status)
values ('22222222-2222-2222-2222-222222222222', 'driver', 'driver', '+351900000002', 'active');

insert into drivers (user_id, status, documents, commission_percent)
values ('22222222-2222-2222-2222-222222222222', 'approved', null, 15.00);

-- Admin
insert into users (id, role, name, phone, status)
values ('33333333-3333-3333-3333-333333333333', 'admin', 'admin', '+351900000003', 'active');
```

## Step 2 - Generate JWTs (local)
Use the same JWT_SECRET_KEY the API is running with.

```bash
python - <<'PY'
import os, jwt, datetime

secret = os.getenv("JWT_SECRET_KEY", "change-me")
now = datetime.datetime.now(datetime.timezone.utc)
exp = now + datetime.timedelta(hours=1)

def token(user_id, role):
    payload = {"sub": user_id, "role": role, "iat": now, "exp": exp}
    return jwt.encode(payload, secret, algorithm="HS256")

print("PASSENGER:", token("11111111-1111-1111-1111-111111111111", "passenger"))
print("DRIVER:", token("22222222-2222-2222-2222-222222222222", "driver"))
print("ADMIN:", token("33333333-3333-3333-3333-333333333333", "admin"))
PY
```

## Step 3 - Open WS admin (read-only)
Use any WS client. Examples:

- wscat (Node):
  `wscat -c ws://localhost:8000/ws/admin/trips -H "Authorization: Bearer <ADMIN_TOKEN>"`

- websocat:
  `websocat -H="Authorization: Bearer <ADMIN_TOKEN>" ws://localhost:8000/ws/admin/trips`

Keep it open to observe events.

## Step 4 - Create trip (HTTP)
```bash
curl -X POST http://localhost:8000/trips \
  -H "Authorization: Bearer <PASSENGER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"origin_lat":38.7223,"origin_lng":-9.1393,"destination_lat":38.7369,"destination_lng":-9.1427}'
```

## Step 5 - Assign (admin)
```bash
curl -X POST http://localhost:8000/admin/trips/<TRIP_ID>/assign \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

## Step 6 - Accept (driver)
```bash
curl -X POST http://localhost:8000/driver/trips/<TRIP_ID>/accept \
  -H "Authorization: Bearer <DRIVER_TOKEN>"
```

## Step 7 - Cancel (driver or passenger)
```bash
curl -X POST http://localhost:8000/driver/trips/<TRIP_ID>/cancel \
  -H "Authorization: Bearer <DRIVER_TOKEN>"
```

## Expected Observations
- WS admin receives events in order: requested -> assigned -> accepted -> cancelled.
- `audit_events` has one row per transition.
- Timestamps are coherent and monotonic.

## Notes
- If WS is disconnected, audit still records all transitions.
- This test is intentionally simple and manual.

