"""Static v1 catalog of ``zone_id`` values for driver zone-change UX.

Partner-specific zones may still be accepted by the API if added server-side later;
this list is the **documented default** for dropdowns (see ``DRIVER_MENU_SPEC.md`` §7).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

ZoneKind = Literal["generic", "airport"]


@dataclass(frozen=True)
class ZoneCatalogEntry:
    zone_id: str
    label_pt: str
    kind: ZoneKind
    # Curta nota para o motorista (ex.: fila aeroporto ainda sem dados em tempo real na app).
    ops_note_pt: str | None = None


# Order: stable for UI (airport-style last among Lisboa slugs).
_ZONE_CATALOG: tuple[ZoneCatalogEntry, ...] = (
    ZoneCatalogEntry(zone_id="faro", label_pt="Faro (centro)", kind="generic"),
    ZoneCatalogEntry(
        zone_id="lis",
        label_pt="Lisboa — aeroporto / zona de espera (LIS)",
        kind="airport",
        ops_note_pt=(
            "Fila por produto e «actualizado há X seg» (estilo referência externa) ficam para "
            "quando existir feed operacional — ver docs/research/driver-app-benchmarks.md §6."
        ),
    ),
    ZoneCatalogEntry(zone_id="lisboa", label_pt="Lisboa (área metropolitana)", kind="generic"),
    ZoneCatalogEntry(zone_id="portimao", label_pt="Portimão", kind="generic"),
)

# (anchor_lat, anchor_lng, max_km) for ``POST …/arrived`` — generous radii in v1.
# Partner-only ``zone_id`` strings not listed here skip the geo gate (backward compatible).
_ZONE_ARRIVED_GATES: dict[str, tuple[float, float, float]] = {
    "faro": (37.0193, -7.9323, 40.0),
    "lis": (38.7813, -9.1357, 30.0),
    "lisboa": (38.7223, -9.1393, 55.0),
    "portimao": (37.1370, -8.5360, 40.0),
}


def zone_arrived_geo_gate(zone_id: str) -> tuple[float, float, float] | None:
    """Return ``(anchor_lat, anchor_lng, max_km)`` if ``Cheguei`` must validate GPS, else ``None``."""
    return _ZONE_ARRIVED_GATES.get(zone_id.strip().lower())


def list_zone_catalog() -> list[dict[str, str | float | None]]:
    rows: list[dict[str, str | float | None]] = []
    for z in _ZONE_CATALOG:
        row: dict[str, str | float | None] = {
            "zone_id": z.zone_id,
            "label_pt": z.label_pt,
            "kind": z.kind,
            "ops_note_pt": z.ops_note_pt,
            "arrived_anchor_lat": None,
            "arrived_anchor_lng": None,
            "arrived_max_km": None,
        }
        gate = _ZONE_ARRIVED_GATES.get(z.zone_id)
        if gate is not None:
            row["arrived_anchor_lat"] = gate[0]
            row["arrived_anchor_lng"] = gate[1]
            row["arrived_max_km"] = gate[2]
        rows.append(row)
    return rows
