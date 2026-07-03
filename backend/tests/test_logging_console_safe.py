"""BUG-001: trip banner console output must not break create_trip on Windows cp1252."""

from __future__ import annotations

from unittest.mock import patch

from app.utils.logging import _print_trip_header, log_event


def test_trip_banner_titles_are_ascii_only() -> None:
    from app.utils.logging import _trip_banner_title_done, _trip_banner_title_new

    for title in (_trip_banner_title_new(), _trip_banner_title_done()):
        title.encode("ascii")


def test_print_trip_header_survives_unicode_encode_error() -> None:
    with patch("app.utils.logging.print", side_effect=UnicodeEncodeError("cp1252", "x", 0, 1, "x")):
        _print_trip_header("trip-test-001")


def test_log_event_trip_created_does_not_raise_on_print_failure() -> None:
    with patch("app.utils.logging.print", side_effect=UnicodeEncodeError("cp1252", "x", 0, 1, "x")):
        log_event("trip_created", trip_id="trip-test-002", passenger_id="p1")
