"""GET /rotacional/messages — feed público para o cabeçalho."""

import json

import pytest
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.rotacional_external_cache import CACHE_ROW_ID, RotacionalExternalCache
from app.services.rotacional_feed import (
    RotacionalItem,
    merge_rotacional_items,
    parse_rotacional_feed_json,
)


def test_parse_rotacional_feed_empty():
    assert parse_rotacional_feed_json("") == []
    assert parse_rotacional_feed_json(None) == []


def test_parse_rotacional_feed_monkeypatch(monkeypatch: pytest.MonkeyPatch):
    payload = [
        {"text": "IPMA: exemplo de aviso.", "source": "meteo"},
        "Linha simples",
    ]
    monkeypatch.setattr(settings, "ROTACIONAL_FEED_JSON", json.dumps(payload), raising=False)
    items = parse_rotacional_feed_json(settings.ROTACIONAL_FEED_JSON)
    assert len(items) == 2
    assert items[0].text == "IPMA: exemplo de aviso."
    assert items[0].source == "meteo"
    assert items[1].text == "Linha simples"
    assert items[1].source == "interno"


def test_parse_rotacional_invalid_json(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "ROTACIONAL_FEED_JSON", "not-json{{{", raising=False)
    assert parse_rotacional_feed_json(settings.ROTACIONAL_FEED_JSON) == []


def test_rotacional_messages_route(client):
    r = client.get("/rotacional/messages")
    assert r.status_code == 200
    data = r.json()
    assert data.get("items") == []


def test_rotacional_merge_dedupes_by_text():
    env = [RotacionalItem(text="Aviso único", source="interno")]
    cache = [
        RotacionalItem(text="aviso único", source="ext"),
        RotacionalItem(text="Outro", source="ext"),
    ]
    merged = merge_rotacional_items(env, cache)
    assert len(merged) == 2
    assert merged[0].text == "Aviso único"
    assert merged[1].text == "Outro"


def test_rotacional_messages_merges_cache(client, db: Session, monkeypatch: pytest.MonkeyPatch):
    row = db.get(RotacionalExternalCache, CACHE_ROW_ID)
    if row is None:
        row = RotacionalExternalCache(
            id=CACHE_ROW_ID,
            items_json=json.dumps(
                [{"text": "Linha do cache externo", "source": "externo"}], ensure_ascii=False
            ),
        )
        db.add(row)
    else:
        row.items_json = json.dumps(
            [{"text": "Linha do cache externo", "source": "externo"}], ensure_ascii=False
        )
    db.commit()

    monkeypatch.setattr(settings, "ROTACIONAL_FEED_JSON", "", raising=False)
    r = client.get("/rotacional/messages")
    assert r.status_code == 200
    texts = [i["text"] for i in r.json()["items"]]
    assert "Linha do cache externo" in texts
