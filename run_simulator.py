#!/usr/bin/env python3
"""Run the TVDE traffic simulator. Execute from project root."""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"

def main():
    subprocess.run(
        [sys.executable, "-m", "tools.simulator"],
        cwd=BACKEND,
        check=True,
    )

if __name__ == "__main__":
    main()
