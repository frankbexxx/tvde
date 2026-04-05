# Relatório de implementação — Partner + multi-tenant (base)

**Data da revisão do documento:** 2026-04-05  
**Âmbito:** execução dos blocos PROMPT_01–PROMPT_08 no backend `APP` (código + migração + testes).  
**Estado dos testes neste ambiente:** PostgreSQL **não** estava acessível em `localhost:5432` durante a sessão (`connection refused`); Docker Desktop **não** estava disponível. A lógica foi validada com **import da app**, **Ruff** e revisão estática. **Com Postgres a correr**, correr os comandos na secção 7.

---

## 1. Resumo executivo

| Objectivo                                         | Estado                                                                       |
| ------------------------------------------------- | ---------------------------------------------------------------------------- |
| `Role.partner` + tabela `partners`                | Implementado (`enums.py`, modelo `Partner`, migração Alembic)                |
| `drivers.partner_id` + backfill `Default fleet`   | Implementado (UUID fixo alinhado a `DEFAULT_PARTNER_UUID`)                   |
| `users.partner_org_id` para contas `role=partner` | Implementado                                                                 |
| `UserContext.partner_id` (fonte BD, não JWT)      | Implementado em `deps.py`                                                    |
| Guard `get_current_partner`                       | Implementado                                                                 |
| Queries isoladas `list_*_for_partner`             | Implementado em `services/partner_queries.py`                                |
| `GET /partner/drivers`, `GET /partner/trips`      | Implementado em `api/routers/partner.py`                                     |
| Testes de isolamento tenant                       | Implementado `tests/test_partner_tenant_isolation.py`                        |
| Fluxos passenger/driver existentes                | Preservados; criação de `Driver` em código/tests passa a exigir `partner_id` |

---

## 2. Ficheiros criados

| Ficheiro                                                            | Função                                                               |
| ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `backend/app/core/partner_constants.py`                             | UUID estável do partner default (migração + seeds)                   |
| `backend/app/db/models/partner.py`                                  | ORM `Partner`                                                        |
| `backend/app/services/partner_queries.py`                           | `list_drivers_for_partner`, `list_trips_for_partner` (JOIN + filtro) |
| `backend/app/schemas/partner.py`                                    | `PartnerDriverItem`, `PartnerTripItem`                               |
| `backend/app/api/routers/partner.py`                                | Router `/partner`                                                    |
| `backend/alembic/versions/f8a9b0c1d2e3_partner_multitenant_base.py` | Migração única (partners + enum + FKs + backfill)                    |
| `backend/tests/test_partner_tenant_isolation.py`                    | Isolamento A/B + 403 driver em `/partner/*`                          |
| `docs/PARTNER_MULTITENANT_IMPLEMENTATION_REPORT.md`                 | Este relatório                                                       |

---

## 3. Ficheiros alterados (principais)

- `backend/app/models/enums.py` — `Role.partner`
- `backend/app/db/models/user.py` — `partner_org_id`, relação `partner_org`
- `backend/app/db/models/driver.py` — `partner_id`, relação `partner`
- `backend/app/db/models/__init__.py` — export `Partner`
- `backend/app/api/deps.py` — `UserContext.partner_id`, `joinedload(driver_profile)`, `get_current_partner`
- `backend/app/main.py` — `app.include_router(partner.router)`
- `backend/app/api/routers/dev_tools.py`, `admin.py` — `Driver(..., partner_id=DEFAULT_PARTNER_UUID)`
- `backend/app/services/driver_location.py` — auto-create driver com `partner_id`; ramo `else` em modo não-BETA para roles que não sejam passenger/driver (incl. `partner`) → 403
- Todos os `backend/tests/*` que instanciavam `Driver(` — `partner_id=DEFAULT_PARTNER_UUID`

---

## 4. Migração Alembic (`f8a9b0c1d2e3`)

Ordem em `upgrade()`:

1. `CREATE TABLE partners`
2. `ALTER TYPE role_enum ADD VALUE 'partner'`
3. `drivers.partner_id` (nullable) + FK + índice
4. `INSERT` partner default `00000000-0000-4000-8000-000000000001` / nome `Default fleet`
5. `UPDATE drivers SET partner_id = …` onde `NULL`
6. `SET NOT NULL` em `drivers.partner_id`
7. `users.partner_org_id` (nullable) + FK + índice

**Nota PG:** `ADD VALUE` num enum pode falhar se a revisão for reaplicada manualmente com o valor já existente; tratamento habitual é não re-correr o mesmo `upgrade` numa BD já migrada.

---

## 5. Resolução de `UserContext.partner_id`

- **`role == driver`:** `str(driver_profile.partner_id)` se existir perfil.
- **`role == partner`:** `str(user.partner_org_id)` se preenchido.
- **Outros papéis:** `None`.

`get_current_partner` exige `role == partner` **e** `partner_id` não nulo; caso contrário **403** (`partner_org_required` ou `forbidden`).

---

## 6. API nova

| Método | Caminho            | Auth                                      | Comportamento                                      |
| ------ | ------------------ | ----------------------------------------- | -------------------------------------------------- |
| GET    | `/partner/drivers` | Bearer, `Role.partner` + `partner_org_id` | Lista `Driver` com `Driver.partner_id == tenant`   |
| GET    | `/partner/trips`   | Idem                                      | Lista `Trip` com `JOIN` em `Driver` e mesmo filtro |

Motorista com token **não** acede (403). Admin **não** usa estes endpoints para visão global (mantém `admin`).

---

## 7. Validação recomendada (máquina com Postgres)

Na pasta `backend/`:

```bash
# 1) Subir Postgres e definir DATABASE_URL (ex.: postgresql+psycopg2://user:pass@localhost:5432/dbname)

alembic upgrade head
uvicorn app.main:app --reload   # ou o comando habitual; deve subir sem erro de migração

pytest tests/test_partner_tenant_isolation.py -q
pytest -q
```

---

## 8. Riscos / próximos passos (fora deste PR mínimo)

- **Signup OTP/BETA:** `partner` **não** foi adicionado a `requested_role` público; criação de utilizadores `partner` continua a ser operacional (admin/seed).
- **JWT:** não foi adicionada claim `partner_id` (opcional futura); RBAC de tenant baseia-se na BD.
- **Frontend:** rota `/partner` na `web-app` não faz parte deste bloco.
- **Downgrade:** remove colunas/tabela; o valor `partner` em `role_enum` pode permanecer no PostgreSQL.

---

## 9. Comandos executados nesta sessão

- `alembic upgrade head` — **falhou** (Postgres recusado em `localhost:5432`).
- `python -c "from app.main import app; …"` — **OK**.
- `ruff check` nos ficheiros alterados listados — **OK**.
- `pytest tests/test_partner_tenant_isolation.py` — **erro de sessão** (mesma causa: migração na fixture).

---

_Conclusão: implementação de código e migração está completa segundo os 8 prompts; confirmação final `upgrade head` + `pytest` completo depende de um servidor PostgreSQL disponível._
