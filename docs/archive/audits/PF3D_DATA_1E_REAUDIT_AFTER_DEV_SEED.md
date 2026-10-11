# PF3D-DATA-1E — Re-audit após DATA-1C/D (dev/test local)

**Estado:** **PASS documental** (re-audit confirmado em BD local)  
**`main`:** ≥ `31406fb` (merge [#464](https://github.com/frankbexxx/tvde/pull/464) DATA-1D)  
**Ambiente auditado:** Postgres local `test_db` (`db_host=127.0.0.1`) — **não** produção  
**Handoff:** [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md)  
**Matriz:** [`PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md`](./PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md)

---

## A. Estado repo

| Item | Valor |
|------|--------|
| **`main` / `origin/main`** | ≥ `31406fb` |
| **DATA-1A** | Audit por partner — `scripts/audit_vehicle_document_compliance.py` |
| **DATA-1B** | Sugestões dry-run — `scripts/suggest_active_vehicle_assignments.py` |
| **DATA-1C** | Apply local 1:1 — `--apply --confirm ASSIGN_ACTIVE_VEHICLES_DEV` |
| **DATA-1D** | Seed docs dummy — `--apply --confirm SEED_MIN_VEHICLE_DOCS_DEV` |
| **Runtime gates PF3D-3** | **Zero** — matching / accept / online / reassign / start intactos |

---

## B. Operações já feitas em dev/test local

| Passo | O quê | Ambiente |
|-------|--------|----------|
| **DATA-1C** | Aplicou **8** `active_vehicle_id` seguros (1:1 por partner) | `test_db` local |
| **DATA-1D** | Criou **44** documentos dummy em falta (tipos P0) | `test_db` local |
| Marcação | Notes/metadata: **DEV/TEST DUMMY DOCUMENT ONLY** | — |
| Status dummy | `approved` + `expires_at` +365d → summary `valid` | — |
| Produção / remoto | **Não** alterados | — |

Scripts: dry-run default; apply só local/dev/test com `--confirm` exacto; produção e remoto abortam.

---

## C. Resultado antes / depois (confirmado 2026-07-25)

Referência inicial (pré DATA-1C, audit DATA-1A/B): 122 approved · 118 sem viatura · 8 sugestões 1:1 · 68 ambíguos.

| Métrica (approved drivers) | Pré DATA-1C | Pós DATA-1C | Pós DATA-1D (re-audit 1E) |
|----------------------------|------------:|------------:|--------------------------:|
| `no_active_vehicle` | 118 | 110 | **110** |
| `blocked_by_documents` | 4 → 12* | 12 | **0** |
| `would_pass_gates` (compliant+warning) | 0 | 0 | **12** |
| drivers `compliant` / `warning` | 0 / 0 | 0 / 0 | **8 / 4** |
| safe 1:1 suggestions | 8 | 0 | **0** |
| ambiguous partners | 68 | 68 | **68** |

\* Após DATA-1C, os 8 novos com viatura passaram de `no_active_vehicle` para `blocked` por `missing_documents` (12 = 4 anteriores + 8).

### Re-audit 1E (comandos)

```powershell
$env:DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/test_db'
python scripts/audit_vehicle_document_compliance.py
python scripts/suggest_active_vehicle_assignments.py
```

**Audit (impact split):** `no_active_vehicle=110` · `blocked_by_documents=0` · `would_pass_gates_today=12`  
**Suggest:** `safe_suggestions_count=0` · `ambiguous_partner_count=68` · `active_unassigned_vehicles=34`

---

## D. Interpretação

1. **DATA-1C/D provaram o caminho dev/test** (assign 1:1 + docs mínimos dummy → subconjunto passa o helper PF3D-1).  
2. Ainda há **110** approved drivers **sem** `active_vehicle_id` (pool seed/simulator + partners ambíguos).  
3. Os **12** drivers com viatura activa **já não falham** por `missing_documents`.  
4. **4** ficaram `warning` por docs `pending_review` **existentes** (DATA-1D não substitui) — OK sob PF3D-0/1 (`pending_review` não bloqueia).  
5. **Gates globais continuam perigosos:** ligar PF3D-3 na frota total excluiria ~110 drivers por `no_active_vehicle`.  
6. Dummy docs **não** são compliance real / legal / IMT.

---

## E. Estado de decisão

| Decisão | Estado |
|---------|--------|
| Ligar **PF3D-3** globalmente | **Não** |
| Testar gates em subconjunto / flag OFF / smoke local | Só após PF3D-2 e decisão explícita |
| Produção | Requer atribuição real de viaturas + docs reais + smoke — **não** seed dummy |
| Decisões A–E (matriz PF3D-0) | Mantêm-se; helper PF3D-1 alinhado |

---

## F. Próximo caminho recomendado

| Ordem | Slice | Nota |
|-------|--------|------|
| **1** | **PF3D-2** — API read-only `compliance_status` | Sem bloquear matching/accept/online |
| **2** | **PF3D-3A** — gates atrás de feature flag, **default OFF**, só dev/test/smoke | Nunca default ON em prod nesta fase |
| — | Resolver frota `no_active_vehicle` | Partner assign real / CSV — fora de seed automático N:M |

**Recomendação:** PF3D-2 primeiro; só depois PF3D-3A com flag OFF.

---

## G. Fora de scope (1E e caminho imediato)

- Gates runtime ligados  
- Produção / remoto  
- Matching · accept · online · start_trip · reassign  
- Admin override · Passenger UX  
- OCR · IMT · S3  
- Compliance legal real  

---

## Scripts de referência

| Script | Papel |
|--------|--------|
| [`audit_vehicle_document_compliance.py`](../../scripts/audit_vehicle_document_compliance.py) | DATA-1A / 1E re-audit |
| [`suggest_active_vehicle_assignments.py`](../../scripts/suggest_active_vehicle_assignments.py) | DATA-1B / 1C |
| [`seed_min_vehicle_documents_dev.py`](../../scripts/seed_min_vehicle_documents_dev.py) | DATA-1D |

---

*Docs-only. Zero runtime gates. Seed/apply só em BD local de teste.*
