"""FCM HTTP v1. No trip events call this yet. Credentials stay outside the repo."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Protocol

import requests
from google.auth.transport.requests import Request
from google.oauth2 import service_account
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.user import User
from app.services.device_push_tokens import (
    TRIPS_CHANNEL_ID,
    active_tokens_for_user,
    deactivate_token_value,
)

FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging"
DRIVER_OFFER_NOTIFICATION_BODY = "Nova oferta de viagem disponível"

# Lock-screen copy must not carry these keys even if a caller passes them.
_FORBIDDEN_DATA_KEYS = frozenset(
    {
        "lat",
        "lng",
        "latitude",
        "longitude",
        "origin_lat",
        "origin_lng",
        "destination_lat",
        "destination_lng",
        "price",
        "estimated_price",
        "address",
        "name",
        "phone",
        "email",
        "passenger_name",
    }
)


class FcmNotConfigured(Exception):
    """Server credential or project id is absent. Callers skip the send."""


@dataclass(frozen=True)
class FcmSendResult:
    ok: bool
    invalid_token: bool


class FcmSender(Protocol):
    def send(
        self,
        *,
        token: str,
        title: str,
        body: str,
        data: dict[str, str],
    ) -> FcmSendResult: ...


def sanitize_data(data: dict[str, str] | None) -> dict[str, str]:
    clean: dict[str, str] = {}
    for key, value in (data or {}).items():
        if key.lower() in _FORBIDDEN_DATA_KEYS:
            continue
        clean[key] = str(value)[:200]
    return clean


def build_fcm_http_body(
    *,
    token: str,
    title: str,
    body: str,
    data: dict[str, str] | None = None,
) -> dict:
    return {
        "message": {
            "token": token,
            "notification": {"title": title, "body": body},
            "data": sanitize_data(data),
            "android": {"notification": {"channel_id": TRIPS_CHANNEL_ID}},
        }
    }


def fcm_send_url(project_id: str) -> str:
    return f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"


def outcome_from_fcm_response(status_code: int, payload: dict | None) -> FcmSendResult:
    if 200 <= status_code < 300:
        return FcmSendResult(ok=True, invalid_token=False)
    error = (payload or {}).get("error") if isinstance(payload, dict) else None
    error = error if isinstance(error, dict) else {}
    code = ""
    for detail in error.get("details") or []:
        if isinstance(detail, dict) and detail.get("errorCode"):
            code = str(detail["errorCode"])
            break
    status = str(error.get("status") or "")
    invalid = code == "UNREGISTERED" or status in {"NOT_FOUND", "UNREGISTERED"} or status_code == 404
    return FcmSendResult(ok=False, invalid_token=invalid)


def access_token_from_service_account_json(raw_json: str) -> str:
    info = json.loads(raw_json)
    creds = service_account.Credentials.from_service_account_info(info, scopes=[FCM_SCOPE])
    creds.refresh(Request())
    if not creds.token:
        raise FcmNotConfigured()
    return str(creds.token)


class FcmHttpV1Sender:
    """Uses FCM_PROJECT_ID and FCM_SERVICE_ACCOUNT_JSON from the environment."""

    def __init__(self, *, project_id: str | None = None, service_account_json: str | None = None) -> None:
        self._project_id = (project_id if project_id is not None else settings.FCM_PROJECT_ID) or ""
        raw = service_account_json if service_account_json is not None else settings.FCM_SERVICE_ACCOUNT_JSON
        self._service_account_json = raw or ""

    def send(
        self,
        *,
        token: str,
        title: str,
        body: str,
        data: dict[str, str],
    ) -> FcmSendResult:
        project_id = self._project_id.strip()
        raw_json = self._service_account_json.strip()
        if not project_id or not raw_json:
            raise FcmNotConfigured()
        access = access_token_from_service_account_json(raw_json)
        response = requests.post(
            fcm_send_url(project_id),
            headers={"Authorization": f"Bearer {access}", "Content-Type": "application/json"},
            json=build_fcm_http_body(token=token, title=title, body=body, data=data),
            timeout=10,
        )
        try:
            payload = response.json()
        except ValueError:
            payload = None
        return outcome_from_fcm_response(response.status_code, payload if isinstance(payload, dict) else None)


def deliver_user_push(
    db: Session,
    user: User,
    *,
    title: str,
    body: str,
    data: dict[str, str] | None,
    sender: FcmSender,
) -> list[FcmSendResult]:
    """Send to active tokens. Invalid tokens are deactivated. Blocked users get nothing."""
    tokens = active_tokens_for_user(db, user)
    results: list[FcmSendResult] = []
    safe = sanitize_data(data)
    for row in tokens:
        result = sender.send(token=row.token, title=title, body=body, data=safe)
        results.append(result)
        if result.invalid_token:
            deactivate_token_value(db, row.token)
    return results
