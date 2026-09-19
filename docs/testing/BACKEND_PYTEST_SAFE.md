# Backend pytest — BD local segura (TEST-DB-GUARD-1)

**Problema:** `backend/.env` pode apontar para Render. Um `pytest` local sem `DATABASE_URL` no shell herda essa URL e **escreve** na BD remota (ex.: trip órfã após testes da #413).

**Guard:** `tests/conftest.py` aborta **antes** de importar a app / Alembic se o host não for local.

---

## Regra

| Host | Resultado |
|------|-----------|
| `localhost`, `127.0.0.1`, `::1` | OK |
| `*.onrender.com` / remoto | **Abort** — mensagem contém `Refusing to run tests against remote database` |
| Override | Só `ALLOW_REMOTE_TEST_DB=YES` (explícito; quase nunca) |

A mensagem mostra o **hostname**, nunca a password.

**Limite do guard (L-TEST-01 / `T-TEST-DB-NAME-GUARD`):** só valida o **host**. Ainda é possível apontar acidentalmente para **outra BD local** (ex. `ride_db` em vez de `test_db`). Follow-up: exigir nome de DB de testes esperado salvo override explícito — **não** implementado ainda.

---

## Forma recomendada (Windows)

Com Postgres local a correr (ex. contentor `ride_postgres`) e DB `test_db` criada:

```powershell
.\scripts\windows\Invoke-BackendPytest.ps1
```

Ou um subconjunto:

```powershell
.\scripts\windows\Invoke-BackendPytest.ps1 -- tests/test_test_db_guard.py -q
```

O script força `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/test_db` neste processo (não altera `.env`).

---

## Manual (PowerShell)

```powershell
cd backend
$env:DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/test_db'
$env:STRIPE_MOCK = 'true'
# JWT_SECRET_KEY / OTP_SECRET / TEST_ACCOUNT_PASSWORD: do .env local ou CI-like
pytest tests/ -v --tb=short
```

**Não** corras `pytest` só com `.env` Render e sem override de `DATABASE_URL`.

---

## CI

`backend-ci` já define `DATABASE_URL=…@localhost:5432/test_db` — o guard aceita e a pipeline mantém-se.

Postgres do job é **efémero** (serviço limpo no início de cada run). Isso **não** equivale a isolamento por teste.

---

## Isolamento entre testes (L-TEST-01 — ACCEPTED DEBT)

**Estado (2026-09-19):** aceite como dívida de infra de testes a médio prazo. **Não** há fixture transaccional global nesta fase.

| Facto | Implicação |
|-------|------------|
| Fixture `db` só faz `session.close()` | Sem rollback / truncate / recreate por teste |
| `commit()` nos testes e nos handlers HTTP | Dados **persistem** durante a suite |
| `TestClient` / `get_db()` | Sessões **independentes** da fixture `db` |
| CI | Postgres novo por **job**; suite corre **serial** (sem pytest-xdist) |
| Local | `test_db` **acumula** entre runs se não for resetida |

**CI fresh DB ≠ per-test isolation.** Um job começa limpo; dentro do job, testes partilham estado.

### Mitigações obrigatórias (enquanto `T-DB-ISOLATION` estiver aberto)

- **`unique_test_phone()`** (`tests/support/unique_phone.py`) — obrigatório para novos users; evita colisões em `ix_users_phone` na mesma Postgres
- **Plates / PI / event ids** com alta entropia (`uuid`) — mesmo motivo
- Helpers como **`_isolate_drivers`** (ex. matching pool tests) — **workaround** que mute estado global residual; **não** são a arquitectura final
- **`run_full_baseline_reset`** — reescreve a BD partilhada a meio da suite (seed/demo); excepção consciente, não modelo geral

### Target futuro (`T-DB-ISOLATION`)

1. Fixture transaccional central (outer transaction por teste)
2. Override de `get_db` para a mesma connection
3. Sessões da app ligadas a essa connection (savepoints sob `commit()` da app)
4. Marker/excepção para baseline reset e testes especiais

**Não** usar truncate / recreate-schema como primeira opção.

---

## Escape hatch (não usar no dia-a-dia)

```powershell
$env:ALLOW_REMOTE_TEST_DB = 'YES'
$env:DATABASE_URL = 'postgresql://…remote…'
pytest tests/…
```

Só para casos conscientes (ex. diagnóstico). Default: **off**.
