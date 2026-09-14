# PORTAGENS F4 — staging tolls ops

**STAGING ONLY.** Never point these scripts at PROD (`tvde-api` / prod DB).

| Script | Role |
|--------|------|
| `prepare_f4_staging_accounts.py` | Audit / password reset (no create) · refuses unless `DATABASE_URL` contains `tvde_staging_db` |
| `seed_f4_staging_min_accounts.py` | Minimal non-wipe seed · same DB gate |
| `run_f4_staging_toll_smokes.py` | HERE smokes A/B/C against `https://tvde-staging-api.onrender.com` · refuses non-staging API/DB |

Secrets: only from service env (`TEST_ACCOUNT_PASSWORD`, etc.). Scripts never print passwords, JWTs, HERE keys, or DB URLs.

## Complete body

`POST /driver/trips/{id}/complete` requires a JSON body (`TripCompletionRequest`).

Smoke sends:

```json
{"final_price": 0}
```

Backend **ignores** `final_price` (`_ = payload` in `driver_trips.complete_trip`; schema: “Currently unused”). Settlement uses the fare breakdown total. F4 evidence: BRISA `final_price=18.02`, not `0`.
