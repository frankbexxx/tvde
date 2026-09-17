# AUDIT-ONLY — repo lateral scan (2026-09)

**Não é runtime.** Não é chamado pela API, pelo Vite, pelo CI, nem por `package.json`.

Gerado para a auditoria `docs/analysis/REPO_LATERAL_AUDIT_2026-09.md`.

| Artefacto | Destino |
|-----------|---------|
| `scan_repo_health.py` | **KEEP** — one-shot reexecutável; sem integração |
| `out/` | **DELETE** após leitura (saídas npm/knip/depcheck) |
| este README | **KEEP** enquanto o script existir |

```powershell
python scripts/audit/scan_repo_health.py
```
