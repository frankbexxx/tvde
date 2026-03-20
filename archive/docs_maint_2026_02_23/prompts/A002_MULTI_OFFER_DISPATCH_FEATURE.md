# A002_MULTI_OFFER_DISPATCH_FEATURE

Goal

Replace single-driver dispatch with multi-offer marketplace.

Behavior

When a passenger requests a trip:

1. Find drivers within GEO_RADIUS_KM.
2. Sort by distance.
3. Select top N drivers.

N = 5 (configurable).

Create trip_offers table.

trip_offers

id
trip_id
driver_id
status

statuses

pending
accepted
rejected
expired

Offer lifecycle

trip requested
↓
system creates offers for 5 drivers
↓
drivers receive offer
↓
first accepted wins
↓
other offers expire

If all reject:

expand search radius
or retry with next drivers.

Driver endpoint

POST /driver/offers/{offer_id}/accept
POST /driver/offers/{offer_id}/reject

Race condition protection

Accept must use DB transaction.

Only first accept succeeds.

Other accepts must return:

409 offer_already_taken
