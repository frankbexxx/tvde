# Document tooling — dossiers externos

## Artefacto canónico

**DOCX** é o output externo principal (editável, revisão humana no Microsoft Word).

```text
Markdown/YAML
  → validate
  → Pandoc → DOCX → layout post-process
  → revisão humana (Word)
  → APPROVED DOCX (quando governance o permitir)

PDF:
  → opcional: --formats docx,pdf (LibreOffice preview / smoke / CI)
  → envio: preferir PDF exportado manualmente a partir do DOCX aprovado no Word
```

O PDF automático via LibreOffice **não** é o artefacto visual autoritativo e **não bloqueia** aprovação do DOCX.

## Pipeline técnico

```text
validate → Pandoc → DOCX → layout post-process → [LibreOffice → PDF opcional]
→ SHA-256 → build-manifest.json (output fora do Git)
```

## Requisitos

- Python 3.12+
- `pip install -r scripts/documents/requirements.txt`
- **Pandoc 3.x** (DOCX)
- **LibreOffice** (opcional — só para `--formats docx,pdf`)

### Pandoc (Windows DEV)

```powershell
winget install --id JohnMacFarlane.Pandoc -e --accept-source-agreements --accept-package-agreements
```

- Versão referência: **3.12.1** · path: `%LOCALAPPDATA%\Pandoc\pandoc.exe`
- Reversível: `winget uninstall JohnMacFarlane.Pandoc`

### LibreOffice (Windows DEV)

```powershell
winget install --id TheDocumentFoundation.LibreOffice -e --accept-source-agreements --accept-package-agreements
```

- Versão referência: **26.8.x** · path: `%ProgramFiles%\LibreOffice\program\soffice.exe`
- Reversível: «Apps & features» ou `winget uninstall TheDocumentFoundation.LibreOffice`
- Impacto: suite completa (~600 MB); só `soffice --headless` é usada quando PDF é pedido.

Linux CI: `apt-get install pandoc libreoffice-writer` (fixture smoke com `docx,pdf`).

## Comandos

```bash
python -m scripts.documents.cli validate docs/external/sources/EXT-FIXTURE-001/dossier.yaml

# Default: só DOCX (+ manifest)
python -m scripts.documents.cli build docs/external/sources/EXT-FIXTURE-001/dossier.yaml

# PDF preview/smoke (LibreOffice)
python -m scripts.documents.cli build ... --formats docx,pdf

python -m scripts.documents.cli inspect "%LOCALAPPDATA%\TVDE\documents\EXT-FIXTURE-001"
```

## Output

`%LOCALAPPDATA%\TVDE\documents\<external_id>\`:

| Ficheiro | Descrição |
|----------|-----------|
| `dossier.docx` | **Canónico** — Pandoc + `reference.docx` + pós-processamento layout |
| `dossier.pdf` | Opcional — derivado LO do DOCX (preview; não substitui DOCX aprovado) |
| `build-manifest.json` | Hashes sources/DOCX, Git, Pandoc; campos PDF opcionais |

**Build ≠ aprovação ≠ envio.** Não altera YAML, registers ou `outbox/`.

Edições manuais relevantes no Word devem, quando possível, ser reflectidas no source/template **antes** de APPROVED definitivo.

## Pós-render

Placeholders em **APPROVED** são re-verificados no texto extraído do DOCX após Pandoc (FAIL). PDF text scan opcional via `pypdf` quando disponível.

## Capa / header / footer (DOC-TOOL-7)

- **Página 1:** [`cover_preamble.md`](../docs/external/brand/cover_preamble.md) — título YAML, destinatário, data, iconmark (sem tabela metadata).
- **Página 2+:** [`body_preamble.md`](../docs/external/brand/body_preamble.md) — título funcional por `profile`, metadata Campo/Valor, depois corpo (sem H1 «Corpo do dossier…» — removido em compose).
- **Quebra de página:** `pageBreakBefore` no segundo `Heading1` (pós-processamento DOCX).
- **Footer págs. 2+:** metadados reais substituem demo no `reference.docx`.
- **Tabelas:** ~98% largura útil A4; perfis metadata/DEC/lacunas/anexos; cabeçalho suave + zebra; coluna «Ref. interna» (compose).
- **Q-EXT:** títulos externos «Questão N — …» + `Referência interna: Q-EXT-…` (mapa em `q_ext_titles.py`).
- **Tema:** `docx_theme.py` — cores headings, estilos Fact Label/Body, Q-EXT Ref.

## Testes

```bash
python -m pytest scripts/documents/tests/ -v
python -m pytest scripts/documents/tests/ -v -m integration
```
