# Checkpoint — pós-#415 (2026-07-19)

**`main` / `origin/main`:** `916ddb2`  
**PRs abertas:** **0** · **CI:** verde · **Working tree:** limpa  

**Handoff vivo:** [`TODOdoDIA.md`](../../TODOdoDIA.md) · [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md) · [`FORWARD_PLAN_2026-07.md`](FORWARD_PLAN_2026-07.md)

---

## 1. Fechado nesta sequência

| PR | Entrega |
|----|---------|
| **#413** | Passenger active-trip recovery (`GET /trips/active`, bootstrap FE, keep `completed` para rating) |
| **#414** | Docs ADMIN-OPS-1 Fase 0 B/C **PASS** — [`ADMIN_OPS_1_FASE0_SMOKE_2026-07-19.md`](ADMIN_OPS_1_FASE0_SMOKE_2026-07-19.md) |
| **#415** | TEST-DB-GUARD-1 — pytest local recusa BD remota (Render) salvo `ALLOW_REMOTE_TEST_DB=YES` |

**Produto (mantém-se):** Admin ≠ dispatcher; Assign = recovery SA; assign diário → PARTNER-FLEET-1.

---

## 2. Incidente pytest → Render e mitigação

**O quê:** `pytest` local usava `DATABASE_URL` de `backend/.env` (Render `ride_db_*`). O `conftest` só forçava `ENV=test`; não havia guard de host. Testes com `commit()` / Alembic podiam escrever na BD da app.

**Mitigação (#415):**

- Guard em `backend/tests/support/test_db_guard.py`, chamado cedo em `conftest` (antes de imports app/DB).
- Permite só `localhost` / `127.0.0.1` / `::1`.
- Override explícito: `ALLOW_REMOTE_TEST_DB=YES`.
- Launcher: `scripts/windows/Invoke-BackendPytest.ps1`.
- Doc: [`BACKEND_PYTEST_SAFE.md`](../testing/BACKEND_PYTEST_SAFE.md).

**CI:** continua com `localhost:5432/test_db` — sem mudança de runtime da app.

---

## 3. Próximos carris recomendados

Escolher **1** por sessão:

1. **Pagamentos stuck** — reconcile / mock processing / Saúde (dívida antiga; não misturar com Admin force).
2. **Admin Ops seguinte** — playbook honesty (ongoing ≠ cancel admin), orphan-panel UX opcional, UI Atribuir se priorizado.
3. **Partner / Fleet** — PARTNER-FLEET-1 (viaturas, docs, associação, assign/reassign diário).

---

## 4. Fora de scope deste checkpoint

Sem alterações runtime app · sem Render/env/secrets · sem migrations · sem limpeza de DBs.
