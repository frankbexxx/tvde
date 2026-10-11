# AUDIT-ONLY — repo lateral scan (2026-09)

**Não é runtime.** Não é chamado pela API, pelo Vite, pelo CI, nem por `package.json`.

Auditorias Set 2026: [`docs/archive/audits/`](../../docs/archive/audits/) (ex.: P1 runtime). Índice findings: [`docs/registers/FINDINGS.md`](../../docs/registers/FINDINGS.md).

| Artefacto | Destino |
|-----------|---------|
| `scan_repo_health.py` | **KEEP** — one-shot reexecutável; sem integração |
| `out/` | **DELETE** após leitura (saídas npm/knip/depcheck) |
| este README | **KEEP** enquanto o script existir |

```powershell
python scripts/audit/scan_repo_health.py
```
