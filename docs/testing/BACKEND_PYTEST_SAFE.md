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

---

## Escape hatch (não usar no dia-a-dia)

```powershell
$env:ALLOW_REMOTE_TEST_DB = 'YES'
$env:DATABASE_URL = 'postgresql://…remote…'
pytest tests/…
```

Só para casos conscientes (ex. diagnóstico). Default: **off**.
