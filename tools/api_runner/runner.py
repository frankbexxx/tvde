"""
TVDE API runner — ferramenta DEV isolada (fora de backend/).

Executa flows JSON: OTP manual (código no terminal do uvicorn), grava tokens em
session.json, dispara GET/POST com Bearer. Não altera o backend.

Uso:
  cd tools/api_runner
  python runner.py admin_flow
  python runner.py full_flow
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

import requests

BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "config.json"
SESSION_PATH = BASE_DIR / "session.json"
FLOWS_DIR = BASE_DIR / "flows"

# Alinhado ao estilo de logs operacionais do backend (prefixo fixo, pares chave=valor).
LOG_PREFIX = "[tvde_api_runner]"

# Chaves de flow que implicam role na BD após OTP (evita 403 confuso em /admin/* ou /partner/*).
_OTP_EXPECTED_ROLE: dict[str, str] = {
    "admin": "admin",
    "partner": "partner",
}


def _log(event: str, **fields: object) -> None:
    parts = [LOG_PREFIX, f"event={event}"]
    for key, val in fields.items():
        if val is not None:
            parts.append(f"{key}={val}")
    print(" | ".join(parts), flush=True)


def _load_config() -> dict[str, Any]:
    if not CONFIG_PATH.is_file():
        raise SystemExit(f"Missing {CONFIG_PATH.name}; copy from repo template.")
    data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    base = data.get("base_url", "")
    if not isinstance(base, str) or not base.startswith(("http://", "https://")):
        raise SystemExit(
            f"{LOG_PREFIX} invalid base_url in config.json "
            "(must be a string starting with http:// or https://)"
        )
    return data


def _timeout_sec() -> float:
    """Sempre aplicado em requests.* para não ficar pendurado."""
    return float(CONFIG.get("timeout_sec", 30))


def _normalize_api_role(role_raw: object) -> str:
    """Resposta JSON do verify: role como string ('admin') ou raramente outro formato."""
    if role_raw is None:
        return ""
    if isinstance(role_raw, str):
        return role_raw.strip().lower()
    return str(role_raw).strip().lower()


def _normalize_otp_code(raw: str) -> str:
    """
    Aceita só o código (ex. 123456) ou linha colada do uvicorn
    (ex. [OTP] phone=+351... code=123456 ou phone=... code=123456).
    API limita o código a 8 caracteres.
    """
    s = raw.strip()
    if not s:
        return s
    m = re.search(r"code=([^\s]+)", s, flags=re.IGNORECASE)
    if m:
        return m.group(1).strip()[:8]
    return s[:8]


def _load_session() -> dict[str, Any]:
    if not SESSION_PATH.is_file():
        return {"tokens": {}, "results": {}, "partner_id": None}
    raw = json.loads(SESSION_PATH.read_text(encoding="utf-8"))
    if "tokens" not in raw:
        raw["tokens"] = {}
    if "results" not in raw:
        raw["results"] = {}
    if "partner_id" not in raw:
        raw["partner_id"] = None
    return raw


def _save_session(session: dict[str, Any]) -> None:
    SESSION_PATH.write_text(
        json.dumps(session, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    _log("session_saved", path=str(SESSION_PATH))


def _expand_templates_str(s: str) -> str:
    pid = SESSION.get("partner_id")
    out = s.replace("{{session.partner_id}}", str(pid) if pid is not None else "")
    adv = CONFIG.get("assign_driver_user_id")
    if isinstance(adv, str):
        out = out.replace("{{config.assign_driver_user_id}}", adv.strip())
    return out


def _expand_templates(obj: Any) -> Any:
    if isinstance(obj, str):
        return _expand_templates_str(obj)
    if isinstance(obj, dict):
        return {k: _expand_templates(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_expand_templates(x) for x in obj]
    return obj


CONFIG = _load_config()
SESSION = _load_session()


def otp_login(user_key: str) -> None:
    phones: dict[str, str] = CONFIG["phones"]
    if user_key not in phones:
        raise SystemExit(
            f"Unknown user key {user_key!r}; add it under phones in config.json"
        )

    phone = phones[user_key]
    base = CONFIG["base_url"].rstrip("/")
    timeout = _timeout_sec()

    _log("otp_flow_start", user=user_key, phone=phone)

    r = requests.post(
        f"{base}/auth/otp/request",
        json={"phone": phone},
        timeout=timeout,
    )
    if not r.ok:
        _log("otp_request_failed", status=r.status_code, body=r.text[:500])
        r.raise_for_status()

    _log("otp_request_ok", status=r.status_code)

    raw = input("OTP code (digits only) or paste full uvicorn [OTP] line: ").strip()
    code = _normalize_otp_code(raw)
    if not code:
        raise SystemExit("Empty OTP; aborting.")

    verify_body: dict[str, str] = {"phone": phone, "code": code}
    if user_key == "admin":
        verify_body["requested_role"] = "admin"
    elif user_key == "partner":
        verify_body["requested_role"] = "partner"

    r = requests.post(
        f"{base}/auth/otp/verify",
        json=verify_body,
        timeout=timeout,
    )
    try:
        data = r.json()
    except json.JSONDecodeError:
        data = {"raw": r.text}

    if not r.ok:
        _log("otp_verify_failed", status=r.status_code, body=data)
        r.raise_for_status()

    token = data.get("access_token")
    if not token:
        raise SystemExit(f"No access_token in response: {data}")

    SESSION["tokens"][user_key] = token
    _save_session(SESSION)

    role_raw = data.get("role")
    role_str = _normalize_api_role(role_raw)

    expected = _OTP_EXPECTED_ROLE.get(user_key)
    if expected and role_str != expected:
        strict = bool(CONFIG.get("strict_role_after_otp", True))
        _log(
            "otp_role_mismatch",
            user_key=user_key,
            phone=phone,
            role=role_str,
            expected=expected,
        )
        print(
            f"{LOG_PREFIX} Abort: token role is {role_str!r} but user key {user_key!r} "
            f"requires role={expected!r} in the database. "
            f"Put a different phone in config.json phones.{user_key}, or promote this user "
            f"(e.g. admin in DB / dev tools). "
            f"Set strict_role_after_otp false in config.json to skip this check.",
            file=sys.stderr,
            flush=True,
        )
        if strict:
            raise SystemExit(1)

    _log(
        "otp_flow_done", user=user_key, role=role_str or role_raw, status=r.status_code
    )


def run_request(step: dict[str, Any]) -> Any:
    base = CONFIG["base_url"].rstrip("/")
    method = step["method"].upper()
    path = _expand_templates_str(step["url"])
    if not path.startswith("/"):
        path = "/" + path
    url = base + path

    headers: dict[str, str] = {}
    auth_key = step.get("auth")
    if auth_key:
        token = SESSION["tokens"].get(auth_key)
        if not token:
            raise Exception(f"[tvde_api_runner] missing_token user={auth_key!r}")
        headers["Authorization"] = f"Bearer {token}"

    body = step.get("body")
    if body is not None:
        body = _expand_templates(body)

    _log("http_start", name=step.get("name"), method=method, url=path)

    timeout = _timeout_sec()
    kwargs: dict[str, Any] = {"headers": headers, "timeout": timeout}
    if body is not None:
        kwargs["json"] = body

    r = requests.request(method, url, **kwargs)

    try:
        data = r.json()
    except json.JSONDecodeError:
        data = r.text

    _log(
        "http_done",
        name=step.get("name"),
        method=method,
        url=path,
        status=r.status_code,
    )
    print(
        json.dumps(data, indent=2, ensure_ascii=False)
        if isinstance(data, dict)
        else data
    )

    SESSION["last"] = data
    step_key = step.get("name") or step.get("id")
    if step_key:
        SESSION["results"][step_key] = data

    if r.ok and isinstance(data, dict):
        cap = step.get("capture_session")
        if cap:
            field = cap.get("from_field")
            to_key = cap.get("to_key")
            if field and to_key and field in data:
                SESSION[to_key] = data[field]
                _log("session_captured", key=to_key, value=str(data[field])[:80])

    _save_session(SESSION)

    return data


def _should_skip_step(step: dict[str, Any]) -> bool:
    keys = step.get("skip_if_empty")
    if not keys:
        return False
    for k in keys:
        v = CONFIG.get(k)
        if v is None or (isinstance(v, str) and not v.strip()):
            _log("step_skipped", name=step.get("name"), reason=f"empty_config:{k}")
            return True
    return False


def run_flow(flow_name: str) -> None:
    flow_path = FLOWS_DIR / f"{flow_name}.json"
    if not flow_path.is_file():
        available = sorted(p.stem for p in FLOWS_DIR.glob("*.json"))
        raise SystemExit(f"Flow not found: {flow_path}. Available: {available}")

    flow = json.loads(flow_path.read_text(encoding="utf-8"))
    _log("flow_start", flow=flow_name, steps=len(flow))

    for step in flow:
        if _should_skip_step(step):
            continue
        if step.get("type") == "otp_login":
            otp_login(step["user"])
        else:
            run_request(step)

    _log("flow_complete", flow=flow_name)


def main() -> None:
    if len(sys.argv) < 2:
        available = sorted(p.stem for p in FLOWS_DIR.glob("*.json"))
        print(f"Usage: python runner.py <flow_name>\nFlows: {', '.join(available)}")
        sys.exit(1)

    run_flow(sys.argv[1])


if __name__ == "__main__":
    main()
