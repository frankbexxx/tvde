# A004_PRICING_ENGINE_FEATURE

Goal

Implement dynamic trip pricing.

Formula

price = base_fare + (distance_km × price_per_km) + (time_min × price_per_min)

Configuration

BASE_FARE
PRICE_PER_KM
PRICE_PER_MIN

Distance from OSRM route.

Price stored in:

trip.price_estimate
