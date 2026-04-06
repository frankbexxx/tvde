# RBAC endpoint audit (G006 / G007)

Auditoria estática dos routers FastAPI: dependência de auth e papel mínimo.  
**Partner** só acede a `/partner/*` via `get_current_partner` (role `partner` + `partner_org_id`).  
**Admin** usa `require_role(Role.admin)` ou `get_current_admin`.  
**Driver / passenger** usam `require_role` explícito ou `get_current_user` com verificação no serviço.

## `/partner/*` (prefixo `partner`)

| Método | Path | Auth |
|--------|------|------|
| GET | `/partner/drivers` | `get_current_partner` |
| GET | `/partner/drivers/{driver_user_id}` | `get_current_partner` |
| GET | `/partner/trips` | `get_current_partner` |
| GET | `/partner/trips/export` | `get_current_partner` |
| GET | `/partner/trips/{trip_id}` | `get_current_partner` |
| GET | `/partner/metrics` | `get_current_partner` |

Todas as queries de frota/viagens usam `ctx.partner_id` e JOIN `Driver.partner_id` onde aplicável (ver `partner_queries.py`, `partners_admin.partner_metrics`).

## `/admin/*` (prefixo `admin`)

Rotas administrativas usam `require_role(Role.admin)` (ou equivalente `get_current_admin` indireto). **Partner e driver recebem 403** se tentarem com o seu Bearer.

*(Lista completa: grep `require_role` e `get_current_admin` em `backend/app/api/routers/admin.py`.)*

## Outros routers

- **auth**: público (OTP/login) ou sem role gate nas rotas públicas.
- **passenger_trips**, **driver_trips**, **drivers**, **driver_offers**, etc.: `require_role` com combinações `passenger` / `driver` conforme ficheiro.
- **dev_tools**, **debug_routes**: condicionados a ambiente / flags, não para utilizadores partner em produção.

## G007 — Tenant (Trip / Driver)

| Área | Mecanismo |
|------|-----------|
| Listagem viagens partner | `Trip` JOIN `Driver` ON `Trip.driver_id = Driver.user_id` AND `Driver.partner_id = tenant` |
| Métricas | Mesmo padrão JOIN + filtros por `partner_id` |
| Detalhe viagem partner | `get_trip_for_partner` com JOIN obrigatório |
| Detalhe motorista partner | `get_driver_for_partner` filtra `Driver.partner_id` |

Testes: `tests/test_partner_tenant_isolation.py`, `tests/test_partner_c009_h008.py`.
