"""Tests for driver document vault + expiry heuristics."""

from app.services.driver_document_expiry_suggest import suggest_expiry_iso_from_text
from app.services.driver_documents import (
    DOC_KEYS,
    default_docs_dict,
    parse_documents_column,
    serialize_state,
)


def test_suggest_expiry_pt_date() -> None:
    assert suggest_expiry_iso_from_text("Válido até 31/12/2028\nfoo") == "2028-12-31"


def test_parse_documents_roundtrip() -> None:
    state = {"version": 1, "docs": default_docs_dict()}
    state["docs"]["carta_tvde"]["status"] = "pending_review"
    blob = serialize_state(state)
    parsed = parse_documents_column(blob)
    assert parsed["docs"]["carta_tvde"]["status"] == "pending_review"


def test_doc_keys_cover_prompt_types() -> None:
    assert "cartao_cidadao" in DOC_KEYS
    assert "registo_criminal" in DOC_KEYS
