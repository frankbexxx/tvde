#!/usr/bin/env python3
"""
TVDE Traffic Simulator — concurrent passenger and driver bots.

Usage:
    python simulator.py

Prerequisites:
    - Backend running (local or Render)
    - Seed executed (POST /dev/seed) — for local, ENV=dev
    - For Render: set TVDE_SIM_TOKEN_PASSENGER and TVDE_SIM_TOKEN_DRIVER if /dev/tokens is disabled

Config: edit config.py or set env vars TVDE_SIM_*
"""
import asyncio
import random
import sys

import httpx

from .config import (
    API_BASE_URL,
    NUMBER_PASSENGER_BOTS,
    NUMBER_DRIVER_BOTS,
    RANDOM_SEED,
    TOKEN_PASSENGER,
    TOKEN_DRIVER,
    REQUEST_TIMEOUT_SEC,
)
from .passenger_bot import PassengerBot
from .driver_bot import DriverBot


def _fetch_simulator_tokens() -> tuple[list[str], list[str]]:
    """Fetch passenger and driver token lists from /dev/seed-simulator."""
    url = f"{API_BASE_URL}/dev/seed-simulator"
    params = {"passengers": NUMBER_PASSENGER_BOTS, "drivers": NUMBER_DRIVER_BOTS}
    r = httpx.post(url, params=params, timeout=REQUEST_TIMEOUT_SEC)
    r.raise_for_status()
    data = r.json()
    return data["passenger_tokens"], data["driver_tokens"]


def main() -> None:
    if RANDOM_SEED is not None:
        random.seed(int(RANDOM_SEED))

    passenger_tokens: list[str] = []
    driver_tokens: list[str] = []

    if TOKEN_PASSENGER and TOKEN_DRIVER:
        passenger_tokens = [TOKEN_PASSENGER] * NUMBER_PASSENGER_BOTS
        driver_tokens = [TOKEN_DRIVER] * NUMBER_DRIVER_BOTS
        print("Using tokens from environment (single user per role)")
    else:
        print("Fetching tokens from /dev/seed-simulator...")
        try:
            passenger_tokens, driver_tokens = _fetch_simulator_tokens()
        except Exception as e:
            print(f"Failed to fetch tokens: {e}")
            print("Backend must be running with ENV=dev. For Render, set TVDE_SIM_TOKEN_PASSENGER and TVDE_SIM_TOKEN_DRIVER.")
            sys.exit(1)

    print(f"Starting {NUMBER_PASSENGER_BOTS} passenger bots, {NUMBER_DRIVER_BOTS} driver bots")
    print(f"API: {API_BASE_URL}")
    print("Press Ctrl+C to stop.\n")

    async def run_all() -> None:
        tasks = []
        for i in range(NUMBER_PASSENGER_BOTS):
            token = passenger_tokens[i] if i < len(passenger_tokens) else passenger_tokens[-1]
            bot = PassengerBot(i + 1, token)
            tasks.append(asyncio.create_task(bot.run()))
        for i in range(NUMBER_DRIVER_BOTS):
            token = driver_tokens[i] if i < len(driver_tokens) else driver_tokens[-1]
            bot = DriverBot(i + 1, token)
            tasks.append(asyncio.create_task(bot.run()))
        await asyncio.gather(*tasks)

    try:
        asyncio.run(run_all())
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
