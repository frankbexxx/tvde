"""CLI: validate | build | inspect external dossiers."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from scripts.documents.build import BuildError, build_dossier
from scripts.documents.manifest import inspect_output_dir
from scripts.documents.paths import OutputPathError, default_output_dir
from scripts.documents.validator import REPO_ROOT, validate_dossier


def _print_human(report) -> None:
    print("DOC VALIDATION")
    print(f"ID: {report.external_id or '(unknown)'}")
    print(f"STATUS: {report.status or '(unknown)'}")
    print()
    for check in report.checks:
        if check.name == "placeholders":
            if check.status == "PASS":
                print("PASS placeholders: 0")
            elif check.status == "WARN":
                print(f"WARN placeholders: {check.messages[0] if check.messages else '?'}")
            else:
                print(f"FAIL placeholders: {', '.join(check.messages)}")
        elif check.name == "possible PII":
            count = (
                check.messages[0]
                if check.messages and check.messages[0].isdigit()
                else str(len(check.messages))
            )
            if check.status == "PASS":
                print("PASS possible PII: 0")
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


def _cmd_validate(args) -> int:
    if not args.yaml_path.is_file():
        if args.json:
            print(json.dumps({"result": "FAIL", "errors": ["dossier yaml not found"]}))
        else:
            print("ERROR: dossier yaml not found", file=sys.stderr)
        return 2

    report = validate_dossier(args.yaml_path, repo_root=args.repo_root.resolve())
    if args.json:
        print(json.dumps(report.to_json_dict(), indent=2, ensure_ascii=False))
    else:
        _print_human(report)
    return 1 if report.result == "FAIL" else 0


def _cmd_build(args) -> int:
    out = args.out
    if out is None:
        import yaml

        data = yaml.safe_load(args.yaml_path.read_text(encoding="utf-8")) or {}
        out = default_output_dir(str(data.get("external_id", "unknown")))

    try:
        result = build_dossier(
            args.yaml_path,
            out,
            repo_root=args.repo_root.resolve(),
            allow_in_repo=args.allow_in_repo,
        )
    except OutputPathError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    except BuildError as exc:
        print(f"BUILD BLOCKED: {exc}", file=sys.stderr)
        return 1
    except FileNotFoundError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    print("DOC BUILD")
    print(f"ID: {result.output_dir.name}")
    print(f"DOCX: {result.docx_path}")
    print(f"MANIFEST: {result.manifest_path}")
    print(f"PANDOC: {result.pandoc_version}")
    return 0


def _cmd_inspect(args) -> int:
    report = inspect_output_dir(args.output_dir.resolve())
    print("DOC INSPECT")
    print(f"DIR: {args.output_dir}")
    print(f"ID: {report.external_id or '(unknown)'}")
    print(f"MANIFEST: {report.manifest_path} ({'OK' if report.manifest_path.is_file() else 'MISSING'})")
    print(f"DOCX: {report.docx_path} ({'OK' if report.docx_exists else 'MISSING'})")
    print(f"SIZE: {report.size_bytes} bytes")
    print(f"HASH MATCH: {report.hash_match}")
    print(f"PANDOC (manifest): {report.pandoc_version or '(n/a)'}")
    for msg in report.messages:
        print(f"- {msg}")
    return 0 if report.ok else 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="scripts.documents.cli")
    sub = parser.add_subparsers(dest="command", required=True)

    val = sub.add_parser("validate", help="Validate dossier YAML + markdown")
    val.add_argument("yaml_path", type=Path)
    val.add_argument("--json", action="store_true")
    val.add_argument("--repo-root", type=Path, default=REPO_ROOT)

    bld = sub.add_parser("build", help="Validate then build DOCX via Pandoc")
    bld.add_argument("yaml_path", type=Path)
    bld.add_argument("--out", type=Path, default=None, help="Output directory (outside repo)")
    bld.add_argument("--repo-root", type=Path, default=REPO_ROOT)
    bld.add_argument(
        "--allow-in-repo",
        action="store_true",
        help="Test-only: allow output inside repository",
    )

    insp = sub.add_parser("inspect", help="Verify build output against manifest")
    insp.add_argument("output_dir", type=Path)

    args = parser.parse_args(argv)
    if args.command == "validate":
        return _cmd_validate(args)
    if args.command == "build":
        return _cmd_build(args)
    if args.command == "inspect":
        return _cmd_inspect(args)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
