"""Conservative PII and secret scanning (preflight guardrail)."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum


class Severity(str, Enum):
    CREDENTIAL = "credential"
    PII = "pii"


@dataclass
class ScanFinding:
    kind: Severity
    rule: str
    masked: str
    line: int | None = None


@dataclass
class ScanResult:
    credentials: list[ScanFinding] = field(default_factory=list)
    pii: list[ScanFinding] = field(default_factory=list)


RE_EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
RE_IBAN_PT = re.compile(r"\bPT\s?\d{2}(?:\s?\d{4}){5}\s?\d{1,2}\b", re.IGNORECASE)
RE_BEARER = re.compile(r"\bBearer\s+[A-Za-z0-9._~+/=-]{8,}\b", re.IGNORECASE)
RE_STRIPE_KEY = re.compile(r"\b(sk|pk)_(live|test)_[A-Za-z0-9]{8,}\b")
RE_JWT = re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.")
RE_ASSIGN_SECRET = re.compile(
    r"(?i)\b(password|secret|api_key)\s*=\s*\S+"
)
RE_LONG_DIGITS = re.compile(r"\b\d{10,}\b")


def _mask(value: str, visible: int = 4) -> str:
    compact = re.sub(r"\s+", "", value)
    if len(compact) <= visible * 2:
        return "*" * len(compact)
    return compact[:visible] + "*" * (len(compact) - visible * 2) + compact[-visible:]


def _nif_checksum(nif: str) -> bool:
    if len(nif) != 9 or not nif.isdigit():
        return False
    if nif[0] not in "1235689":
        return False
    total = sum(int(nif[i]) * (9 - i) for i in range(8))
    check = 11 - (total % 11)
    if check >= 10:
        check = 0
    return int(nif[8]) == check


RE_NIF_CANDIDATE = re.compile(r"\b[1-9]\d{8}\b")


def scan_text(text: str) -> ScanResult:
    result = ScanResult()
    lines = text.splitlines()

    for i, line in enumerate(lines, start=1):
        for m in RE_BEARER.finditer(line):
            result.credentials.append(
                ScanFinding(Severity.CREDENTIAL, "bearer", _mask(m.group(0)), i)
            )
        for m in RE_STRIPE_KEY.finditer(line):
            result.credentials.append(
                ScanFinding(Severity.CREDENTIAL, "stripe_key", _mask(m.group(0)), i)
            )
        for m in RE_JWT.finditer(line):
            result.credentials.append(
                ScanFinding(Severity.CREDENTIAL, "jwt", _mask(m.group(0)), i)
            )
        for m in RE_ASSIGN_SECRET.finditer(line):
            result.credentials.append(
                ScanFinding(Severity.CREDENTIAL, "assignment", _mask(m.group(0)), i)
            )

        for m in RE_IBAN_PT.finditer(line):
            result.pii.append(ScanFinding(Severity.PII, "iban_pt", _mask(m.group(0)), i))
        for m in RE_EMAIL.finditer(line):
            email = m.group(0)
            if email.endswith("@example.com") or email.endswith("@vamula.pt"):
                continue
            result.pii.append(ScanFinding(Severity.PII, "email", _mask(email), i))
        for m in RE_NIF_CANDIDATE.finditer(line):
            nif = m.group(0)
            if _nif_checksum(nif):
                result.pii.append(ScanFinding(Severity.PII, "nif_pt", _mask(nif), i))
        for m in RE_LONG_DIGITS.finditer(line):
            result.pii.append(
                ScanFinding(Severity.PII, "long_number", _mask(m.group(0)), i)
            )

    return result
