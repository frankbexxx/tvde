"""Sanity checks for canonical baseline roster (no DB wipe)."""

from app.models.enums import Role
from app.services.baseline_reset import BASELINE_USERS, baseline_user_count_expected


def test_baseline_roster_size() -> None:
    assert baseline_user_count_expected() == 10
    assert len(BASELINE_USERS) == 10


def test_baseline_has_required_phones() -> None:
    phones = {p for p, _, _ in BASELINE_USERS}
    assert "+351912345678" in phones  # legacy /dev/auto-trip
    assert "+351911111111" in phones
    assert "+351900000000" in phones
    assert "+351924075365" in phones
    assert "+351955555502" in phones


def test_baseline_partner_and_super_admin() -> None:
    roles = {r.value for _, r, _ in BASELINE_USERS}
    assert "partner" in roles
    assert "super_admin" in roles
    assert "admin" in roles
    assert Role.partner in {r for _, r, _ in BASELINE_USERS}
