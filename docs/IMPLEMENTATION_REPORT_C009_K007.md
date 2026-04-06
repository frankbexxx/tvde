# Relatório de implementação C009 → K007

## Resumo

Evolução do sistema **partner** para piloto: métricas e detalhes tenant-safe, atribuição/desatribuição de motoristas, export CSV, auditoria RBAC documentada, UI mínima `/partner`, runner com `partner_id` em sessão e `full_flow`, onboarding em Markdown.

## Fase C (backend)

| ID | Entrega | Notas |
|----|---------|--------|
| **C009** | `GET /partner/metrics` com `trips_completed`, `trips_cancelled`, `total_drivers` | Contagens com `Trip` JOIN `Driver` e `Driver.partner_id == tenant`; dia “hoje” continua em UTC via `get_today_range_utc`. |
| **C010** | `GET /partner/drivers/{driver_user_id}` | `get_driver_for_partner`; 404 fora do tenant. |
| **C011** | `GET /partner/trips/{trip_id}` | `get_trip_for_partner` com JOIN obrigatório ao motorista da frota. |
| **C012** | `POST` assign (idempotente + log se já na frota); `DELETE .../assign-partner` → `DEFAULT_PARTNER_UUID` | 409 com viagem ativa (mesmos estados que assign). |

**Ordem de rotas:** `GET /partner/trips/export` declarado **antes** de `/partner/trips/{trip_id}` para não interpretar `export` como UUID.

## Fase G

| ID | Entrega |
|----|---------|
| **G006** | `docs/RBAC_ENDPOINT_AUDIT.md` — tabela `/partner/*` e referência a admin/outros routers. |
| **G007** | Garantias já no SQL + testes `test_partner_tenant_isolation` (detalhe driver/viagem cross-tenant → 404). |

## Fase H

| ID | Entrega |
|----|---------|
| **H007** | `GET /partner/trips/export` — CSV UTF-8, colunas pedidas, timestamps em UTC (`Z`). |
| **H008** | Logs existentes reutilizados: `partner_org_created`, `partner_driver_assigned` (incl. unassign para default + idempotent assign), `partner_api_access` em todos os handlers partner. |

## Fase I (web-app)

| ID | Entrega |
|----|---------|
| **I006** | Rota `/partner`, `PartnerGate` (JWT `role=partner`), login BETA com separador “Frota”. |
| **I007** | Lista de motoristas (nome, estado, texto de localização). |
| **I008** | Cards de métricas (incl. novos campos). |

Contexto: token em `/partner` usa `tokenPickRole` partner; modo dev sem `tokens.partner` depende de sessão BETA ou extensão futura de `/dev/tokens`.

## Fase J (runner)

| ID | Entrega |
|----|---------|
| **J007** | `session.json`: `partner_id`; `capture_session` nos flows; placeholders `{{session.partner_id}}`, `{{config.assign_driver_user_id}}`; OTP verify com `requested_role` para `admin` / `partner`. |
| **J008** | `flows/full_flow.json` + `python runner.py full_flow`; passo assign omitido se `assign_driver_user_id` vazio no `config.json`. |

## Fase K

| **K007** | `docs/PARTNER_ONBOARDING.md` — criar org, gestor partner, assign/unassign, primeiro uso da API e runner. |

## Testes

- `tests/test_partner_c009_h008.py` — métricas, detalhe, CSV, DELETE unassign.
- `tests/test_partner_tenant_isolation.py` — 404 em detalhe cross-tenant.
- Suíte completa: `pytest` (107 testes na execução local).

## Commits / PR

Entregue em commits temáticos (backend, web-app, tools, docs) e PR único ou por área conforme fluxo do repositório.
