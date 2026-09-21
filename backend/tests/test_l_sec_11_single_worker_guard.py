"""L-SEC-11: single-worker guard for process-local rate limits."""

from __future__ import annotations

import pytest

from app.core.in_memory_rate_limit_guard import (
    assert_single_worker_for_in_memory_rate_limits,
    parse_positive_int,
    workers_from_argv,
)


def test_a_web_concurrency_one_accepted_when_deployed() -> None:
    assert_single_worker_for_in_memory_rate_limits(
        is_deployed=True,
        web_concurrency="1",
        argv=["uvicorn", "app.main:app"],
    )


def test_b_web_concurrency_gt_one_rejected_when_deployed() -> None:
    with pytest.raises(RuntimeError, match="L-SEC-11"):
        assert_single_worker_for_in_memory_rate_limits(
            is_deployed=True,
            web_concurrency="2",
            argv=["uvicorn", "app.main:app"],
        )
    with pytest.raises(RuntimeError, match="process-local"):
        assert_single_worker_for_in_memory_rate_limits(
            is_deployed=True,
            web_concurrency="4",
        )


def test_b_workers_argv_rejected_when_deployed() -> None:
    with pytest.raises(RuntimeError, match="--workers=3"):
        assert_single_worker_for_in_memory_rate_limits(
            is_deployed=True,
            web_concurrency="1",
            argv=["uvicorn", "app.main:app", "--workers", "3"],
        )


def test_c_dev_and_test_not_blocked() -> None:
    # High concurrency is allowed outside deployed environments.
    assert_single_worker_for_in_memory_rate_limits(
        is_deployed=False,
        web_concurrency="8",
        argv=["uvicorn", "app.main:app", "--workers", "4"],
    )


def test_parse_and_argv_helpers() -> None:
    assert parse_positive_int(None) == 1
    assert parse_positive_int("") == 1
    assert parse_positive_int("1") == 1
    assert parse_positive_int("0") == 1
    assert parse_positive_int("bogus") == 1
    assert workers_from_argv(["--workers", "2"]) == 2
    assert workers_from_argv(["--workers=5"]) == 5
    assert workers_from_argv(["uvicorn", "app.main:app"]) is None
