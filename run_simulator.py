#!/usr/bin/env python3
"""Run the TVDE traffic simulator. Execute from project root."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"

def main():
    sys.path.insert(0, str(BACKEND))
    from tools.simulator.simulator import main as sim_main
    try:
        sim_main()
    except KeyboardInterrupt:
        pass  # simulador trata e imprime resumo

if __name__ == "__main__":
    main()
