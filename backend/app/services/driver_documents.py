"""Persisted driver documents JSON (`drivers.documents` text column).

Documentação «por veículo» no produto MVP: inspecção e seguros ligados ao motorista
via chave ``inspecao_viatura`` (sem entidade viatura separada até haver modelo dedicado).
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.driver import Driver
from app.schemas.driver_documents import DriverDocumentEntryPayload

DOC_KEYS: frozenset[str] = frozenset(
    {
        "carta_tvde",
        "certificado_motorista_tvde",
        "seguro_responsabilidade_civil",
        "inspecao_viatura",
        "cartao_cidadao",
        "registo_criminal",
    }
)

VALID_STATUS: frozenset[str] = frozenset(
    {"missing", "pending_review", "approved", "rejected", "expired"}
)


def _utc_iso_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def default_entry() -> dict[str, Any]:
    return {"status": "missing"}


def default_docs_dict() -> dict[str, dict[str, Any]]:
    return {k: default_entry() for k in DOC_KEYS}


def _coerce_entry(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        return default_entry()
    out = default_entry()
    st = raw.get("status")
    if isinstance(st, str):
        if st == "pending":
            st = "pending_review"
        if st in VALID_STATUS:
            out["status"] = st
    for key in ("expires_at", "submitted_at", "partner_note", "ocr_suggested_expires_at"):
        v = raw.get(key)
        if v is None:
            continue
        if key == "partner_note" and isinstance(v, str):
            out[key] = v[:2000]
        elif isinstance(v, str) and len(v) <= 64:
            out[key] = v
    file_path = raw.get("file_path")
    if isinstance(file_path, str) and file_path.strip():
        out["file_path"] = file_path.strip()[:512]
    file_name = raw.get("file_name")
    if isinstance(file_name, str) and file_name.strip():
        out["file_name"] = file_name.strip()[:256]
    return out


def parse_documents_column(raw: str | None) -> dict[str, Any]:
    base: dict[str, Any] = {"version": 1, "docs": default_docs_dict()}
    if not raw or not raw.strip():
        return base
    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return base
    if not isinstance(data, dict):
        return base
    docs_in = data.get("docs")
    if not isinstance(docs_in, dict):
        return base
    merged = default_docs_dict()
    for k, v in docs_in.items():
        if k in DOC_KEYS:
            merged[k] = _coerce_entry(v)
    base["docs"] = merged
    return base


def serialize_state(state: dict[str, Any]) -> str:
    return json.dumps(state, ensure_ascii=False)


def _ensure_driver_row(db: Session, user_id: uuid.UUID) -> Driver:
    row = db.get(Driver, user_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="driver_not_found")
    return row


def get_documents_for_driver(db: Session, user_id: uuid.UUID) -> dict[str, Any]:
    driver = _ensure_driver_row(db, user_id)
    return parse_documents_column(driver.documents)


def driver_documents_are_ready(raw_documents: str | None) -> bool:
    state = parse_documents_column(raw_documents)
    docs = state["docs"]
    return all((docs.get(key) or {}).get("status") == "approved" for key in DOC_KEYS)


def driver_documents_gate_allows(raw_documents: str | None) -> bool:
    if not settings.driver_documents_gate_enabled():
        return True
    return driver_documents_are_ready(raw_documents)


def apply_driver_documents_patch(
    db: Session,
    *,
    user_id: uuid.UUID,
    patch: dict[str, DriverDocumentEntryPayload],
) -> dict[str, Any]:
    driver = _ensure_driver_row(db, user_id)
    state = parse_documents_column(driver.documents)
    docs: dict[str, dict[str, Any]] = state["docs"]
    now = _utc_iso_now()
    for key, payload in patch.items():
        if key not in DOC_KEYS:
            continue
        cur = {**docs.get(key, default_entry())}
        if payload.status is not None:
            if payload.status not in VALID_STATUS:
                continue
            # Motorista não aprova sozinho.
            if payload.status == "approved":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="driver_cannot_approve_documents",
                )
            cur["status"] = payload.status
            if payload.status == "pending_review":
                cur["submitted_at"] = now
        if payload.submitted_at is not None:
            cur["submitted_at"] = payload.submitted_at[:64]
        if payload.ocr_suggested_expires_at is not None:
            cur["ocr_suggested_expires_at"] = payload.ocr_suggested_expires_at[:64]
        docs[key] = cur
    state["docs"] = docs
    driver.documents = serialize_state(state)
    db.commit()
    db.refresh(driver)
    return state


def apply_partner_documents_patch(
    db: Session,
    *,
    partner_id: str,
    driver_user_id: uuid.UUID,
    patch: dict[str, DriverDocumentEntryPayload],
) -> dict[str, Any]:
    from app.services.partner_queries import get_driver_for_partner

    driver = get_driver_for_partner(db, partner_id, driver_user_id)
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    state = parse_documents_column(driver.documents)
    docs: dict[str, dict[str, Any]] = state["docs"]
    for key, payload in patch.items():
        if key not in DOC_KEYS:
            continue
        cur = {**docs.get(key, default_entry())}
        if payload.status is not None and payload.status in VALID_STATUS:
            if payload.status == "approved":
                file_path = cur.get("file_path")
                if not file_path or not str(file_path).strip():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="document_file_required",
                    )
            cur["status"] = payload.status
        if payload.expires_at is not None:
            cur["expires_at"] = payload.expires_at[:64]
        if payload.partner_note is not None:
            cur["partner_note"] = payload.partner_note[:2000]
        if payload.ocr_suggested_expires_at is not None:
            cur["ocr_suggested_expires_at"] = payload.ocr_suggested_expires_at[:64]
        if payload.submitted_at is not None:
            cur["submitted_at"] = payload.submitted_at[:64]
        docs[key] = cur
    state["docs"] = docs
    driver.documents = serialize_state(state)
    db.commit()
    db.refresh(driver)
    return state
