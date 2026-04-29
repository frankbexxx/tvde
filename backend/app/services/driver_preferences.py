from __future__ import annotations

from typing import Iterable

VALID_DRIVER_CATEGORIES = {"x", "xl", "pet", "comfort", "black", "electric", "van"}
DEFAULT_DRIVER_CATEGORIES = ["x"]


def normalize_driver_categories(values: Iterable[str] | None) -> list[str]:
    if not values:
        return list(DEFAULT_DRIVER_CATEGORIES)
    seen: set[str] = set()
    out: list[str] = []
    for raw in values:
        v = str(raw).strip().lower()
        if not v:
            continue
        if v == "standard":
            v = "x"
        if v in VALID_DRIVER_CATEGORIES and v not in seen:
            seen.add(v)
            out.append(v)
    return out or list(DEFAULT_DRIVER_CATEGORIES)


def decode_driver_categories_csv(raw: str | None) -> list[str]:
    if not raw:
        return list(DEFAULT_DRIVER_CATEGORIES)
    return normalize_driver_categories(raw.split(","))


def encode_driver_categories_csv(categories: Iterable[str] | None) -> str:
    return ",".join(normalize_driver_categories(categories))

