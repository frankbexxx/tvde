#!/usr/bin/env python3
"""
Verifica estado real da BD para diagnóstico de regressão.

Uso:
  DATABASE_URL=postgresql://... python scripts/check_db_state.py

Ou com .env:
  python scripts/check_db_state.py
  (carrega DATABASE_URL do backend/.env se existir)
"""
import os
import sys
from pathlib import Path

# Permitir carregar .env do backend
backend_dir = Path(__file__).resolve().parents[1] / "backend"
if (backend_dir / ".env").exists():
    from dotenv import load_dotenv
    load_dotenv(backend_dir / ".env")

from sqlalchemy import create_engine, text


def main() -> None:
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("DATABASE_URL não definida. Defina ou use backend/.env")
        sys.exit(1)

    engine = create_engine(url)
    with engine.connect() as conn:
        print("=== TRIPS (últimas 10) ===")
        print("id | passenger_id | driver_id | status | created_at")
        print("-" * 80)
        for row in conn.execute(text("""
            SELECT id, passenger_id, driver_id, status, created_at
            FROM trips ORDER BY created_at DESC LIMIT 10
        """)):
            print(row)
        print()

        print("=== DRIVERS ===")
        print("user_id | status | is_available")
        print("-" * 60)
        for row in conn.execute(text("""
            SELECT user_id, status, is_available FROM drivers
        """)):
            print(row)
        print()

        print("=== DRIVER_LOCATIONS (últimas 10) ===")
        print("driver_id | lat | lng | timestamp")
        print("-" * 80)
        for row in conn.execute(text("""
            SELECT driver_id, lat, lng, timestamp
            FROM driver_locations ORDER BY timestamp DESC LIMIT 10
        """)):
            print(row)


if __name__ == "__main__":
    main()
