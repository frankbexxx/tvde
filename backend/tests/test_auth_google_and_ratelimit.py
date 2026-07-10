"""Google OAuth exchange + auth rate limits (A2-01)."""

from app.auth import otp as otp_module
from app.core.config import settings


def test_google_exchange_not_beta(client, monkeypatch) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", False, raising=False)
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "cid", raising=False)
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "sec", raising=False)
    r = client.post(
        "/auth/google/exchange",
        json={
            "code": "dummy",
            "redirect_uri": "http://localhost:5173/auth/google/callback",
        },
    )
    assert r.status_code == 404


def test_google_exchange_disabled_without_secrets(client, monkeypatch) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "", raising=False)
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "", raising=False)
    r = client.post(
        "/auth/google/exchange",
        json={
            "code": "dummy",
            "redirect_uri": "http://localhost:5173/auth/google/callback",
        },
    )
    assert r.status_code == 503
    assert r.json()["detail"] == "google_oauth_disabled"


def test_google_exchange_passenger_role_only(client, monkeypatch) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "cid", raising=False)
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "sec", raising=False)
    r = client.post(
        "/auth/google/exchange",
        json={
            "code": "dummy",
            "redirect_uri": "http://localhost:5173/auth/google/callback",
            "requested_role": "driver",
        },
    )
    assert r.status_code == 403


def test_config_google_flags(client, monkeypatch) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "g-id", raising=False)
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "g-sec", raising=False)
    r = client.get("/config")
    assert r.status_code == 200
    body = r.json()
    assert body["beta_mode"] is True
    assert body["google_oauth_enabled"] is True
    assert body["google_oauth_client_id"] == "g-id"


def test_otp_request_rate_limit_per_phone(client, monkeypatch) -> None:
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    monkeypatch.setattr(settings, "MAX_BETA_USERS", 9999, raising=False)
    phone = "+351934999888"
    for i in range(12):
        r = client.post("/auth/otp/request", json={"phone": phone})
        assert r.status_code == 200, f"iteration {i}"
    r13 = client.post("/auth/otp/request", json={"phone": phone})
    assert r13.status_code == 429
    assert r13.json()["detail"] == "rate_limit_otp_request"


def test_otp_verify_rate_limit_per_phone(client) -> None:
    phone = "+351934999777"
    for i in range(12):
        r = client.post("/auth/otp/verify", json={"phone": phone, "code": "000000"})
        assert r.status_code == 401, f"iteration {i}"
        assert r.json()["detail"] == "invalid_otp"

    r13 = client.post("/auth/otp/verify", json={"phone": phone, "code": "000000"})
    assert r13.status_code == 429
    assert r13.json()["detail"] == "rate_limit_otp_verify"


def test_dev_tools_fixed_otp_disabled_in_production(client, monkeypatch, capsys) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "production", raising=False)
    monkeypatch.setattr(settings, "ENABLE_DEV_TOOLS", True, raising=False)
    monkeypatch.setattr(settings, "BETA_MODE", True, raising=False)
    monkeypatch.setattr(settings, "MAX_BETA_USERS", 9999, raising=False)
    monkeypatch.setattr(otp_module.secrets, "randbelow", lambda _n: 0)

    assert otp_module.generate_otp_code() == "100000"

    r = client.post("/auth/otp/request", json={"phone": "+351934999666"})
    assert r.status_code == 200
    captured = capsys.readouterr()
    assert "[OTP]" not in captured.out
    assert "100000" not in captured.out
