"""Validate external dossier YAML + Markdown before document build."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any

import jsonschema
import yaml
from jsonschema import Draft202012Validator

from scripts.documents.pii import ScanResult, scan_text
from scripts.documents.registry import RegisterIndex

REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = Path(__file__).resolve().parent / "schemas" / "dossier.schema.json"
BRAND_REFERENCE = REPO_ROOT / "docs/external/brand/reference.docx"
BRAND_TOKENS = REPO_ROOT / "docs/external/brand/tokens.yaml"

ALLOWED_PATH_PREFIXES = ("docs/", "site/")
BLOCKED_PATH_FRAGMENTS = (
    "/.env",
    ".env",
    "/secrets/",
    "credentials",
    "/node_modules/",
    "/.git/",
    "/uploads/",
    "backend/.env",
)
BLOCKED_OUTPUT_FRAGMENTS = ("/out/", "/output/", "/build/", "docs/external/outbox/")

PLACEHOLDER_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("razao_social", re.compile(r"\[RAZÃO SOCIAL\]", re.IGNORECASE)),
    ("nome", re.compile(r"\[NOME\]", re.IGNORECASE)),
    ("email", re.compile(r"\[EMAIL[^\]]*\]", re.IGNORECASE)),
    ("mustache", re.compile(r"\{\{|\}\}")),
    ("todo", re.compile(r"\bTODO\b")),
    ("tbd", re.compile(r"\bTBD\b")),
    ("underscores", re.compile(r"EXT-___|_{3,}")),
    ("example", re.compile(r"\bEXAMPLE\b", re.IGNORECASE)),
]

QEXT_INCOMPATIBLE_FOR_APPROVED = frozenset({"PREPARAR"})


@dataclass
class CheckOutcome:
    name: str
    status: str  # PASS | WARN | FAIL
    messages: list[str] = field(default_factory=list)


@dataclass
class ValidationReport:
    external_id: str
    status: str
    result: str  # PASS | PASS WITH WARNINGS | FAIL
    checks: list[CheckOutcome] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def add_check(self, check: CheckOutcome) -> None:
        self.checks.append(check)
        for msg in check.messages:
            if check.status == "FAIL":
                self.errors.append(f"{check.name}: {msg}")
            elif check.status == "WARN":
                self.warnings.append(f"{check.name}: {msg}")

    def finalize(self) -> None:
        if any(c.status == "FAIL" for c in self.checks):
            self.result = "FAIL"
        elif any(c.status == "WARN" for c in self.checks):
            self.result = "PASS WITH WARNINGS"
        else:
            self.result = "PASS"

    def to_json_dict(self) -> dict[str, Any]:
        return {
            "external_id": self.external_id,
            "status": self.status,
            "result": self.result,
            "checks": [
                {"name": c.name, "status": c.status, "messages": c.messages} for c in self.checks
            ],
            "errors": self.errors,
            "warnings": self.warnings,
        }


def _load_schema() -> dict[str, Any]:
    return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def _parse_iso(d: str) -> date:
    return date.fromisoformat(d)


def _duplicates(items: list[str]) -> list[str]:
    seen: set[str] = set()
    dups: set[str] = set()
    for x in items:
        if x in seen:
            dups.add(x)
        seen.add(x)
    return sorted(dups)


def _resolve_repo_path(path_str: str, repo_root: Path) -> Path:
    normalized = path_str.replace("\\", "/").lstrip("/")
    full = (repo_root / normalized).resolve()
    return full


def _path_allowed(path_str: str, repo_root: Path) -> tuple[bool, str | None]:
    normalized = path_str.replace("\\", "/").lstrip("/")
    if ".." in normalized.split("/"):
        return False, "path traversal (..) not allowed"
    lower = normalized.lower()
    for frag in BLOCKED_PATH_FRAGMENTS:
        if frag.lower() in lower:
            return False, f"blocked path fragment: {frag}"
    for frag in BLOCKED_OUTPUT_FRAGMENTS:
        if frag.lower() in lower:
            return False, f"blocked output/build path: {frag}"
    if not any(normalized.startswith(prefix) for prefix in ALLOWED_PATH_PREFIXES):
        return False, f"path must start with one of: {', '.join(ALLOWED_PATH_PREFIXES)}"
    full = _resolve_repo_path(normalized, repo_root)
    try:
        full.relative_to(repo_root.resolve())
    except ValueError:
        return False, "path escapes repository root"
    return True, None


def validate_dossier(yaml_path: Path, repo_root: Path | None = None) -> ValidationReport:
    repo_root = repo_root or REPO_ROOT
    yaml_path = yaml_path.resolve()
    if not yaml_path.is_file():
        report = ValidationReport(external_id="", status="", result="FAIL")
        report.errors.append(f"file not found: {yaml_path}")
        report.checks.append(CheckOutcome("input", "FAIL", [str(yaml_path)]))
        return report

    raw_text = yaml_path.read_text(encoding="utf-8")
    try:
        data: dict[str, Any] = yaml.safe_load(raw_text) or {}
    except yaml.YAMLError as exc:
        report = ValidationReport(external_id="", status="", result="FAIL")
        report.checks.append(CheckOutcome("yaml", "FAIL", [str(exc)]))
        report.finalize()
        return report

    external_id = str(data.get("external_id", "") or "")
    dossier_status = str(data.get("status", "") or "")
    report = ValidationReport(
        external_id=external_id, status=dossier_status, result="FAIL"
    )

    # JSON Schema
    schema = _load_schema()
    validator = Draft202012Validator(schema, format_checker=Draft202012Validator.FORMAT_CHECKER)
    schema_errors = sorted(validator.iter_errors(data), key=lambda e: e.path)
    if schema_errors:
        msgs = [e.message for e in schema_errors[:20]]
        report.add_check(CheckOutcome("metadata", "FAIL", msgs))
    else:
        report.add_check(CheckOutcome("metadata", "PASS", []))

    # Extra metadata rules (if schema passed partial)
    meta_msgs: list[str] = []
    meta_fail = False
    if data.get("created") and data.get("updated"):
        try:
            if _parse_iso(data["created"]) > _parse_iso(data["updated"]):
                meta_msgs.append("created must be <= updated")
                meta_fail = True
        except ValueError:
            meta_msgs.append("invalid ISO date in created/updated")
            meta_fail = True

    for label, key in (
        ("q_ext", "q_ext"),
        ("dec_refs", "dec_refs"),
        ("find_refs", "find_refs"),
    ):
        dups = _duplicates(list(data.get(key) or []))
        if dups:
            meta_msgs.append(f"duplicate {label}: {', '.join(dups)}")
            meta_fail = True

    src_paths = [s.get("path", "") for s in (data.get("sources") or []) if isinstance(s, dict)]
    dup_src = _duplicates(src_paths)
    if dup_src:
        meta_msgs.append(f"duplicate sources: {', '.join(dup_src)}")
        meta_fail = True

    if meta_fail:
        if report.checks and report.checks[0].status == "PASS":
            report.checks[0] = CheckOutcome("metadata", "FAIL", meta_msgs)
            for m in meta_msgs:
                report.errors.append(f"metadata: {m}")
        elif meta_msgs:
            report.add_check(CheckOutcome("metadata", "FAIL", meta_msgs))

    # Brand integration
    brand_msgs: list[str] = []
    if not BRAND_REFERENCE.is_file():
        brand_msgs.append("missing docs/external/brand/reference.docx")
    if not BRAND_TOKENS.is_file():
        brand_msgs.append("missing docs/external/brand/tokens.yaml")
    report.add_check(
        CheckOutcome("brand", "FAIL" if brand_msgs else "PASS", brand_msgs)
    )

    # Markdown body
    dossier_dir = yaml_path.parent
    md_name = data.get("markdown") or "dossier.md"
    md_path = dossier_dir / md_name
    if not md_path.is_file():
        report.add_check(
            CheckOutcome("markdown", "FAIL", [f"missing markdown: {md_path.name}"])
        )
        md_text = ""
    else:
        md_text = md_path.read_text(encoding="utf-8")
        report.add_check(CheckOutcome("markdown", "PASS", []))

    # Registry
    reg = RegisterIndex.load()
    reg_msgs: list[str] = []
    reg_fail = False
    for qid in data.get("q_ext") or []:
        if qid not in reg.q_ext:
            reg_msgs.append(f"unknown Q-EXT: {qid}")
            reg_fail = True
    for ref in data.get("dec_refs") or []:
        if not reg.decision_known(ref):
            reg_msgs.append(f"unknown DEC/alias: {ref}")
            reg_fail = True
    for ref in data.get("find_refs") or []:
        if not reg.finding_known(ref):
            reg_msgs.append(f"unknown FIND: {ref}")
            reg_fail = True
    report.add_check(
        CheckOutcome("registry refs", "FAIL" if reg_fail else "PASS", reg_msgs)
    )

    # Governance cross-check
    gov_msgs: list[str] = []
    gov_warn = False
    if dossier_status == "APPROVED":
        for qid in data.get("q_ext") or []:
            state = reg.q_ext.get(qid, "")
            if state in QEXT_INCOMPATIBLE_FOR_APPROVED:
                gov_msgs.append(
                    f"{qid} register state {state!r} may be incompatible with APPROVED dossier"
                )
                gov_warn = True
            if state == "ENVIADO":
                gov_msgs.append(
                    f"{qid} is ENVIADO in register; dossier APPROVED does not imply send state"
                )
                gov_warn = True
    if gov_msgs:
        report.add_check(CheckOutcome("governance", "WARN" if gov_warn else "PASS", gov_msgs))
    else:
        report.add_check(CheckOutcome("governance", "PASS", []))

    # Sources
    src_msgs: list[str] = []
    src_fail = False
    for entry in data.get("sources") or []:
        if not isinstance(entry, dict):
            continue
        p = entry.get("path", "")
        ok, reason = _path_allowed(p, repo_root)
        if not ok:
            src_msgs.append(f"{p}: {reason}")
            src_fail = True
            continue
        full = _resolve_repo_path(p.replace("\\", "/").lstrip("/"), repo_root)
        if not full.is_file():
            src_msgs.append(f"missing source file: {p}")
            src_fail = True
    report.add_check(
        CheckOutcome("sources", "FAIL" if src_fail else "PASS", src_msgs)
    )

    # Placeholders (dossier.md only)
    ph_count = 0
    ph_msgs: list[str] = []
    for name, pattern in PLACEHOLDER_PATTERNS:
        hits = pattern.findall(md_text)
        if hits:
            ph_count += len(hits)
            ph_msgs.append(f"{name}: {len(hits)}")
    ph_status = "PASS"
    if ph_count:
        if dossier_status == "APPROVED":
            ph_status = "FAIL"
            ph_msgs.insert(0, f"unresolved placeholders ({ph_count}) not allowed for APPROVED")
        else:
            ph_status = "WARN"
    if ph_count == 0:
        report.add_check(CheckOutcome("placeholders", "PASS", []))
    elif dossier_status == "APPROVED":
        report.add_check(
            CheckOutcome(
                "placeholders",
                "FAIL",
                [f"unresolved placeholders: {ph_count}", *ph_msgs],
            )
        )
    else:
        report.add_check(
            CheckOutcome("placeholders", "WARN", [str(ph_count), *ph_msgs])
        )

    # PII / credentials on md + yaml serialized
    combined = md_text + "\n" + raw_text
    scan: ScanResult = scan_text(combined)
    cred_fail = len(scan.credentials) > 0
    report.add_check(
        CheckOutcome(
            "credentials",
            "FAIL" if cred_fail else "PASS",
            [f"{f.rule} ({f.masked})" for f in scan.credentials[:10]],
        )
    )
    pii_count = len(scan.pii)
    pii_status = "PASS"
    pii_msgs: list[str] = []
    if pii_count == 0:
        report.add_check(CheckOutcome("possible PII", "PASS", []))
    elif dossier_status == "APPROVED":
        pii_msgs = [f"count={pii_count}"] + [f"{f.rule} ({f.masked})" for f in scan.pii[:10]]
        report.add_check(CheckOutcome("possible PII", "FAIL", pii_msgs))
    else:
        pii_msgs = [str(pii_count)] + [f"{f.rule} ({f.masked})" for f in scan.pii[:10]]
        report.add_check(CheckOutcome("possible PII", "WARN", pii_msgs))

    report.finalize()
    return report
