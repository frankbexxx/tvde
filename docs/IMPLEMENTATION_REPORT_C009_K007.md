# Relatório de implementação C009 → K007

## Resumo

Evolução do sistema **partner** para piloto: métricas e detalhes tenant-safe, atribuição/desatribuição de motoristas, export CSV, auditoria RBAC documentada, UI mínima `/partner`, runner com `partner_id` em sessão e `full_flow`, onboarding em Markdown.

## Fase C (backend)

| ID       | Entrega                                                                                                | Notas                                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **C009** | `GET /partner/metrics` com `trips_completed`, `trips_cancelled`, `total_drivers`                       | Contagens com `Trip` JOIN `Driver` e `Driver.partner_id == tenant`; dia “hoje” continua em UTC via `get_today_range_utc`. |
| **C010** | `GET /partner/drivers/{driver_user_id}`                                                                | `get_driver_for_partner`; 404 fora do tenant.                                                                             |
| **C011** | `GET /partner/trips/{trip_id}`                                                                         | `get_trip_for_partner` com JOIN obrigatório ao motorista da frota.                                                        |
| **C012** | `POST` assign (idempotente + log se já na frota); `DELETE .../assign-partner` → `DEFAULT_PARTNER_UUID` | 409 com viagem ativa (mesmos estados que assign).                                                                         |

**Ordem de rotas:** `GET /partner/trips/export` declarado **antes** de `/partner/trips/{trip_id}` para não interpretar `export` como UUID.

## Fase G

| ID       | Entrega                                                                                                  |
| -------- | -------------------------------------------------------------------------------------------------------- |
| **G006** | `docs/RBAC_ENDPOINT_AUDIT.md` — tabela `/partner/*` e referência a admin/outros routers.                 |
| **G007** | Garantias já no SQL + testes `test_partner_tenant_isolation` (detalhe driver/viagem cross-tenant → 404). |

## Fase H

| ID       | Entrega                                                                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **H007** | `GET /partner/trips/export` — CSV UTF-8, colunas pedidas, timestamps em UTC (`Z`).                                                                                                   |
| **H008** | Logs existentes reutilizados: `partner_org_created`, `partner_driver_assigned` (incl. unassign para default + idempotent assign), `partner_api_access` em todos os handlers partner. |

## Fase I (web-app)

| ID       | Entrega                                                                                |
| -------- | -------------------------------------------------------------------------------------- |
| **I006** | Rota `/partner`, `PartnerGate` (JWT `role=partner`), login BETA com separador “Frota”. |
| **I007** | Lista de motoristas (nome, estado, texto de localização).                              |
| **I008** | Cards de métricas (incl. novos campos).                                                |

Contexto: token em `/partner` usa `tokenPickRole` partner; modo dev sem `tokens.partner` depende de sessão BETA ou extensão futura de `/dev/tokens`.

## Fase J (runner)

| ID       | Entrega                                                                                                                                                                                         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **J007** | `session.json`: `partner_id`; `capture_session` nos flows; placeholders `{{session.partner_id}}`, `{{config.assign_driver_user_id}}`; OTP verify com `requested_role` para `admin` / `partner`. |
| **J008** | `flows/full_flow.json` + `python runner.py full_flow`; passo assign omitido se `assign_driver_user_id` vazio no `config.json`.                                                                  |

## Fase K

| **K007** | `docs/PARTNER_ONBOARDING.md` — criar org, gestor partner, assign/unassign, primeiro uso da API e runner. |

## Testes

- `tests/test_partner_c009_h008.py` — métricas, detalhe, CSV, DELETE unassign.
- `tests/test_partner_tenant_isolation.py` — 404 em detalhe cross-tenant.
- Suíte completa: `pytest` (107 testes na execução local).

## Commits / PR

Entregue em commits temáticos (backend, web-app, tools, docs) e PR único ou por área conforme fluxo do repositório.

---

## Revisão alinhada (estado real + feedback externo)

Leitura conjunta: **o que o repo entrega** + **revisão tipo ChatGPT** (comentário, sem alterar código nesta secção).

### Nível global

- **Backend:** coerente com multi-tenant; JOIN Trip → Driver → `partner_id` nos fluxos partner; **404 cross-tenant** nos detalhes — evita a classe de bugs mais grave neste tipo de produto.
- **RBAC:** separação **admin vs partner** sem “esticar” endpoints antigos; **sem fugas óbvias** nos caminhos partner auditados e testados.
- **Fluxo partner:** utilizável para **piloto comercial** (API + UI mínima + export + onboarding).
- **Runner:** `session.json`, flows, `full_flow`, captura de `partner_id` — **multiplicador de velocidade** (não é só “toy”).
- **Detalhe sénior:** ordem `/trips/export` antes de `/trips/{trip_id}` — evita bug silencioso com `export` como UUID.

**Conclusão:** não é apenas MVP; é **sistema operacional inicial**. Os próximos riscos dominantes são **crescimento / complexidade** e **integração** (ex.: Render), não falhas óbvias de arquitectura nas áreas entregues.

### O que está muito bem (checklist)

- [x] Consistência de tenant (JOIN + 404 cross-tenant)
- [x] Separação admin vs partner (responsabilidades claras)
- [x] Runner com sessão e flows
- [x] Ordem de rotas export vs `{id}`

### Atenções futuras (“cheiro”, não bug)

| Tema            | Situação hoje                                                                           | Direcção recomendada                                                                                                                              |
| --------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Logs**        | Eventos `log_event` úteis, formato legível                                              | Ainda não são **sistema** de rastreio (correlação, retention, pesquisa). Mais tarde: normalizar ou perder rastreabilidade operacional.            |
| **Runner**      | Melhor com `partner_id` automático; assign pode precisar `assign_driver_user_id` manual | Próximo salto: **auto-discovery** (API admin list ou seed/BD) para menos config estática.                                                         |
| **UI Partner**  | Mínima e correcta                                                                       | Evitar **duplicar regras de negócio** no React; manter validação/autorização no backend.                                                          |
| **OTP / roles** | Comportamento especial (admin phone, promoção partner, BETA)                            | Único ponto **estruturalmente sensível**: lógica implícita e possível mutação no login. Documentar e testar; endurecer em produção se necessário. |

### Deploy (Render)

Se algo falhar após redeploy, **assumir primeiro** detalhe de integração (env, `VITE_API_URL`, CORS, cold start), **não** redesenho de arquitectura — desde que health/config respondam e o frontend aponte para a API certa.

---

## TODO consolidada (o que já temos vs o que falta)

### Feito (não reabrir sem novo scope)

- [x] C009–C012 (métricas estendidas, detalhe driver/viagem, assign/unassign, CSV)
- [x] G006/G007 no âmbito **partner + testes de isolamento** + doc `RBAC_ENDPOINT_AUDIT.md`
- [x] H007–H008 (export + logs partner)
- [x] I006–I008 (shell `/partner`, drivers, métricas)
- [x] J007–J008 (runner sessão, templates, `full_flow`)
- [x] K007 + este relatório + `PARTNER_ONBOARDING.md`
- [x] Pós-merge: `AuthContext` (`isPartnerUser` por identidade de sessão), `frontend-ci`, `docs/GIT_COMMIT_PR.md`

### Parcial / melhoria contínua (opcional, por prioridade)

- [ ] **G006 alargado:** tabela **exaustiva** de todos os endpoints (OpenAPI ou inventário gerado), não só `/partner/*` + notas — _baixa urgência_ se não há requisito compliance explícito.
- [ ] **G007 alargado:** auditoria formal de **todas** as queries Trip/Driver fora do âmbito partner — _baixa urgência_ enquanto não houver novos superfícies sem tenant.
- [ ] **Observabilidade:** evoluir logs para pipeline pesquisável / correlacionável.
- [ ] **Runner:** descoberta automática de `driver_user_id` (ou fixture de teste documentada).
- [ ] **E2E:** fluxo mínimo partner no Playwright (além dos testes unitários/API).
- [ ] **Dev tokens:** incluir `partner` em `/dev/tokens` se quiseres paridade total sem só BETA.

### Risco a monitorizar (único “pode morder” destacado na revisão)

- [ ] **OTP + roles:** revisão periódica de testes e documentação; evitar surpresas em produção (quem ganha que papel e quando).

---

_Última actualização desta secção: alinhamento com revisão externa + checklist do assistente (Cursor)._
