#!/usr/bin/env python3
# ruff: noqa: E402  # Imports after setup intentional - config/path resolution
"""
TVDE Traffic Simulator — concurrent passenger and driver bots.

Usage:
    python simulator.py
    python simulator.py --scenario normal
    python simulator.py --scenario flash_crowd
    python simulator.py --scenario heavy_load

Prerequisites:
    - Backend running (local or Render)
    - For Render: set TVDE_SIM_TOKEN_PASSENGER and TVDE_SIM_TOKEN_DRIVER if /dev/tokens is disabled

Config: edit config.py or set env vars TVDE_SIM_*
"""

import argparse
import asyncio
import os
import random
import signal
import sys
import threading
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

import httpx

_shutdown_lock = threading.RLock()
_result_saved: Path | None = None

from .config import (
    API_BASE_URL,
    NUMBER_PASSENGER_BOTS,
    NUMBER_DRIVER_BOTS,
    RANDOM_SEED,
    TOKEN_PASSENGER,
    TOKEN_DRIVER,
    REQUEST_TIMEOUT_SEC,
    FLASH_CROWD_PASSENGERS,
    FLASH_CROWD_DRIVER_DURATION_SEC,
    HEAVY_LOAD_PHASES,
    HEAVY_LOAD_DURATION_MIN,
)
from .passenger_bot import PassengerBot
from .driver_bot import DriverBot
from .metrics import SimulatorMetrics


@dataclass
class SimulatorStats:
    """Contadores para o resultado do teste (backward compat)."""

    started_at: datetime = field(default_factory=datetime.now)
    trips_created: int = 0
    trips_cancelled: int = 0
    trips_cancel_failed: int = 0
    trips_accepted: int = 0
    trips_completed: int = 0
    accept_failures: int = 0
    driver_skipped_cancelled: int = 0

    def summary(self) -> str:
        elapsed = (datetime.now() - self.started_at).total_seconds()
        return (
            "\n" + "=" * 50 + "\n"
            "RESULTADO DO TESTE\n"
            "=" * 50 + "\n"
            f"  Duração:           {elapsed:.0f} s\n"
            f"  Viagens criadas:   {self.trips_created}\n"
            f"  Viagens canceladas:{self.trips_cancelled}\n"
            f"  Cancel falhou:     {self.trips_cancel_failed}\n"
            f"  Aceites:           {self.trips_accepted}\n"
            f"  Concluídas:        {self.trips_completed}\n"
            f"  Aceite falhou:     {self.accept_failures}\n"
            f"  Motorista skip:    {self.driver_skipped_cancelled}\n"
            "=" * 50
        )


def _parse_args() -> str:
    """Parse --scenario from argv. Returns scenario mode."""
    parser = argparse.ArgumentParser(description="TVDE Traffic Simulator")
    parser.add_argument(
        "--scenario",
        choices=["normal", "flash_crowd", "heavy_load"],
        default=os.environ.get("TVDE_SIM_SCENARIO", "normal"),
        help="Scenario mode",
    )
    args = parser.parse_args()
    return args.scenario


def _save_result(content: str) -> Path | None:
    """Guarda o resultado num ficheiro. Retorna o path ou None se já guardado."""
    global _result_saved
    with _shutdown_lock:
        if _result_saved is not None:
            return _result_saved
        logs_dir = Path(__file__).resolve().parents[3] / "logs"
        logs_dir.mkdir(exist_ok=True)
        ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        path = logs_dir / f"simulator_result_{ts}.txt"
        path.write_text(content, encoding="utf-8")
        _result_saved = path
        return path


def _fetch_simulator_tokens(
    passengers: int, drivers: int
) -> tuple[list[str], list[str]]:
    """Fetch passenger and driver token lists from /dev/seed-simulator."""
    url = f"{API_BASE_URL}/dev/seed-simulator"
    params = {"passengers": passengers, "drivers": drivers}
    r = httpx.post(url, params=params, timeout=REQUEST_TIMEOUT_SEC)
    r.raise_for_status()
    data = r.json()
    return data["passenger_tokens"], data["driver_tokens"]


def main() -> None:
    scenario = _parse_args()
    if RANDOM_SEED is not None:
        random.seed(int(RANDOM_SEED))

    # Determine bot counts per scenario
    if scenario == "flash_crowd":
        n_passengers = FLASH_CROWD_PASSENGERS
        n_drivers = NUMBER_DRIVER_BOTS
    elif scenario == "heavy_load":
        last_phase = HEAVY_LOAD_PHASES[-1]
        n_passengers, n_drivers = last_phase[1], last_phase[2]
    else:
        n_passengers = NUMBER_PASSENGER_BOTS
        n_drivers = NUMBER_DRIVER_BOTS

    passenger_tokens: list[str] = []
    driver_tokens: list[str] = []

    if TOKEN_PASSENGER and TOKEN_DRIVER:
        passenger_tokens = [TOKEN_PASSENGER] * n_passengers
        driver_tokens = [TOKEN_DRIVER] * n_drivers
        print("Using tokens from environment (single user per role)")
    else:
        print(
            f"Fetching tokens from /dev/seed-simulator (passengers={n_passengers}, drivers={n_drivers})..."
        )
        try:
            passenger_tokens, driver_tokens = _fetch_simulator_tokens(
                n_passengers, n_drivers
            )
        except Exception as e:
            print(f"Failed to fetch tokens: {e}")
            print("Backend must be running with ENV=dev.")
            sys.exit(1)

    metrics = SimulatorMetrics()
    stats = SimulatorStats()
    print(f"Scenario: {scenario}")
    print(f"API: {API_BASE_URL}")
    if scenario != "flash_crowd":
        print("Press Ctrl+C to stop.\n")

    async def run_normal() -> None:
        tasks = []
        for i in range(n_passengers):
            token = (
                passenger_tokens[i]
                if i < len(passenger_tokens)
                else passenger_tokens[-1]
            )
            bot = PassengerBot(i + 1, token, stats, metrics)
            tasks.append(asyncio.create_task(bot.run()))
        for i in range(n_drivers):
            token = driver_tokens[i] if i < len(driver_tokens) else driver_tokens[-1]
            bot = DriverBot(i + 1, token, stats, metrics)
            tasks.append(asyncio.create_task(bot.run()))
        await asyncio.gather(*tasks)

    async def run_flash_crowd() -> None:
        print("FLASH CROWD TRIGGERED")
        passenger_bots = [
            PassengerBot(
                i + 1,
                passenger_tokens[i]
                if i < len(passenger_tokens)
                else passenger_tokens[-1],
                stats,
                metrics,
            )
            for i in range(n_passengers)
        ]
        results = await asyncio.gather(
            *[bot.create_trip_once() for bot in passenger_bots]
        )
        created = sum(1 for r in results if r is not None)
        print(f"Created {created} trips simultaneously. Drivers processing...")
        driver_tasks = [
            asyncio.create_task(
                DriverBot(
                    i + 1,
                    driver_tokens[i] if i < len(driver_tokens) else driver_tokens[-1],
                    stats,
                    metrics,
                ).run()
            )
            for i in range(n_drivers)
        ]
        try:
            await asyncio.wait_for(
                asyncio.gather(*driver_tasks), timeout=FLASH_CROWD_DRIVER_DURATION_SEC
            )
        except asyncio.TimeoutError:
            for t in driver_tasks:
                t.cancel()

    async def run_heavy_load() -> None:
        duration_sec = HEAVY_LOAD_DURATION_MIN * 60
        all_tasks: list[asyncio.Task] = []

        # Phase 0: start immediately (20 passengers, 8 drivers)
        for i in range(HEAVY_LOAD_PHASES[0][1]):
            if i < len(passenger_tokens):
                bot = PassengerBot(i + 1, passenger_tokens[i], stats, metrics)
                all_tasks.append(asyncio.create_task(bot.run()))
        for i in range(HEAVY_LOAD_PHASES[0][2]):
            if i < len(driver_tokens):
                bot = DriverBot(i + 1, driver_tokens[i], stats, metrics)
                all_tasks.append(asyncio.create_task(bot.run()))
        print(
            f"[HeavyLoad] Phase 1: {HEAVY_LOAD_PHASES[0][1]} passengers, {HEAVY_LOAD_PHASES[0][2]} drivers"
        )

        async def add_phases() -> None:
            for phase_idx in range(1, len(HEAVY_LOAD_PHASES)):
                wait = (
                    HEAVY_LOAD_PHASES[phase_idx][0]
                    - HEAVY_LOAD_PHASES[phase_idx - 1][0]
                ) * 60
                await asyncio.sleep(wait)
                prev_p, prev_d = (
                    HEAVY_LOAD_PHASES[phase_idx - 1][1],
                    HEAVY_LOAD_PHASES[phase_idx - 1][2],
                )
                n_p, n_d = (
                    HEAVY_LOAD_PHASES[phase_idx][1],
                    HEAVY_LOAD_PHASES[phase_idx][2],
                )
                for i in range(prev_p, n_p):
                    if i < len(passenger_tokens):
                        bot = PassengerBot(i + 1, passenger_tokens[i], stats, metrics)
                        all_tasks.append(asyncio.create_task(bot.run()))
                for i in range(prev_d, n_d):
                    if i < len(driver_tokens):
                        bot = DriverBot(i + 1, driver_tokens[i], stats, metrics)
                        all_tasks.append(asyncio.create_task(bot.run()))
                print(
                    f"[HeavyLoad] Phase {phase_idx + 1}: {n_p} passengers, {n_d} drivers"
                )

        phase_task = asyncio.create_task(add_phases())
        try:
            await asyncio.wait_for(
                asyncio.gather(*all_tasks, phase_task), timeout=duration_sec + 30
            )
        except asyncio.TimeoutError:
            pass

    async def run_scenario() -> None:
        if scenario == "normal":
            await run_normal()
        elif scenario == "flash_crowd":
            await run_flash_crowd()
        elif scenario == "heavy_load":
            await run_heavy_load()
        else:
            await run_normal()

    def _build_report() -> str:
        return metrics.simulation_report()

    _shutdown_done = False

    def _do_shutdown() -> None:
        nonlocal _shutdown_done
        with _shutdown_lock:
            if _shutdown_done:
                return
            _shutdown_done = True
            content = _build_report()
            path = _save_result(content)
        print("\nStopped.")
        print(content)
        if path:
            print(f"Resultado guardado em {path}")

    def _on_sigint(*_args) -> None:
        _do_shutdown()
        os._exit(0)

    signal.signal(signal.SIGINT, _on_sigint)
    try:
        asyncio.run(run_scenario())
    except KeyboardInterrupt:
        _do_shutdown()
    except Exception as e:
        print(f"Error: {e}")
        content = _build_report()
        print(content)
        _save_result(content)
    else:
        # Flash_crowd/heavy_load exit via timeout
        content = _build_report()
        print(content)
        _save_result(content)


if __name__ == "__main__":
    main()
