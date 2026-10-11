# Sequência de implementação — Partner + multi-tenant (repo APP)

Documento **operacional**: ordem recomendada para **ancorar** o contrato A001–A003 ao código, sem reescrever os prompts.  
**Pré-requisito:** ler [`REALITY_NOTES.md`](REALITY_NOTES.md) e as execuções em [`phase-0-alignment/PROMPT_A002_*.md`](phase-0-alignment/PROMPT_A002_ROLES_AND_PERMISSIONS_MODEL.md) / [`PROMPT_A003_*.md`](phase-0-alignment/PROMPT_A003_MULTI_TENANT_BOUNDARIES.md).

---

## Princípios

1. **Fonte de verdade da sessão:** `get_current_user` em [`backend/app/api/deps.py`](../../../backend/app/api/deps.py) carrega `User` da BD e devolve `UserContext(user_id, role)`. O JWT já inclui `role` em [`backend/app/auth/security.py`](../../../backend/app/auth/security.py), mas **quem manda para RBAC na API é o `User` na BD** após validar `sub`.
2. **Novas claims no JWT** (ex.: `partner_id`) podem existir para o **frontend**; **nunca** substituem validação no servidor nem filtros em queries.
3. **Admin vs Partner:** não acrescentar “gestão de frota” em [`backend/app/api/routers/admin.py`](../../../backend/app/api/routers/admin.py). Criar **router dedicado** (ex. `partner.py` ou `partner_fleet.py`) com prefixo estável (`/partner/...`) e `require_role(Role.partner)` — evita duplicação semântica com rotas que hoje só fazem sentido para `Role.admin`.

---

## Sequência (ordem fixa recomendada)

| #      | Passo                        | O quê                                                                                                                                                                                                | Onde (ponteiros)                                                                                                                                                                                                                                             |
| ------ | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1**  | Modelo de dados **Partner**  | Tabela `partners` (id, nome, estado, …) — organização tenant.                                                                                                                                        | Nova migração Alembic em `backend/alembic/versions/`; modelo em `backend/app/db/models/`.                                                                                                                                                                    |
| **2**  | `partner_id` no motorista    | FK `drivers.partner_id` → `partners.id` (NOT NULL após backfill de piloto único ou nullable + backfill).                                                                                             | [`backend/app/db/models/driver.py`](../../../backend/app/db/models/driver.py); migração.                                                                                                                                                                     |
| **3**  | Utilizador **partner**       | Ligar conta `Role.partner` à organização: p.ex. `users.partner_org_id` (FK nullable, obrigatório quando `role == partner`) **ou** tabela `partner_members(user_id, partner_id)`.                     | [`backend/app/db/models/user.py`](../../../backend/app/db/models/user.py) (+ migração).                                                                                                                                                                      |
| **4**  | Enum `Role`                  | Adicionar `partner = "partner"`.                                                                                                                                                                     | [`backend/app/models/enums.py`](../../../backend/app/models/enums.py); rever **todos** os `match/case` e comparações a `Role`.                                                                                                                               |
| **5**  | Auth / OTP / BETA            | Fluxo de criação de utilizador partner: **não** expor como opção pública em OTP igual a passenger/driver até política definida — típico: **admin** cria org + convite, ou seed/dev apenas no início. | [`backend/app/api/routers/auth.py`](../../../backend/app/api/routers/auth.py) (`requested_role`, `login`, `verify_otp`); [`backend/app/api/routers/dev_tools.py`](../../../backend/app/api/routers/dev_tools.py) para DEV.                                   |
| **6**  | `UserContext` + deps         | Estender `UserContext` com `partner_id: UUID \| None` (ou `partner_org_id`). Preencher em `get_current_user` / `get_optional_user` a partir do `User`.                                               | [`backend/app/api/deps.py`](../../../backend/app/api/deps.py).                                                                                                                                                                                               |
| **7**  | JWT (opcional mas útil)      | `create_access_token(..., partner_id=...)` só se existir; payload com claim opcional.                                                                                                                | [`backend/app/auth/security.py`](../../../backend/app/auth/security.py); chamadas em `auth.py`.                                                                                                                                                              |
| **8**  | Guards                       | `require_role(Role.partner)` para novas rotas; **não** reutilizar `get_current_admin`.                                                                                                               | [`backend/app/api/deps.py`](../../../backend/app/api/deps.py) (`require_role` já suporta vários roles).                                                                                                                                                      |
| **9**  | Serviços + queries **trips** | Toda listagem/detalhe para partner: **JOIN** `trips` → `drivers` → `drivers.partner_id = :tenant`. Centralizar num serviço (ex. `services/partner_trips.py`) para não duplicar `WHERE`.              | [`backend/app/services/trips.py`](../../../backend/app/services/trips.py) (padrões actuais); novos métodos; rever matching/offers se filtrar por frota no futuro.                                                                                            |
| **10** | Routers                      | Novo router `GET /partner/drivers`, `GET /partner/trips`, … **sem** misturar com `passenger_trips` / `driver_trips`.                                                                                 | Novo ficheiro `backend/app/api/routers/partner.py` (nome final à escolha); registar em [`backend/app/main.py`](../../../backend/app/main.py) (ou `app/api/routers/__init__.py` conforme o projeto).                                                          |
| **11** | Endpoints a auditar (tenant) | Qualquer `select(Trip)` ou listagem que um **partner** possa vir a chamar — hoje **não existe**; quando existir, cada handler valida `trip.driver.partner_id == user.partner_id`.                    | Especial atenção: padrões semelhantes a [`passenger_trips.py`](../../../backend/app/api/routers/passenger_trips.py) / [`driver_trips.py`](../../../backend/app/api/routers/driver_trips.py) / [`matching.py`](../../../backend/app/api/routers/matching.py). |
| **12** | Frontend                     | Rota `/partner`, shell e guards por `role` no token/contexto (padrão igual a `/admin`).                                                                                                              | `web-app/` router + stores de auth.                                                                                                                                                                                                                          |
| **13** | Testes                       | `pytest`: dois `partners`, dois `drivers`, trip de A — token de B não vê trip de A (403/404).                                                                                                        | `backend/tests/` novo módulo dedicado.                                                                                                                                                                                                                       |

---

## Onde o Partner “nasce” (recomendação mínima para piloto)

- **Criação da organização:** apenas **`Role.admin`** (painel existente) ou script/migração para o 1.º parceiro — evita signup aberto de “partner” em BETA sem revisão.
- **Convite / vínculo:** utilizador com `role=partner` ligado a `partner_org_id` (ou membership); convite por telefone/link fica para iteração seguinte se necessário.
- **JWT:** após login, incluir `role` (já existe); opcionalmente `partner_id` para a UI não precisar de round-trip extra (a API continua a validar pela BD).

---

## Colisão Admin vs Partner (checklist)

| Área                                  | Admin (plataforma)              | Partner (tenant)       |
| ------------------------------------- | ------------------------------- | ---------------------- |
| Aprovar motorista TVDE (BETA)         | ✓ fluxo actual                  | ✗                      |
| Listar **todos** os utilizadores      | ✓                               | ✗                      |
| Listar motoristas **da frota**        | ✗ (ou só suporte com auditoria) | ✓                      |
| Ver viagem por UUID sem filtro tenant | ✓ com política                  | ✗ — obrigatório filtro |
| Comissão / contrato motorista         | pode ser override global        | escopo tenant          |

Se uma funcionalidade servir **os dois**, extrair **serviço de domínio** com parâmetro explícito `acting_as: admin | partner` e **dois** endpoints ou query flags — nunca “admin light” no router do partner.

---

## Depois desta sequência

- Retomar prompts **Fase 2** (`phase-2-partner/`) com tarefas já **ligadas** a ficheiros e passos acima.
- Fechar **A004–A007** (Fase 0) para critérios de corte e “partner model” em documento, alinhados a esta ordem.

---

_Última revisão: 2026-04-05_
