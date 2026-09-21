# REPO LATERAL AUDIT — 2026-09-17

**HEAD (auditoria original):** `48b70a3`  
**Reconciliado com `main`:** `98ed421` (2026-09-21) — docs-only status pass  
**Modo original:** READ-ONLY funcional (excepto este relatório + `scripts/audit/*` AUDIT-ONLY)  
**Working tree no início:** limpa  
**Não feito (na sessão original):** runtime, Render, secrets, DB/schema, migrations, fixes, commit, PR  
**Fora de âmbito (não reaberto como finding novo):** MapLibre 5→6 / `S-MAP-P1`, `ENV=staging` semantics, route-level code splitting, flaky phone UUID, rotacional cache flake, dead Radix stubs, React Router 7.18.4, Python 3.12 pin, `BETA_MODE=true` IN PRODUCTION

Relatórios anteriores cruzados: [`REPO_RUNTIME_HYGIENE_AUDIT_2026-09.md`](./REPO_RUNTIME_HYGIENE_AUDIT_2026-09.md), [`P1_RUNTIME_SECURITY_REVIEW_2026-09.md`](./P1_RUNTIME_SECURITY_REVIEW_2026-09.md).

---

## Executive summary

### Auditoria original (2026-09-17)

Passagem lateral sobre dívida real: webhook Stripe idempotente a mais cedo, dispatch WS antes de `commit`, GPS de frota exposto, testes BD sem isolamento por teste, docs Março perigosas, cron HTTP cego a `partial_error`, etc.

### Estado reconciliado (2026-09-21 @ `98ed421`)

**OPEN P0 = 0 · OPEN P1 = 0** entre os findings originais desta auditoria.

Os findings P0/P1 de runtime/segurança/docs operacionais foram **resolvidos em código/docs** ou **fechados como ACCEPTED DESIGN / ACCEPTED DEBT**. Trabalho restante = **follow-ups** registados + **revalidação P2/P3** (não recontada aqui).

| Tema original | Estado actual |
|---|---|
| Webhook P0 (ACK após falha BD) | **CLOSED** (#606) |
| ACK not-found / amount-mismatch | **CLOSED / ACCEPTED DESIGN** (#634) |
| Cancel vs PI / timeouts | **CLOSED** (#628 / #629) |
| Dispatch WS pré-commit | **CLOSED** (#616) |
| GPS find-driver / debug coords | **CLOSED** (#617) |
| `ADMIN_PHONE` promote / guards | **CLOSED** (#630 / #632) |
| Polling stale / logout trip | **CLOSED** (#618) |
| Cron `partial_error` → 200 | **CLOSED** (#625) |
| Cron `?secret=` / `!=` | **CLOSED** (#627); L-SEC-09 / L-SEC-19 |
| Docs Março “actual” / BD local=Render | **CLOSED** (#636) |
| Cron runbook canónico | **CLOSED** (#626); residual housekeeping noutros docs |
| Isolamento pytest | **CLOSED / ACCEPTED DEBT** (#635) |

### Contagens

#### Original audit (2026-09-17)

| Prioridade | Count | Significado nesta auditoria |
|---|---:|---|
| **P0** | **1** | Perda silenciosa de transição de pagamento (Stripe não retenta) |
| **P1** | **12** | Corrida de dispatch, GPS, cancel vs PI, auth break-glass, FE session/poll, cron 200, testes sujos, docs perigosos |
| **P2** | **30** | Higiene de segurança/ops, god modules, gaps de teste/observabilidade/dados/docs |
| **P3** | **15** | Housekeeping real, sem urgência de piloto |
| **Total** | **58** | Sem cosmético artificial; sem itens da lista de exclusão |

#### Current reconciled state (2026-09-21)

| Métrica | Count |
|---|---:|
| **OPEN P0** (findings originais) | **0** |
| **OPEN P1** (findings originais) | **0** |
| CLOSED (P0/P1 originais) | 11 (+ L-DOC-02 núcleo) |
| CLOSED / ACCEPTED DESIGN | 1 (L-PAY-02) |
| CLOSED / ACCEPTED DEBT | 1 (L-TEST-01) |

**P2/P3:** **não recontados** nesta reconciliação. Explicitamente: **L-SEC-09** e **L-SEC-19** → **CLOSED**; **L-SEC-16** → **CLOSED** (driver upload alinhado a viaturas); **L-DOC-03** parcialmente aliviado (env no índice via L-DOC-01). Restante P2/P3 requer nova revisão.

Follow-ups **não** contam como findings OPEN: `O-PAY-WEBHOOK-ANOMALY`, `R-PAY-ORPHAN-PI`, `O-CRON-TIMEOUT-PARTIAL`, `R-AUTH-SUPERADMIN-BOOTSTRAP`, `T-DB-ISOLATION`, `T-TEST-DB-NAME-GUARD`, `R-DOC-CRON-STALE-EXAMPLES`.

---

## Findings table

| ID | Priority | Area | Finding | Evidence | Risk | Suggested next step |
|---|---|---|---|---|---|---|
| **L-PAY-01** | P0 → **CLOSED** | Payments | ~~Marcador commitado antes do UPDATE; DB error ACK 200.~~ **Mitigado:** um só TX marcador+status; `SQLAlchemyError` → rollback + **500**. | #606; `stripe.py`; `test_stripe_webhook_idempotency_tx.py` | — | Fechado |
| **L-PAY-02** | P1 → **CLOSED / ACCEPTED DESIGN** | Payments / obs | ACK `200` not-found / amount-mismatch intencional (fail-closed + anti-retry). | #634; `stripe.py`; testes L-PAY-02 | Residual race rara not-found | `O-PAY-WEBHOOK-ANOMALY` |
| **L-TRIP-01** | P1 → **CLOSED** | Trips / races | ~~WS publish antes de commit.~~ **Mitigado:** commit trip → offers → `publish_trip_offers`; sleeps fora da write TX. | #616; `trips.py`; `offer_dispatch.py` | — | Fechado |
| **L-GPS-01** | P1 → **CLOSED** | Privacy / BOLA | `POST /matching/find-driver` **REMOVED** | #617 | — | Fechado |
| **L-GPS-02** | P1 → **CLOSED** | Debug / privacy | Owner debug matching = agregados only | #617; `debug_routes.py` | — | Fechado |
| **L-PAY-03** | P1 → **CLOSED** | Payments | ~~Cancel commit se PI cancel falhava.~~ **Mitigado:** fail-closed (502); timeouts #629. | #628 / #629 | PI órfão noutros paths | `R-PAY-ORPHAN-PI` |
| **L-AUTH-01** | P1 → **CLOSED** | Auth | ~~`ADMIN_PHONE` promote + guards phone.~~ Roles DB; admin por staff role. | #630 / #632 | Bootstrap super_admin | `R-AUTH-SUPERADMIN-BOOTSTRAP` |
| **L-FE-01** | P1 → **CLOSED** | Frontend | ~~Poll overlap / stale response.~~ Generation + no overlapping in-flight. | #618; `usePolling.ts` | AbortController opcional | Fechado |
| **L-FE-02** | P1 → **CLOSED** | Frontend / auth | ~~Logout sem limpar active trip.~~ Clear storage + `AUTH_LOGOUT_EVENT`. | #618; `AuthContext` / `ActiveTripContext` | — | Fechado |
| **L-OBS-01** | P1 → **CLOSED** | Cron / ops | ~~HTTP 200 com `partial_error`.~~ Agora HTTP **500**. | #625; `cron.py` | Critério timeout-payment ≠ HTTP | `O-CRON-TIMEOUT-PARTIAL` |
| **L-TEST-01** | P1 → **CLOSED / ACCEPTED DEBT** | Tests | Sem isolamento TX por teste; commits persistem; mitigado uniqueness + CI efémero. | #635; `BACKEND_PYTEST_SAFE.md` | Residual flake | `T-DB-ISOLATION` · `T-TEST-DB-NAME-GUARD` |
| **L-DOC-01** | P1 → **CLOSED** | Docs | Março SUPERSEDED; índice aponta fontes operacionais. | #636 | Histórico preservado | Fechado |
| **L-DOC-02** | P1 → **CLOSED** + housekeeping residual | Docs / cron | Núcleo: runbook canónico + código (#626/#627). Residual: exemplos `?secret=`/15s em `IMPLEMENTACAO_E_TESTES` / A022. | #626 / #627; `CRON_JOB_ORG_INSTRUCOES.md` | Docs secundários stale | `R-DOC-CRON-STALE-EXAMPLES` — **não** reabrir L-DOC-02 |
| **L-SEC-09** | P2 → **CLOSED** | Cron | ~~Query `?secret=` aceite.~~ Header-only. | #627; `cron.py` | — | Fechado |
| **L-SEC-10** | P2 | WebSocket | Token JWT aceite em `?token=` (além de `Authorization`). | `ws.py` `_extract_token` L17–21; `admin_ws.py` equivalente | JWT em logs/histórico de proxy | Preferir header / `Sec-WebSocket-Protocol`; deprecar query |
| **L-SEC-11** | P2 | Rate limit | Limites OTP/login/`request_trip` são **por processo em memória**. Multi-worker multiplica capacidade. OTP *request* ainda chaveia IP via `X-Forwarded-For`. | `auth_rate_limit.py`; `api/rate_limit.py` | Brute-force / spam de trips entre instâncias | Store partilhado; OTP request por telefone (já feito no *verify*) |
| **L-SEC-12** | P2 | OTP | Verify sem `FOR UPDATE`; 12 tentativas/min/telefone; 6 dígitos / 5 min — não é brute-force trivial, mas não há lockout/queima. Frontend **não** chama OTP (API viva). | `auth.py` L130–156; `otp.py`; knip/grep FE sem `requestOtp` | Consume duplo; superfície latente quando houver SMS | Lock da row; queimar após N falhas; não expor se o produto é password |
| **L-SEC-13** | P2 | Sessions | Change password não invalida JWTs existentes (TTL ~60 min, sem denylist/`jti`). | `auth.py` `change_my_password`; `security.py` | Token roubado sobrevive à troca de password | `token_version` ou TTL curto + refresh |
| **L-SEC-14** | P2 | SQL | Listagens sem paginação: partner trips, admin partners/drivers/pending, matching full table, redispatch N+1. | `partner_queries.py` L50–68; `admin.py` L470–472, L592, L608 | DoS memória/CPU em admin/partner | Caps + paginação; SQL agg no redispatch |
| **L-SEC-15** | P2 | TX | `log_interaction` faz `db.commit()` na Session do pedido. | `interaction_logging.py` L25–45 | Commit de estado sujo alheio / rollback confuso | Session própria ou nested; nunca commit da session do caller |
| **L-SEC-16** | P2 → **CLOSED** | Uploads | ~~Upload driver sem allowlist MIME/ext.~~ **Mitigado:** mesma política que viaturas (`.pdf/.jpg/.jpeg/.png` + MIME); download com Content-Type allowlist + `attachment`. Legacy fora da allowlist: **não** apagado; leitura com `application/octet-stream`. | #638; `driver_document_upload.py`; `test_driver_document_upload_allowlist.py` | — | Fechado |
| **L-SEC-17** | P2 | OTP | OTP é hasheado e persistido; **não há SMS/email**. `print` só com `ENABLE_DEV_TOOLS`. API pública ainda existe. | `auth.py` `request_otp` L113–127 | Path morto, ou códigos só via logs/DB | Desmontar OTP em deployed, ou ligar canal real com rate limit |
| **L-ARCH-01** | P2 | Architecture | God modules: `DriverDashboard.tsx` **4412** linhas; `admin.py` **2269**; `trips.py` **2142**; `PassengerDashboard.tsx` **1591**; `partner.py` **1503**. | `scripts/audit/scan_repo_health.py` | Regressões, reviews impossíveis | Split por domínio (map/offers/availability; admin tabs já existem no FE mas o router BE não) |
| **L-FE-03** | P2 | Auth restore | Restore prefere `tvde_app_route_role` gravado sobre o role do JWT (`savedShell ?? fromJwt`). | `AuthContext.tsx` L268–273 | Bounce `/driver` → guard → `/passenger` | Preferir JWT quando conflitua |
| **L-FE-04** | P2 | Tokens | Upload/download partner usam só `getStoredAccessToken()`, não `tokenGetter`. Em BETA login grava LS; falha em multi-token/dev sem write. | `api/partner.ts` L352–383; `AuthContext.tsx` L333–341 (E2E-only extra write) | 401 / JWT errado em troca de shell | Passar `token` como `apiFetch` |
| **L-FE-05** | P2 | UX state | Cada poll põe `isLoading=true` mesmo em refresh (`isRefreshing` existe mas `isLoading` fica ruidoso). | `usePolling.ts` L46–63 | Flicker / impossível distinguir 1.º load | `isLoading` só quando `dataRef.current === null` |
| **L-FE-06** | P2 | Auth | `validateAccessToken` devolve `true` em rede/timeout/5xx. | `api/session.ts` L16–22 | “Logado” com sessão nunca provada | UI “offline, sessão não verificada” vs 401 hard |
| **L-FE-07** | P2 | Perf | Após code-splitting de rotas: Stripe ainda eager no chunk passenger; AdminDashboard importa **11 tabs** estáticas. | `PassengerPaymentConfirmCard.tsx` L4–10; `AdminDashboard.tsx` L46–56 | TTI admin/passenger | `React.lazy` no card de pagamento e por tab |
| **L-FE-08** | P2 | Frontend | `DriverDashboard.tsx` concentra mapa, ofertas, availability, docs, zonas, admin link. | 4412 linhas | Rerenders + bugs acoplados | Hooks/componentes por superfície |
| **L-FE-09** | P2 | Deep-link | Hub partner: menu só em estado React; refresh volta a `root`. Só driver/trip detail têm URL. | `partnerWorkspace` / rotas partner | Não partilhar frota/veículos/inbox | `?menu=` ou path segments |
| **L-OBS-02** | P2 | Health | `/health` faz ping à BD; `/` é LB ok; **não há `/readiness`**, mas Sentry filtra `/readiness`. | `health.py`; `sentry.py` L49 | Contrato live vs ready ambíguo | Separar live/ready ou remover o filtro morto |
| **L-OBS-03** | P2 | Silent fail | OSRM `None`, publish WS e persist de audit: warn/exception e continua. | `osrm.py`; `events/dispatcher.py`; hubs | Preço silencioso; clientes sem WS | Contador/alerta; sinal no health admin |
| **L-OBS-04** | P2 | Sentry | traces/profiles 0; FE e BE DSNs separados; `request_id` não entra no Sentry FE. | `backend/app/sentry.py`; `web-app/src/sentry.ts` | Incidentes browser↔API sem join | Propagar `X-Request-ID` no contexto FE |
| **L-TEST-02** | P2 | Tests | Vários testes de corrida usam `time.sleep` real (0.1–1.0s). | `test_geo_stability.py`, `test_trip_timeout_*`, `test_admin_cancel_complete_race.py`, `test_partner_disable_blocks_accept.py` | Flake sob load CI | Relógios/barreiras; mark `slow` |
| **L-TEST-03** | P2 | CI vs prod | E2E CI força `ENABLE_VEHICLE_CAPACITY_GATES=true`; default código/prod é `false`. Offer TTL também especial (`E2E_KEEP_OFFERS_ALIVE`). | `.github/workflows/web-e2e.yml`; `config.py` | CI valida um perfil que prod não corre | Matriz gates off+on, ou rotular o job |
| **L-TEST-04** | P2 | E2E | Playwright `workers:1` e `e2e-api` depende de `e2e-ui` por rate-limit acumulado. | `playwright.config.ts` L14–16, L43–56 | `playwright test path` local quebra | Documentar ordem obrigatória; reset de rate-limit entre projects |
| **L-TEST-05** | P2 | Tests | WS “coverage” = hub + MockWS; rotas reais `/ws/trips/{id}` (auth 1008) sem TestClient. | `test_websocket_updates.py` vs `ws.py` | Regressão de auth WS | Um teste ASGI unauthorized + authorized |
| **L-TEST-06** | P2 | Tests | Cron tests exigem HTTP 200 + `status=="ok"`; não cobrem `partial_error`. | `test_a026_cron_ops.py` | Monitor “verde” com job morto | Monkeypatch de sub-job → `partial_error` |
| **L-DATA-01** | P2 | Persistence | `partner_messages` / reads: **sem FK** (modelo = migration). | `partner_message.py`; alembic `d5e6f7a8b9c0` | Órfãos; deletes deixam lixo | Tracking de órfãos; FKs numa migration futura (não nesta sessão) |
| **L-DATA-02** | P2 | Money | Colunas `Numeric(10,2)` mapeadas `Mapped[float]`; muita conta com `float(...)`. Guards de cêntimos existem no webhook. | `payment.py`, `trip.py` | Drift de cêntimos em paths novos | Não acrescentar fare math em float; alinhar a Decimal |
| **L-DATA-03** | P2 | Cascade | `Payment.trip_id` `ON DELETE CASCADE`. | `payment.py` L44–48 | Hard-delete de trip apaga histórico financeiro | Política: nunca hard-delete trips |
| **L-DATA-04** | P2 | Schema drift | `driver_amount` legado + `driver_payout` nullable; `vehicle_category` ainda admite `'pet'` vs `has_pet`. Statuses de viatura/docs em string livre. | `payment.py` L60–68; `trip.py` comments; `vehicle.py` | Relatórios no campo errado; matching em rows velhas | Inventário SQL; um módulo canónico de enums |
| **L-DOC-03** | P2 | Docs | Drift residual (STACK, GUIA Python, ENV_VARS gaps, etc.). Índice já inclui `docs/env/` (L-DOC-01). | vários paths | Setup/ops errados | Resync pontual; **parcialmente aliviado** |
| **L-SEC-19** | P3 → **CLOSED** | Cron | ~~Secret `!=`.~~ **`hmac.compare_digest`**. | #627; `cron.py` | — | Fechado |
| **L-SEC-20** | P3 | Emergency | Record falha → `{ok:true, recorded:false}`. | `emergency.py` L53–67 | SOS sem rasto | Métrica; não esconder 5xx a ops |
| **L-SEC-21** | P3 | Logs | `POST /logs/lifecycle` auth opcional; anónimo escreve `interaction_logs`. | `logs.py` L17–41 | Preenchimento barato da BD | Auth obrigatória ou rate-limit |
| **L-SEC-22** | P3 | Info | `/health?diagnostic=1` expõe `dev_tools`/`beta_mode`. | `health.py` L48–52 | Recon menor | Gate diagnostic a staff |
| **L-FE-10** | P3 | Frontend | Geocode passenger: flag `cancelled` sem abort do fetch. | `PassengerDashboard.tsx` geocode effects | Bandwidth; risco se alguém esquecer a flag | `AbortSignal` nos helpers |
| **L-FE-11** | P3 | Flags | `isDriverHomeTwoStepEnabled()` **sempre false** mas ainda ramificado no DriverDashboard. `isDriverGeoOnFirstMapTapEnabled()` sempre true (“legado”). | `driverHomeFeatures.ts`; `DriverDashboard.tsx` | Abstracção abandonada | Apagar branches ou remote config real |
| **L-FE-12** | P3 | Compliance UI | Gate de docs do driver é **opt-in localStorage** (`tvde_driver_documents_gate_enabled=1`). | `services/driverDocuments.ts` L113–123 | Enforcement no cliente facilmente desligado | Gate server-driven (as flags PF3D já existem no BE) |
| **L-FE-13** | P3 | Auth | `LS_REFRESH_TOKEN` só é apagada; nunca lida/rodada. | `authStorage.ts` | Falsa sensação de refresh | Remover a key |
| **L-FE-14** | P3 | Latent | Fora de BETA, `isAdmin = !!tokens?.admin`. Restore BETA mete `admin: tok` em todos. **Não é o caminho prod actual.** | `AuthContext.tsx` L533, L275–279 | Admin UI se `BETA_MODE=false` sem outro trabalho | Gate `isBackofficeStaffRole(sessionRole)` — só quando se tratar BETA |
| **L-TEST-07** | P3 | Tests | `locale-en-smoke.spec.ts` existe e **não** está nos `testMatch` dos projects. | `playwright.config.ts` vs spec | EN só se alguém correr o ficheiro | Project nightly ou tirar do inventário “activo” |
| **L-TEST-08** | P3 | CI | `backend-ci.yml` pytest `ENV: dev` mas `conftest` força `ENV=test`. mypy só `stripe.py` + `sentry.py`. | workflows + `conftest.py` L8 | Debug com env mentiroso | Alinhar YAML; alargar mypy a payments/trips/cron |
| **L-DATA-05** | P3 | Data | `vehicles.max_passengers` nullable; gates de capacidade (quando ON) excluem NULL. | `vehicle.py`; `ENABLE_VEHICLE_CAPACITY_GATES` | Frota invisível se a flag ligar | Audit de NULLs **antes** de qualquer ON em prod |
| **L-DATA-06** | P3 | Indexes | Timeout/health filtram `status` + `updated_at`; índices são single-column. | `trip.py` Index list; `trip_timeouts.py` | Cron mais lento com tabela grande | EXPLAIN; índice composto só se o plano o pedir |
| **L-DEAD-01** | P3 | Dead code | knip: `src/dev/simulateRoute.ts` + `testRoutes.ts` sem callers (já assinalados na higiene; **ainda lá**). Exports mortos/deprecated (labels, presets, `AMBIANCE_OPTIONS`). | knip 2026-09-17 | Ruído | Apagar os dois ficheiros `dev/` num PR de higiene |
| **L-DEP-01** | P3 | Deps | `npm audit --omit=dev`: 5 vulns — **1 critical = MapLibre (excluído / `S-MAP-P1`)**. High residual: `nanoid`, `postcss` (+ parser) no grafo prod. Full audit (com dev): 17 (vite/playwright/undici/js-yaml/… sobretudo toolchain). | `npm audit` nesta sessão | Dev-server/build mais do que SPA prod, excepto MapLibre | Não upgrade nesta sessão; próximo: postcss/nanoid patch se sem breaking |

---

## P0/P1 detail

### L-PAY-01 — webhook idempotente demais — **CLOSED (mitigado)**

**Estado actual (pós-hardening):** insert do marcador `StripeWebhookEvent` + UPDATE de `Payment.status` partilham **uma transação**. Em `SQLAlchemyError`: `rollback` + HTTP **500** + `stripe_webhook_db_error_nack` para o Stripe retentar. Cobertura em `test_stripe_webhook_idempotency_tx.py` (mid-flight failure + retry).

*(Texto original da auditoria descrevia ACK 200 após falha de BD — **stale**; já não aplica.)*

### L-PAY-02 — ACK 200 em not-found / mismatch — **CLOSED / ACCEPTED DESIGN**

Decisão de produto (2026-09-19): **KEEP ACK 200** para ambos; **não** mudar HTTP semantics nesta fase.

| Caso | HTTP | Marker | Payment | Intenção |
|------|------|--------|---------|----------|
| Amount mismatch | 200 | sim | fica `processing` (nunca `succeeded`) | Fail-closed; evita poison-retry |
| Payment not found | 200 | **não** | n/a | Anti-retry em PI órfão permanente |

**Risco residual documentado:** evento legítimo *transitório* (race create row vs webhook) pode perder retry Stripe. No fluxo normal o Payment é criado no accept **antes** do capture, portanto a race é considerada **rara**. Blanket 5xx em not-found criaria retry storm em órfãos permanentes.

**Ops:** follow-up `O-PAY-WEBHOOK-ANOMALY` — alerta/runbook para `stripe_webhook_payment_not_found_ack` e `stripe_webhook_succeeded_amount_mismatch` (ver [`O_STRIPE_1_RUNBOOK.md`](../ops/O_STRIPE_1_RUNBOOK.md) § webhook anomalies). Reconciliação admin já existe quando há Payment local.

### L-TRIP-01 — ofertas na WS antes de serem duráveis — **CLOSED** (#616)

**Mitigado:** `create_trip` faz `db.commit()` da trip **antes** do loop de ofertas / sleeps; `publish_trip_offers` só após commit das offers. Comentários L-TRIP-01 em `trips.py` / `offer_dispatch.py`.

*(Texto original descrevia flush+WS pré-commit e TX aberta ~10s — **stale**.)*

### L-GPS-01 / L-GPS-02 — frota visível — **CLOSED** (#617)

`POST /matching/find-driver` **removido**; `GET /debug/trip-matching/{id}` — owner = agregados/`root_cause` only.

### L-PAY-03 / L-AUTH-01 / L-FE-01 / L-FE-02 / L-OBS-01 / L-DOC-02 — **CLOSED**

| ID | PR | Nota residual |
|----|-----|---------------|
| L-PAY-03 | #628 (+ #629) | `R-PAY-ORPHAN-PI` |
| L-AUTH-01 | #630 / #632 | `R-AUTH-SUPERADMIN-BOOTSTRAP` |
| L-FE-01 | #618 | generation / no overlap; AbortController opcional |
| L-FE-02 | #618 | storage + `AUTH_LOGOUT_EVENT` |
| L-OBS-01 | #625 | `O-CRON-TIMEOUT-PARTIAL` (outro critério) |
| L-DOC-02 | #626 / #627 | núcleo OK; `R-DOC-CRON-STALE-EXAMPLES` |

- Pytest / **L-TEST-01**: **CLOSED / ACCEPTED DEBT** (#635).
- Docs Março / **L-DOC-01**: **CLOSED** (#636).

### L-TEST-01 — isolamento BD de testes — **CLOSED / ACCEPTED DEBT**

Decisão: **não** implementar agora fixture transaccional global.

| Facto auditado | Nota |
|----------------|------|
| Sem truncate/rollback por teste | `db` fixture = `close()` only |
| Commits persistem na suite | Inclui handlers via `get_db()` (sessão distinta) |
| CI | Postgres **efémero por job**; pytest **serial** (sem xdist) |
| Mitigações | `unique_test_phone`, plates UUID, workarounds (`_isolate_drivers`), `run_full_baseline_reset` |
| Risco | **REAL** mas **mitigado**; CI limpo ≠ isolamento por teste |

**Target médio prazo (`T-DB-ISOLATION`):** outer TX por teste + override `get_db` + mesma connection; markers para baseline/reset. **Não** truncate/recreate como 1.ª opção.

**Safety separado (`T-TEST-DB-NAME-GUARD`):** guard actual só bloqueia hosts remotos; ainda permite outra DB **local** errada.

---

## P2 detail

**Segurança:** limites in-process, secret/token em query string, JWT após password change, listas sem cap, `log_interaction` a fazer commit na session do request, upload driver sem allowlist, OTP API sem canal de entrega.

**Arquitectura:** os cinco ficheiros >1500 linhas são o custo real de evolução (não “lines of code vanity”). `trips.py` mistura create/cancel/accept/complete/Stripe. `complete_trip` continua um procedimento enorme com lock `FOR UPDATE` (positivo: locks nas transições críticas *existem*).

**Frontend:** restore de shell, partner FormData, loading flicker, validate-on-network, Stripe/admin tabs eager (code-splitting de *rotas* já feito — isto é o resto), partner sem URL.

**Testes:** sleeps, perfil CI ≠ prod (capacity gates), E2E ordenado, WS sem HTTP upgrade, cron sem caso de erro.

**Dados:** FKs em falta nas mensagens partner; float vs Numeric; CASCADE de payments; colunas/enums duplicados.

**Obs:** health vs readiness; falhas OSRM/WS suaves; Sentry sem correlação FE.

**Docs:** ver L-DOC-03.

---

## P3 / housekeeping

SOS `recorded:false`, lifecycle logs anónimos, `/health?diagnostic=1`, geocode sem abort, flags driver mortas, gate de docs no localStorage, `refresh_token` morto, `isAdmin` latente fora de BETA, locale-en fora do Playwright, mypy estreito, `max_passengers` NULL, índice composto, `simulateRoute.ts`/`testRoutes.ts` (higiene ainda aberta), nanoid/postcss no `npm audit --omit=dev`. *(Cron secret compare / query auth: CLOSED via L-SEC-09/19.)*

Admin UI **não** está CSS-hidden para passengers quando `isAdmin` é falso: tabs `tab === 'x' &&`. O risco é `isAdmin` errado (L-FE-14), não “mounted but hidden”.

---

## Test quality findings

| Tema | Estado |
|------|--------|
| Isolamento BD | **ACCEPTED DEBT** (L-TEST-01 closed) — residual mitigado; `T-DB-ISOLATION` |
| Corridas | sleeps reais (L-TEST-02) |
| CI ≠ default prod | capacity gates ON só no E2E (L-TEST-03) |
| Ordem E2E | intencional e frágil (L-TEST-04) |
| WS HTTP | não coberto (L-TEST-05) |
| Cron failure | não coberto (L-TEST-06) |
| Mocks FE | Vitest pesado em tabs admin/driver — contrato API pode driftar em verde |
| Locale EN | spec órfã (L-TEST-07) |
| pytest ENV YAML | `ENV: dev` mentiroso (L-TEST-08) |
| Guard remoto | **Sólido** (`test_db_guard`) |
| Retries Playwright | `retries: 0` — **não** mascaram flakes (bom) |
| Cobertura crítica | create/accept/complete/cancel + partner isolation + Stripe happy-path **fortes**; mismatch/not-found ACK e webhook DB error **fracos** |

Não foi corrida a suite completa nesta sessão (auditoria de código + smells). Selective: scanner de `time.sleep` + leitura de `conftest` / Playwright / workflows.

---

## Dependency findings

### npm (`web-app`)

| Âmbito | Resultado 2026-09-17 |
|--------|----------------------|
| Full `npm audit` | **17** (3 low, 3 moderate, 9 high, 2 critical) |
| `--omit=dev` | **5** (1 low, 1 moderate, 2 high, 1 critical) |
| Critical prod | **maplibre-gl ≤6.4.0** — **não é finding novo** (`S-MAP-P1`, upgrade bloqueado) |
| High prod residual | `nanoid`, `postcss` (+ `postcss-selector-parser`) — sobretudo build/CSS, não vector de API |
| High dev | `vite` 7.0–7.3.3 (dev server path traversal), Playwright SSL, undici, js-yaml, brace-expansion, browserslist, esbuild Windows… |
| React Router | **7.18.4** — não reaberto |
| knip | 2 unused files (`simulateRoute.ts`, `testRoutes.ts`); ~90 unused exports (maioria tipos/deprecated/barrels — **não** apagar em massa) |
| depcheck | `autoprefixer` + `postcss` “unused” — **falso positivo** (pipeline Tailwind) |

**Sem upgrades nesta sessão.**

### Python

| Ferramenta | Resultado |
|------------|-----------|
| `pip-audit` local | **Não concluiu** (timeout/rede OSV, mesmo padrão da higiene 2026-09); processo abortado ~70s |
| CI | `backend-ci.yml` corre `pip-audit -r requirements.txt --ignore-vuln PYSEC-2025-183` |
| Pins conhecidos | FastAPI `<0.136.3` (MAL-2026-4750), Python 3.12 (excluído), `requests>=2.33.0` |

Não inventar CVEs Python sem output do audit.

---

## Docs drift

| Doc | Drift | Gravidade |
|-----|--------|-----------|
| `ARCHITECTURE_STATUS.md` + blueprint 2026-03-12 | Matching/dispatch/UI; **BD local = prod** (texto histórico) | **CLOSED** (L-DOC-01) — SUPERSEDED + índice corrigido |
| `CRON_JOB_ORG_INSTRUCOES.md` | ~~Query secret; 15s; jobs incompletos.~~ **CLOSED** (L-DOC-02 / #626) | Housekeeping: exemplos stale noutros docs |
| `DOCS_INDEX.md` | ~~Omite `docs/env/`.~~ Env + pytest safe + architecture README adicionados (L-DOC-01); smokes Julho ainda listados sob ops | P2 residual |
| `ENV_VARS_VERIFICATION.md` | Sem HERE, capacity/vehicle gates, driving hours, rotacional v3, next-trip | P2 |
| `GUIA_TESTES.md` | Python 3.10+ / Node 18+ vs CI 3.12.14 / Node 22 | P2 |
| `STACK_TECNOLOGICO.md` | Sem Sentry, HERE, OSRM, Playwright, Alembic, Postgres 15 | P2 |
| `O_STRIPE_1_RUNBOOK.md` | Alembic head `b5c6d7e8f9a0` vs **`d2e3f4a5b6c7`** | P2 |
| `TODO_FUTURO.md` B.2 | `log_event` **já** injecta `request_id` | P2 |
| `config.py` L103–104 | HERE “no create/complete wire yet” vs Portagens V1 wired | P2 |
| `TODOdoDIA.md` | Painéis pré-férias / Julho misturados com Portagens V1 — operacional, não mentira técnica | — |

Não reescrito nada disto além deste relatório.

---

## Audit-only tools created

| Path | Papel | Destino |
|------|--------|---------|
| `scripts/audit/README.md` | Marca AUDIT-ONLY | **KEEP** enquanto o script existir |
| `scripts/audit/scan_repo_health.py` | Inventário: ficheiros grandes, `time.sleep` em testes, TODO, `.all()` heurístico | **KEEP** (reexecutável; **não** ligar ao CI/`package.json` sem pedido) |
| `scripts/audit/out/` | Previsto para npm/knip JSON; **não chegou a ser gravado** (corrida em paralelo) | **N/A** / **DELETE** se aparecer |

**Não** foram adicionados scripts permanentes em `package.json`.  
knip / depcheck / npm audit corridos via `npx` one-shot.

### KEEP vs DELETE vs CONVERT

| Item | Veredicto |
|------|-----------|
| `scan_repo_health.py` + README | **KEEP** |
| Integrar knip/depcheck no CI | **CONVERT TO TOOLING** só se Frank pedir (custo de ruído de unused exports) |
| Outputs `scripts/audit/out/*` | **DELETE** |
| Este relatório | **KEEP** |

---

## Things explicitly NOT changed

- Runtime da API / web-app / site
- Render (serviços, env, cron, deploys)
- Secrets, `.env`, templates com valores
- Base de dados, schema, Alembic
- Comportamento funcional, UX, feature flags
- Upgrades de dependências
- Fixes dos findings
- Commit / branch / PR
- `BETA_MODE` em produção (não iniciado)
- MapLibre / React Router / Python pin / ENV staging / code splitting / Radix / phones / rotacional flake

---

## Suggested PR sequence

Sequência original da auditoria — **toda DONE** em `main` (não é trabalho futuro):

| # | Branch | Scope | IDs | Estado |
|---|--------|-------|-----|--------|
| 1 | `fix/stripe-webhook-idempotency-tx` | TX marcador+status; 5xx BD | L-PAY-01 (+ aceitação L-PAY-02) | **DONE** #606 / #634 |
| 2 | `fix/create-trip-commit-before-ws` | Commit antes de WS; sleep fora TX | L-TRIP-01 | **DONE** #616 |
| 3 | `fix/matching-gps-lockdown` | Remover find-driver; owner aggregate | L-GPS-01, L-GPS-02 | **DONE** #617 |
| 4 | `fix/fe-polling-logout-state` | Poll generation; clear trip on logout | L-FE-01, L-FE-02 | **DONE** #618 |
| 5 | cron partial / auth / runbook | HTTP 500 partial; header-only; runbook | L-OBS-01, L-DOC-02, L-SEC-09, L-SEC-19 | **DONE** #625 / #626 / #627 |

**Trabalho restante (follow-ups / P2–P3):** ver executive summary reconciliado — **não** reabrir P0/P1 CLOSED.

---

## Explicitly not counted (contexto)

| Tema | Notas |
|------|--------|
| MapLibre GHSA / `S-MAP-P1` | Critical no `npm audit --omit=dev`; upgrade bloqueado |
| React Router 7.18.4 | Fechado |
| Python 3.12 pin | Fechado |
| `ENV=staging` semantics | Fechado; staging validado |
| Route-level code splitting | Fechado; L-FE-07 é *resto* (Stripe/tabs), não o mesmo finding |
| Radix/dead UI stubs | Já limpos (BottomActionStack / requestOtp wrappers **ausentes**) |
| Phone UUID flake / rotacional cache flake | Não reabertos |
| `BETA_MODE=true` em produção | Fora de âmbito; L-FE-14 só como latente |

---

*Auditoria original: 2026-09-17 sem commit de fixes. Status reconciliado com `main` `98ed421` em 2026-09-21 (docs-only).*
