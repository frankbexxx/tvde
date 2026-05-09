"""One-shot: convert c:\\dev\\_misc\\carros_tvde_uber_Lisboa.txt to docs/reference/*."""

from __future__ import annotations

import csv
import json
import re
from collections import Counter
from pathlib import Path

SOURCE = Path(r"C:\dev\_misc\carros_tvde_uber_Lisboa.txt")
OUT_DIR = Path(__file__).resolve().parents[1] / "docs" / "reference"


def main() -> None:
    text = SOURCE.read_text(encoding="utf-8").replace("\u00a0", " ").replace("\u202f", " ")
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    model_re = re.compile(r"^(?P<model>.+?)\s*-\s*(?P<year>20\d{2})\s*\((?P<cats>.*)\)\s*$")
    rows: list[dict[str, object]] = []
    cur_make: str | None = None
    for line in lines:
        m = model_re.match(line)
        if m:
            cats = [c.strip() for c in m.group("cats").split(",") if c.strip()]
            rows.append(
                {
                    "make": cur_make or "",
                    "model": m.group("model").strip(),
                    "year": m.group("year"),
                    "categories": cats,
                }
            )
        else:
            cur_make = line

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    meta = {
        "source_file": str(SOURCE.as_posix()),
        "description": (
            "Export-style list (Uber): makes, models, year field, and Uber product categories for Lisbon. "
            "For market parity reference; not legal TVDE eligibility."
        ),
        "vehicle_count": len(rows),
        "make_count": len({r["make"] for r in rows}),
    }
    (OUT_DIR / "uber_lisboa_veiculos_tvde.json").write_text(
        json.dumps({"meta": meta, "vehicles": rows}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    csv_path = OUT_DIR / "uber_lisboa_veiculos_tvde.csv"
    with csv_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["make", "model", "year", "categories"])
        for r in rows:
            w.writerow([r["make"], r["model"], r["year"], "; ".join(r["categories"])])

    cat_ctr: Counter[str] = Counter()
    for r in rows:
        for c in r["categories"]:  # type: ignore[union-attr]
            cat_ctr[str(c)] += 1
    make_ctr: Counter[str] = Counter(str(r["make"]) for r in rows)
    years = sorted({int(str(r["year"])) for r in rows})

    def esc_cell(s: str) -> str:
        return s.replace("|", "\\|")

    cats_rows = "\n".join(f"| {esc_cell(k)} | {v} |" for k, v in cat_ctr.most_common())
    makes_rows = "\n".join(f"| {esc_cell(k)} | {v} |" for k, v in make_ctr.most_common(15))

    md = f"""# Veiculos Uber (Lisboa) — referencia estruturada

Dados convertidos a partir de `{SOURCE.as_posix()}` (marcas, modelos, ano e categorias de produto Uber).

## Ficheiros maquina-legiveis

| Ficheiro | Formato |
|----------|---------|
| [uber_lisboa_veiculos_tvde.json](./uber_lisboa_veiculos_tvde.json) | JSON (`meta` + `vehicles[]`) |
| [uber_lisboa_veiculos_tvde.csv](./uber_lisboa_veiculos_tvde.csv) | CSV (`make,model,year,categories`) |

## Resumo

- **Veiculos (linhas de modelo):** {len(rows)}
- **Marcas distintas:** {meta['make_count']}
- **Anos no dataset:** {", ".join(str(y) for y in years)}

## Categorias (frequencia)

| Categoria | Modelos |
|-----------|--------:|
{cats_rows}

## Top 15 marcas por numero de modelos

| Marca | Modelos |
|-------|--------:|
{makes_rows}

## Nota

Referencia de mercado / paridade (lista Uber), nao substitui requisitos legais de TVDE.

## Regenerar

Na raiz do repo:

```bash
python scripts/convert_uber_lisboa_veiculos.py
```
"""
    (OUT_DIR / "uber_lisboa_veiculos_tvde.md").write_text(md, encoding="utf-8")
    print(f"Wrote {len(rows)} vehicles to {OUT_DIR}")


if __name__ == "__main__":
    main()
