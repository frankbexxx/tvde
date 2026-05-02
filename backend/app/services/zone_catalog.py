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


# Order: stable for UI (airport-style last among Lisboa slugs).
_ZONE_CATALOG: tuple[ZoneCatalogEntry, ...] = (
    ZoneCatalogEntry(zone_id="faro", label_pt="Faro (centro)", kind="generic"),
    ZoneCatalogEntry(zone_id="lis", label_pt="Lisboa — aeroporto / zona de espera (LIS)", kind="airport"),
    ZoneCatalogEntry(zone_id="lisboa", label_pt="Lisboa (área metropolitana)", kind="generic"),
    ZoneCatalogEntry(zone_id="portimao", label_pt="Portimão", kind="generic"),
)


def list_zone_catalog() -> list[dict[str, str]]:
    return [{"zone_id": z.zone_id, "label_pt": z.label_pt, "kind": z.kind} for z in _ZONE_CATALOG]
