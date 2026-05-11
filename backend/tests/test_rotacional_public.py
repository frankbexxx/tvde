"""GET /rotacional/messages — feed público para o cabeçalho."""

import json

import pytest

from app.api.routers.rotacional import _parse_rotacional_feed
from app.core.config import settings


def test_parse_rotacional_feed_empty():
    assert _parse_rotacional_feed() == []


def test_parse_rotacional_feed_monkeypatch(monkeypatch: pytest.MonkeyPatch):
    payload = [
        {"text": "IPMA: exemplo de aviso.", "source": "meteo"},
        "Linha simples",
    ]
    monkeypatch.setattr(settings, "ROTACIONAL_FEED_JSON", json.dumps(payload), raising=False)
    items = _parse_rotacional_feed()
    assert len(items) == 2
    assert items[0].text == "IPMA: exemplo de aviso."
    assert items[0].source == "meteo"
    assert items[1].text == "Linha simples"
    assert items[1].source == "interno"


def test_parse_rotacional_invalid_json(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "ROTACIONAL_FEED_JSON", "not-json{{{", raising=False)
    assert _parse_rotacional_feed() == []


def test_rotacional_messages_route(client):
    r = client.get("/rotacional/messages")
    assert r.status_code == 200
    data = r.json()
    assert data.get("items") == []
