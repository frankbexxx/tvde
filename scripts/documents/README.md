# Document tooling — dossiers externos

Pipeline (fases):

```text
Markdown/YAML → validate → build (Pandoc) → DOCX + build-manifest.json
PDF / envio — fases futuras
```

## Requisitos

- Python 3.12+
- Dependências: `pip install -r scripts/documents/requirements.txt`
- **Pandoc 3.x** (build apenas)

### Pandoc no Windows (DEV)

Instalação controlada usada neste projecto:

```powershell
winget install --id JohnMacFarlane.Pandoc -e --accept-source-agreements --accept-package-agreements
```

- **Versão referência:** 3.12.1  
- **Path típico:** `%LOCALAPPDATA%\Pandoc\pandoc.exe`  
- **Impacto:** binário Pandoc no perfil do utilizador; reversível via «Apps & features» / `winget uninstall JohnMacFarlane.Pandoc`  
- Não instala LaTeX, Quarto ou Typst.

Reabrir o terminal ou refrescar `PATH` após instalar.

Linux CI: `apt-get install pandoc`.

## Comandos

```bash
# Validação estrutural + registers + PII guardrail
python -m scripts.documents.cli validate docs/external/sources/EXT-FIXTURE-001/dossier.yaml

# Build DOCX (output fora do repo)
python -m scripts.documents.cli build docs/external/sources/EXT-FIXTURE-001/dossier.yaml

# Output explícito (exemplo Windows)
python -m scripts.documents.cli build docs/external/sources/EXT-FIXTURE-001/dossier.yaml --out "%LOCALAPPDATA%\TVDE\documents\EXT-FIXTURE-001"

# Verificar manifest + hash do DOCX
python -m scripts.documents.cli inspect "%LOCALAPPDATA%\TVDE\documents\EXT-FIXTURE-001"
```

## Output

Por defeito: `%LOCALAPPDATA%\TVDE\documents\<external_id>\` (Linux/macOS: `~/.local/share/TVDE/documents/...`).

Ficheiros:

- `dossier.docx` — gerado pelo Pandoc + `docs/external/brand/reference.docx`
- `build-manifest.json` — proveniência (SHA-256, commit Git, comando Pandoc)

**Build ≠ aprovação ≠ envio.** O build não altera `dossier.yaml`, registers ou manifestos `outbox/`.

## Estilos Pandoc

Headings, corpo e tabelas mapeiam via `reference.docx`. Estilos custom (`Q-EXT ID`, callouts) usam `custom-style` no Markdown quando suportado; cobertura completa pode exigir filtro Lua numa fase posterior.

## Testes

```bash
python -m pytest scripts/documents/tests/ -v
python -m pytest scripts/documents/tests/ -v -m integration  # Pandoc real se instalado
```
