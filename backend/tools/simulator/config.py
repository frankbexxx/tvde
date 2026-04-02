"""
Configuration for the TVDE traffic simulator.
Override via environment variables or edit defaults.
"""

import os

API_BASE_URL = os.environ.get("TVDE_SIM_API_BASE_URL", "http://localhost:8000")
NUMBER_PASSENGER_BOTS = int(os.environ.get("TVDE_SIM_PASSENGER_BOTS", "20"))
NUMBER_DRIVER_BOTS = int(os.environ.get("TVDE_SIM_DRIVER_BOTS", "12"))
MAX_ACTIVE_TRIPS = int(os.environ.get("TVDE_SIM_MAX_ACTIVE_TRIPS", "30"))
RANDOM_SEED = os.environ.get("TVDE_SIM_RANDOM_SEED")  # None = no seed, use random

# Scenario mode: "normal" | "flash_crowd" | "heavy_load"
SCENARIO_MODE = os.environ.get("TVDE_SIM_SCENARIO", "normal")

# Flash crowd: N passengers create trips simultaneously
FLASH_CROWD_PASSENGERS = int(os.environ.get("TVDE_SIM_FLASH_CROWD_PASSENGERS", "20"))
FLASH_CROWD_DRIVER_DURATION_SEC = int(
    os.environ.get("TVDE_SIM_FLASH_CROWD_DRIVER_SEC", "600")
)  # 10 min

# Heavy load phases: (min_start, passengers, drivers)
# min 0-5: 20 passengers, 8 drivers
# min 5-10: 30 passengers, 12 drivers
# min 10-20: 50 passengers, 20 drivers
HEAVY_LOAD_PHASES = [
    (0, 20, 8),
    (5, 30, 12),
    (10, 50, 20),
]
HEAVY_LOAD_DURATION_MIN = 20  # total simulation duration in minutes

# Rate limit: max requests per second (0 = no limit)
MAX_REQUESTS_PER_SECOND = int(os.environ.get("TVDE_SIM_MAX_REQUESTS_PER_SECOND", "0"))

# Optional: override tokens (for Render when /dev/tokens is disabled)
TOKEN_PASSENGER = os.environ.get("TVDE_SIM_TOKEN_PASSENGER")
TOKEN_DRIVER = os.environ.get("TVDE_SIM_TOKEN_DRIVER")

# HTTP
REQUEST_TIMEOUT_SEC = float(os.environ.get("TVDE_SIM_TIMEOUT", "30"))
