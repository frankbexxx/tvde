"""CLI: python -m scripts.documents.cli validate <dossier.yaml> [--json]"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from scripts.documents.validator import REPO_ROOT, validate_dossier


def _print_human(report) -> None:
    print("DOC VALIDATION")
    print(f"ID: {report.external_id or '(unknown)'}")
    print(f"STATUS: {report.status or '(unknown)'}")
    print()
    for check in report.checks:
        label = check.name.upper()
        if check.name == "placeholders":
            if check.status == "PASS":
                print(f"PASS placeholders: 0")
            elif check.status == "WARN":
                print(f"WARN placeholders: {check.messages[0] if check.messages else '?'}")
            else:
                print(f"FAIL placeholders: {', '.join(check.messages)}")
        elif check.name == "possible PII":
            count = check.messages[0] if check.messages and check.messages[0].isdigit() else str(
                len(check.messages)
            )
            if check.status == "PASS":
                print(f"PASS possible PII: 0")
            elif check.status == "WARN":
                print(f"WARN possible PII: {count}")
            else:
                print(f"FAIL possible PII: {', '.join(check.messages)}")
        elif check.name == "credentials":
            if check.status == "PASS":
                print("PASS credentials")
            else:
                print(f"FAIL credentials: {', '.join(check.messages)}")
        else:
            suffix = ""
            if check.messages:
                suffix = f": {', '.join(check.messages[:3])}"
                if len(check.messages) > 3:
                    suffix += " ..."
            print(f"{check.status} {check.name}{suffix}")
    print()
    print(f"RESULT: {report.result}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="scripts.documents.cli")
    sub = parser.add_subparsers(dest="command", required=True)

    val = sub.add_parser("validate", help="Validate dossier YAML + markdown")
    val.add_argument("yaml_path", type=Path, help="Path to dossier.yaml")
    val.add_argument("--json", action="store_true", help="Machine-readable JSON on stdout")
    val.add_argument(
        "--repo-root",
        type=Path,
        default=REPO_ROOT,
        help="Repository root (default: auto-detected)",
    )

    args = parser.parse_args(argv)

    if args.command != "validate":
        return 2

    if not args.yaml_path.is_file():
        if args.json:
            print(json.dumps({"result": "FAIL", "errors": ["usage: dossier yaml not found"]}))
        else:
            print("ERROR: dossier yaml not found", file=sys.stderr)
        return 2

    report = validate_dossier(args.yaml_path, repo_root=args.repo_root.resolve())

    if args.json:
        print(json.dumps(report.to_json_dict(), indent=2, ensure_ascii=False))
    else:
        _print_human(report)

    if report.result == "FAIL":
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
