"""Operational readiness for Stripe TEST E2E on local Dev (not deployed)."""

from __future__ import annotations

import json
import logging
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.config import Settings, settings

logger = logging.getLogger(__name__)

_DEV_LOCAL = "dev-local"
_LISTEN_FILE = "stripe-listen.json"
_SECRET_FILE = "stripe-webhook-secret"  # nosec B105  # filename, not a credential
_PROBE_FILE = "stripe-e2e-probe.json"
_HEARTBEAT_MAX_AGE_SEC = 15


def _repo_dev_local_dir(base_dir: Path) -> Path:
    return base_dir.parent / ".dev-local"


def _read_json(path: Path) -> dict[str, Any] | None:
    try:
        if not path.is_file():
            return None
        raw = path.read_text(encoding="utf-8")
        data = json.loads(raw)
        return data if isinstance(data, dict) else None
    except (OSError, json.JSONDecodeError):
        return None


def _parse_iso(ts: str | None) -> datetime | None:
    if not ts:
        return None
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return None


def _pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    if sys.platform == "win32":
        import ctypes

        PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
        handle = ctypes.windll.kernel32.OpenProcess(  # type: ignore[attr-defined]
            PROCESS_QUERY_LIMITED_INFORMATION, False, pid
        )
        if handle:
            ctypes.windll.kernel32.CloseHandle(handle)  # type: ignore[attr-defined]
            return True
        return False
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


def _stripe_test_config_ok(cfg: Settings) -> tuple[bool, str | None]:
    if cfg.is_deployed_environment():
        return False, "deployed_environment"
    if bool(cfg.STRIPE_MOCK):
        return False, "stripe_mock"
    sk = (cfg.STRIPE_SECRET_KEY or "").strip()
    if sk.startswith("sk_live_"):
        return False, "sk_live_forbidden"
    if not sk.startswith("sk_test_"):
        return False, "config_invalid"
    wh_env = (cfg.STRIPE_WEBHOOK_SECRET or "").strip()
    if wh_env.startswith("whsec_") and _dev_local_paths(cfg).secret.is_file():
        listen = _read_json(_dev_local_paths(cfg).listen)
        if listen and listen.get("session_id"):
            pass  # file whsec wins when session ok; env alone is not enough for ready
    return True, None


def _local_db_ok(cfg: Settings) -> bool:
    try:
        from urllib.parse import urlparse

        u = urlparse(cfg.DATABASE_URL.replace("+psycopg2", ""))
        host = (u.hostname or "").lower()
        db = (u.path or "").lstrip("/").split("?")[0]
        return host in ("127.0.0.1", "localhost") and db == "ride_db"
    except Exception:
        return False


@dataclass(frozen=True)
class DevLocalPaths:
    root: Path
    listen: Path
    secret: Path
    probe: Path


def _dev_local_paths(cfg: Settings | None = None) -> DevLocalPaths:
    base = Path(__file__).resolve().parents[2]  # backend/
    root = base.parent / ".dev-local"
    return DevLocalPaths(
        root=root,
        listen=root / _LISTEN_FILE,
        secret=root / _SECRET_FILE,
        probe=root / _PROBE_FILE,
    )


@dataclass
class StripeE2EReadiness:
    stripe_mock: bool
    stripe_e2e_ready: bool
    stripe_e2e_reason: str | None
    stripe_listener_alive: bool
    stripe_listener_session_id: str | None
    stripe_listener_heartbeat_age_sec: float | None
    stripe_webhook_secret_set: bool
    stripe_last_probe_success_at: str | None
    stripe_last_probe_session_id: str | None

    def to_diagnostic_dict(self) -> dict[str, Any]:
        return {
            "stripe_mock": self.stripe_mock,
            "stripe_e2e_ready": self.stripe_e2e_ready,
            "stripe_e2e_reason": self.stripe_e2e_reason,
            "stripe_listener_alive": self.stripe_listener_alive,
            "stripe_listener_session_id": self.stripe_listener_session_id,
            "stripe_listener_heartbeat_age_sec": self.stripe_listener_heartbeat_age_sec,
            "stripe_webhook_secret_set": self.stripe_webhook_secret_set,
            "stripe_last_probe_success_at": self.stripe_last_probe_success_at,
            "stripe_last_probe_session_id": self.stripe_last_probe_session_id,
        }


def evaluate_stripe_e2e_readiness(cfg: Settings | None = None) -> StripeE2EReadiness:
    cfg = cfg or settings
    paths = _dev_local_paths(cfg)
    stripe_mock = bool(cfg.STRIPE_MOCK)
    sk = (cfg.STRIPE_SECRET_KEY or "").strip()
    stripe_test = sk.startswith("sk_test_")

    if stripe_mock or not stripe_test:
        return StripeE2EReadiness(
            stripe_mock=stripe_mock,
            stripe_e2e_ready=False,
            stripe_e2e_reason="na_mock" if stripe_mock else "config_invalid",
            stripe_listener_alive=False,
            stripe_listener_session_id=None,
            stripe_listener_heartbeat_age_sec=None,
            stripe_webhook_secret_set=False,
            stripe_last_probe_success_at=None,
            stripe_last_probe_session_id=None,
        )

    if not cfg.dev_tools_router_enabled():
        return StripeE2EReadiness(
            stripe_mock=False,
            stripe_e2e_ready=False,
            stripe_e2e_reason="dev_tools_off",
            stripe_listener_alive=False,
            stripe_listener_session_id=None,
            stripe_listener_heartbeat_age_sec=None,
            stripe_webhook_secret_set=bool(cfg.effective_stripe_webhook_secret()),
            stripe_last_probe_success_at=None,
            stripe_last_probe_session_id=None,
        )

    ok_cfg, reason = _stripe_test_config_ok(cfg)
    if not ok_cfg:
        return StripeE2EReadiness(
            stripe_mock=False,
            stripe_e2e_ready=False,
            stripe_e2e_reason=reason,
            stripe_listener_alive=False,
            stripe_listener_session_id=None,
            stripe_listener_heartbeat_age_sec=None,
            stripe_webhook_secret_set=False,
            stripe_last_probe_success_at=None,
            stripe_last_probe_session_id=None,
        )

    if not _local_db_ok(cfg):
        return StripeE2EReadiness(
            stripe_mock=False,
            stripe_e2e_ready=False,
            stripe_e2e_reason="config_invalid",
            stripe_listener_alive=False,
            stripe_listener_session_id=None,
            stripe_listener_heartbeat_age_sec=None,
            stripe_webhook_secret_set=False,
            stripe_last_probe_success_at=None,
            stripe_last_probe_session_id=None,
        )

    listen = _read_json(paths.listen)
    probe = _read_json(paths.probe)

    session_id = str(listen.get("session_id")) if listen and listen.get("session_id") else None
    pid = int(listen.get("pid") or 0) if listen else 0
    heartbeat_at = _parse_iso(str(listen.get("heartbeat_at") or "")) if listen else None
    now = datetime.now(timezone.utc)
    hb_age: float | None = None
    if heartbeat_at:
        hb_age = max(0.0, (now - heartbeat_at).total_seconds())

    listener_alive = bool(
        listen
        and listen.get("state") == "ready"
        and session_id
        and pid > 0
        and _pid_alive(pid)
        and hb_age is not None
        and hb_age <= _HEARTBEAT_MAX_AGE_SEC
    )

    whsec_session = str(listen.get("whsec_session_id") or "") if listen else ""
    secret_ok = False
    if paths.secret.is_file() and session_id and whsec_session == session_id:
        raw = paths.secret.read_text(encoding="utf-8").strip()
        secret_ok = raw.startswith("whsec_")

    if session_id and whsec_session and whsec_session != session_id:
        return StripeE2EReadiness(
            stripe_mock=False,
            stripe_e2e_ready=False,
            stripe_e2e_reason="session_mismatch",
            stripe_listener_alive=listener_alive,
            stripe_listener_session_id=session_id,
            stripe_listener_heartbeat_age_sec=hb_age,
            stripe_webhook_secret_set=secret_ok,
            stripe_last_probe_success_at=str(probe.get("success_at")) if probe else None,
            stripe_last_probe_session_id=str(probe.get("session_id")) if probe else None,
        )

    if not listener_alive:
        reason = "listener_dead"
        if hb_age is not None and hb_age > _HEARTBEAT_MAX_AGE_SEC:
            reason = "heartbeat_stale"
        return StripeE2EReadiness(
            stripe_mock=False,
            stripe_e2e_ready=False,
            stripe_e2e_reason=reason,
            stripe_listener_alive=False,
            stripe_listener_session_id=session_id,
            stripe_listener_heartbeat_age_sec=hb_age,
            stripe_webhook_secret_set=secret_ok,
            stripe_last_probe_success_at=str(probe.get("success_at")) if probe else None,
            stripe_last_probe_session_id=str(probe.get("session_id")) if probe else None,
        )

    if not secret_ok:
        return StripeE2EReadiness(
            stripe_mock=False,
            stripe_e2e_ready=False,
            stripe_e2e_reason="whsec_missing",
            stripe_listener_alive=True,
            stripe_listener_session_id=session_id,
            stripe_listener_heartbeat_age_sec=hb_age,
            stripe_webhook_secret_set=False,
            stripe_last_probe_success_at=str(probe.get("success_at")) if probe else None,
            stripe_last_probe_session_id=str(probe.get("session_id")) if probe else None,
        )

    probe_session = str(probe.get("session_id") or "") if probe else ""
    probe_at = str(probe.get("success_at") or "") if probe else None
    if probe_session != session_id or not probe_at:
        return StripeE2EReadiness(
            stripe_mock=False,
            stripe_e2e_ready=False,
            stripe_e2e_reason="probe_failed",
            stripe_listener_alive=True,
            stripe_listener_session_id=session_id,
            stripe_listener_heartbeat_age_sec=hb_age,
            stripe_webhook_secret_set=True,
            stripe_last_probe_success_at=probe_at,
            stripe_last_probe_session_id=probe_session or None,
        )

    return StripeE2EReadiness(
        stripe_mock=False,
        stripe_e2e_ready=True,
        stripe_e2e_reason=None,
        stripe_listener_alive=True,
        stripe_listener_session_id=session_id,
        stripe_listener_heartbeat_age_sec=hb_age,
        stripe_webhook_secret_set=True,
        stripe_last_probe_success_at=probe_at,
        stripe_last_probe_session_id=probe_session,
    )


def write_probe_success(session_id: str, stripe_event_id: str | None = None) -> None:
    paths = _dev_local_paths()
    paths.root.mkdir(parents=True, exist_ok=True)
    payload = {
        "session_id": session_id,
        "success_at": datetime.now(timezone.utc).isoformat(),
        "stripe_event_id": stripe_event_id,
    }
    tmp = paths.probe.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    tmp.replace(paths.probe)


def invalidate_probe_for_session_mismatch() -> None:
    paths = _dev_local_paths()
    if paths.probe.is_file():
        try:
            paths.probe.unlink()
        except OSError:
            pass


def run_stripe_e2e_probe(cfg: Settings | None = None) -> dict[str, Any]:
    """Trigger Stripe TEST event through CLI forward path; require new stripe_webhook_events row."""
    import shutil
    import subprocess  # nosec B404
    import time

    from sqlalchemy import func, select

    from app.db.models.stripe_webhook_event import StripeWebhookEvent
    from app.db.session import SessionLocal

    cfg = cfg or settings
    if cfg.is_deployed_environment() or bool(cfg.STRIPE_MOCK):
        return {"ok": False, "reason": "not_applicable"}
    listen = _read_json(_dev_local_paths(cfg).listen)
    session_id = str(listen.get("session_id") or "") if listen else ""
    if not session_id:
        return {"ok": False, "reason": "no_listener_session"}

    stripe_bin = shutil.which("stripe")
    if not stripe_bin:
        return {"ok": False, "reason": "stripe_cli_missing"}

    db = SessionLocal()
    try:
        before = db.execute(select(func.count()).select_from(StripeWebhookEvent)).scalar_one()
    finally:
        db.close()

    started = time.perf_counter()
    proc = subprocess.run(  # nosec B603
        [stripe_bin, "trigger", "payment_intent.succeeded"],
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    if proc.returncode != 0:
        return {
            "ok": False,
            "reason": "stripe_trigger_failed",
            "exit_code": proc.returncode,
            "stderr": (proc.stderr or "")[:500],
        }

    deadline = started + 25.0
    after = before
    while time.perf_counter() < deadline:
        db = SessionLocal()
        try:
            after = db.execute(select(func.count()).select_from(StripeWebhookEvent)).scalar_one()
        finally:
            db.close()
        if after > before:
            write_probe_success(session_id=session_id)
            return {
                "ok": True,
                "session_id": session_id,
                "events_before": before,
                "events_after": after,
                "readiness": evaluate_stripe_e2e_readiness(cfg).to_diagnostic_dict(),
            }
        time.sleep(0.5)

    return {
        "ok": False,
        "reason": "probe_timeout_no_event_row",
        "events_before": before,
        "events_after": after,
    }
