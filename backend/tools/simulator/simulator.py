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
)
from .passenger_bot import PassengerBot
from .driver_bot import DriverBot


@dataclass
class SimulatorStats:
    """Contadores para o resultado do teste."""
    started_at: datetime = field(default_factory=datetime.now)
    trips_created: int = 0
    trips_cancelled: int = 0
    trips_cancel_failed: int = 0
    trips_accepted: int = 0
    trips_completed: int = 0
    accept_failures: int = 0
    driver_skipped_cancelled: int = 0  # passageiro cancelou a caminho

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
            f"  Motorista skip:    {self.driver_skipped_cancelled} (passageiro cancelou)\n"
            "=" * 50
        )


def _save_result(stats: "SimulatorStats") -> Path | None:
    """Guarda o resultado num ficheiro. Retorna o path ou None se já guardado."""
    global _result_saved
    with _shutdown_lock:
        if _result_saved is not None:
            return _result_saved
        # backend/tools/simulator/simulator.py -> project root = parents[3]
        logs_dir = Path(__file__).resolve().parents[3] / "logs"
        logs_dir.mkdir(exist_ok=True)
        ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        path = logs_dir / f"simulator_result_{ts}.txt"
        content = stats.summary()
        path.write_text(content, encoding="utf-8")
        _result_saved = path
        return path


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

    stats = SimulatorStats()
    print(f"Starting {NUMBER_PASSENGER_BOTS} passenger bots, {NUMBER_DRIVER_BOTS} driver bots")
    print(f"API: {API_BASE_URL}")
    print("Press Ctrl+C to stop.\n")

    async def run_all() -> None:
        tasks = []
        for i in range(NUMBER_PASSENGER_BOTS):
            token = passenger_tokens[i] if i < len(passenger_tokens) else passenger_tokens[-1]
            bot = PassengerBot(i + 1, token, stats)
            tasks.append(asyncio.create_task(bot.run()))
        for i in range(NUMBER_DRIVER_BOTS):
            token = driver_tokens[i] if i < len(driver_tokens) else driver_tokens[-1]
            bot = DriverBot(i + 1, token, stats)
            tasks.append(asyncio.create_task(bot.run()))
        await asyncio.gather(*tasks)

    _shutdown_done = False

    def _do_shutdown() -> None:
        nonlocal _shutdown_done
        with _shutdown_lock:
            if _shutdown_done:
                return
            _shutdown_done = True
            path = _save_result(stats)
        print("\nStopped.")
        if path:
            print(f"Resultado guardado em {path}")

    def _on_sigint(*_args) -> None:
        _do_shutdown()
        os._exit(0)

    signal.signal(signal.SIGINT, _on_sigint)
    try:
        asyncio.run(run_all())
    except KeyboardInterrupt:
        _do_shutdown()


if __name__ == "__main__":
    main()
