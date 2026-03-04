"""
Configuration for the TVDE traffic simulator.
Override via environment variables or edit defaults.
"""
import os

API_BASE_URL = os.environ.get("TVDE_SIM_API_BASE_URL", "http://localhost:8000")
NUMBER_PASSENGER_BOTS = int(os.environ.get("TVDE_SIM_PASSENGER_BOTS", "20"))
NUMBER_DRIVER_BOTS = int(os.environ.get("TVDE_SIM_DRIVER_BOTS", "8"))
MAX_ACTIVE_TRIPS = int(os.environ.get("TVDE_SIM_MAX_ACTIVE_TRIPS", "30"))
RANDOM_SEED = os.environ.get("TVDE_SIM_RANDOM_SEED")  # None = no seed, use random

# Optional: override tokens (for Render when /dev/tokens is disabled)
TOKEN_PASSENGER = os.environ.get("TVDE_SIM_TOKEN_PASSENGER")
TOKEN_DRIVER = os.environ.get("TVDE_SIM_TOKEN_DRIVER")

# HTTP
REQUEST_TIMEOUT_SEC = float(os.environ.get("TVDE_SIM_TIMEOUT", "30"))
