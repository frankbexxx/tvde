"""Parse register files for ID existence and Q-EXT state (read-only)."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

REG_EXT = REPO_ROOT / "docs/registers/EXTERNAL_CONSULTATIONS.md"
REG_DEC = REPO_ROOT / "docs/registers/DECISIONS.md"
REG_FIND = REPO_ROOT / "docs/registers/FINDINGS.md"

RE_QEXT_ROW = re.compile(r"^\|\s*(Q-EXT-[A-Z]+-\d{3})\s*\|", re.MULTILINE)
RE_DEC_ROW = re.compile(r"^\|\s*(DEC-[A-Z0-9-]+)\s*\|", re.MULTILINE)
RE_FIND_ROW = re.compile(r"^\|\s*((?:FIND|STRIPE-LIVE)-[A-Z0-9-]+)\s*\|", re.MULTILINE)
RE_ALIAS = re.compile(r"`([A-Z][0-9]+-D[0-9A-Z]+(?:-REV[0-9]+)?)`")
RE_GO_ALIAS = re.compile(r"\b(GOV-[A-Z0-9-]+)\b")


@dataclass
class RegisterIndex:
    q_ext: dict[str, str] = field(default_factory=dict)
    decisions: set[str] = field(default_factory=set)
    decision_aliases: set[str] = field(default_factory=set)
    findings: set[str] = field(default_factory=set)

    @classmethod
    def load(cls) -> RegisterIndex:
        idx = cls()
        ext_text = REG_EXT.read_text(encoding="utf-8")
        for line in ext_text.splitlines():
            m = RE_QEXT_ROW.match(line)
            if not m:
                continue
            qid = m.group(1)
            parts = [p.strip() for p in line.split("|")]
            if len(parts) >= 9:
                idx.q_ext[qid] = parts[8]
            else:
                idx.q_ext[qid] = "UNKNOWN"

        dec_text = REG_DEC.read_text(encoding="utf-8")
        idx.decisions.update(m.group(1) for m in RE_DEC_ROW.finditer(dec_text))
        idx.decision_aliases.update(RE_ALIAS.findall(dec_text))
        idx.decision_aliases.update(RE_GO_ALIAS.findall(dec_text))

        find_text = REG_FIND.read_text(encoding="utf-8")
        idx.findings.update(m.group(1) for m in RE_FIND_ROW.finditer(find_text))
        return idx

    def decision_known(self, ref: str) -> bool:
        return ref in self.decisions or ref in self.decision_aliases

    def finding_known(self, ref: str) -> bool:
        return ref in self.findings
