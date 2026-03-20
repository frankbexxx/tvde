# A002_MULTI_OFFER_DISPATCH_FIX

Goal

Fix dispatch race conditions and offer logic.

Steps

1 analyze failing tests
2 inspect dispatch module
3 verify DB transactions

Common issues

missing transaction lock
duplicate accept
offers not expiring

Rules

Ensure accept endpoint uses DB transaction.

Run pytest after fixes.
