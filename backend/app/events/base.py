from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class DomainEvent:
    name: str
    occurred_at: datetime

