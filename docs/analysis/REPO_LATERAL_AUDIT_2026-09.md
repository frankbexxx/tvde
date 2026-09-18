# REPO LATERAL AUDIT — 2026-09-17

**HEAD:** `48b70a3` (`main` = `origin/main`)  
**Modo:** READ-ONLY funcional (excepto este relatório + `scripts/audit/*` AUDIT-ONLY)  
**Working tree no início:** limpa  
**Não feito:** runtime, Render, secrets, DB/schema, migrations, fixes, commit, PR  
**Fora de âmbito (não reaberto como finding novo):** MapLibre 5→6 / `S-MAP-P1`, `ENV=staging` semantics, route-level code splitting, flaky phone UUID, rotacional cache flake, dead Radix stubs, React Router 7.18.4, Python 3.12 pin, `BETA_MODE=true` IN PRODUCTION

Relatórios anteriores cruzados: [`REPO_RUNTIME_HYGIENE_AUDIT_2026-09.md`](./REPO_RUNTIME_HYGIENE_AUDIT_2026-09.md), [`P1_RUNTIME_SECURITY_REVIEW_2026-09.md`](./P1_RUNTIME_SECURITY_REVIEW_2026-09.md).

---

## Executive summary

O repo está **operacionalmente estável** e a higiene recente tapou muita superfície cosmética. Esta passagem lateral encontrou **dívida real** que as auditorias de higiene/deps não cobriram: sobretudo **pagamentos (webhook idempotente a mais cedo)**, **dispatch que publica ofertas antes de `commit`**, **GPS de frota exposto num endpoint MVP ainda montado**, e **testes backend que escrevem numa Postgres partilhada sem teardown**.

Não há P0 de “a app está caída”. Há **um P0 de integridade de pagamento**: se o UPDATE do `Payment` falhar *depois* do marcador Stripe ser persistido, a API responde `200` e o Stripe **não volta a tentar**.

O frontend, em `BETA_MODE` actual, usa o papel do JWT para admin. Os riscos FE vivos hoje são **polling sem abort** e **logout que não limpa o trip id em `sessionStorage`**. O gate `isAdmin = !!tokens.admin` só dispara se `BETA_MODE` for desligado — fica registado como latente, sem abrir esse trabalho.

Docs de arquitectura de Março 2026 ainda estão no índice e descrevem um mundo (auto-dispatch, pool `assigned`+`driver_id=NULL`, “BD local = Render”) que **já não é o código**.

### Contagens

| Prioridade | Count | Significado nesta auditoria |
|---|---:|---|
| **P0** | **1** | Perda silenciosa de transição de pagamento (Stripe não retenta) |
| **P1** | **12** | Corrida de dispatch, GPS, cancel vs PI, auth break-glass, FE session/poll, cron 200, testes sujos, docs perigosos |
| **P2** | **30** | Higiene de segurança/ops, god modules, gaps de teste/observabilidade/dados/docs |
| **P3** | **15** | Housekeeping real, sem urgência de piloto |
| **Total** | **58** | Sem cosmético artificial; sem itens da lista de exclusão |

---

## Findings table

| ID | Priority | Area | Finding | Evidence | Risk | Suggested next step |
|---|---|---|---|---|---|---|
| **L-PAY-01** | P0 | Payments | Marcador de idempotência Stripe é `commit`ado *antes* do UPDATE de `Payment`. `SQLAlchemyError` posterior faz ACK `200`. | `backend/app/api/routers/webhooks/stripe.py` L136–153 (`db.commit()` do insert), L156–196 (status), L273–292 (`except` ACK 200) | Evento fica “processado”; PI `succeeded`/`failed` pode nunca chegar à BD | Um só TX: marcador + status; em erro de BD devolver **5xx** |
| **L-PAY-02** | P1 | Payments / obs | `payment not found` e *amount mismatch* também ACK `200` (fail-closed no mismatch, mas Stripe pára). | `stripe.py` L120–134, L169–192 | Pagamento preso em `processing`; depende de olho humano | Alerta em `stripe_webhook_payment_not_found_ack` / `amount_mismatch`; playbook stuck `processing`; considerar 5xx só no not-found (retry) |
| **L-TRIP-01** | P1 | Trips / races | `create_offers_for_trip` faz `flush` + WS `publish_new_offer` **antes** do `db.commit()` em `create_trip`. Loop de retry dorme até ~10s com a TX aberta. | `trips.py` L309–364; `offer_dispatch.py` L265–289 | Accept 404 / ofertas fantasma; conexão do pool retida | `commit` (ou nested) **antes** do WS; GPS wait **fora** da write TX |
| **L-GPS-01** | P1 | Privacy / BOLA | `POST /matching/find-driver` — **REMOVED** (`fix/matching-gps-lockdown`) | was `matching.py` | — | **DONE** |
| **L-GPS-02** | P1 | Debug / privacy | `GET /debug/trip-matching/{id}` — owner recebe só agregados; staff mantém listas | `debug_routes.py` | — | **DONE** (owner aggregate) |
| **L-PAY-03** | P1 | Payments | Cancel passenger/driver/admin continua e faz `commit` cancelled se `cancel_payment_intent` falhar (log only). | `trips.py` L417–435 (padrão repetido ~L545, ~L633) | Hold Stripe órfão + trip cancelled | Falhar fechado ou `cancel_pending` + retry; não commitir cancel até PI cancelado |
| **L-AUTH-01** | P1 | Auth | Qualquer login OTP/password com `ADMIN_PHONE` **força** `Role.super_admin` (cria ou sobrescreve). | `auth.py` L158–198 | Comprometer o telemóvel = backoffice completo | Break-glass separado; nunca auto-promote em password login; MFA; auditar mudanças de phone |
| **L-FE-01** | P1 | Frontend | `usePolling` não tem AbortController nem geração de pedido; interval + visibility podem sobrepor-se; resposta antiga ganha. | `web-app/src/hooks/usePolling.ts` L45–87 | UI de trip/availability stale em rede lenta | Abort ou seq id; ignorar resoluções velhas; não lançar tick se o anterior está in-flight |
| **L-FE-02** | P1 | Frontend / auth | `logout` limpa localStorage de auth, **não** o `sessionStorage` do active trip nem o estado React do `ActiveTripProvider` (fica montado). | `AuthContext.tsx` L491–499; `ActiveTripContext.tsx` L27–35; `passengerActiveTripRecovery.ts` | Tab partilhada / próximo passenger revive trip id até reconcile | No logout: `setPassengerActiveTripId(null)` + clear da key |
| **L-OBS-01** | P1 | Cron / ops | Sub-jobs isolados (bom) mas HTTP **200** com `status: "partial_error"`. Monitores que só vêem código HTTP ficam cegos. | `cron.py` L69–185, return L184–186 | Timeouts/redispatch mortos sem alerta | Non-2xx se `errors`; ou alerta no JSON `error_count` |
| **L-TEST-01** | P1 | Tests | Fixture `db` só faz `session.close()`. Sem rollback/truncate. Muitos testes `commit()` contra a mesma Postgres. Guard impede Render; **não** impede poluição local/CI. | `backend/tests/conftest.py` L38–44 | Ordem-dependência, falsos verdes/vermelhos | TX por teste ou truncate; documentar reset em `BACKEND_PYTEST_SAFE.md` |
| **L-DOC-01** | P1 | Docs | `ARCHITECTURE_STATUS.md` / blueprint **2026-03-12** ainda no índice: auto-dispatch, dashboards velhos, e `DATABASE_URL` local = URL Render (**mesma BD**). | `docs/architecture/ARCHITECTURE_STATUS.md` L1–40; `DOCS_INDEX.md` | Implementar o mundo errado; apontar pytest/dev à BD de prod | Stamp SUPERSEDED; índice aponta a uma “current truth” curta |
| **L-DOC-02** | P1 | Docs / cron | Runbook ensina `?secret=` na URL, TTL de oferta “>15 s” (código default **60**), e só jobs 1–3 (faltam health/zones/rotacional). | `docs/CRON_JOB_ORG_INSTRUCOES.md` §2–4; `cron.py` docstring; `OFFER_TIMEOUT_SECONDS=60` | Secret em logs/Referer; ops a monitorizar o contrato errado | Header-only; reescrever §3–4 a partir de `cron.py` |
| **L-SEC-09** | P2 | Cron | `CRON_SECRET` aceite em query `?secret=` (legado no código, não só no doc). Compare com `!=`. | `cron.py` L21–60 | Leak em access logs; timing teórico | Header-only; `hmac.compare_digest`; rodar se já esteve em query |
| **L-SEC-10** | P2 | WebSocket | Token JWT aceite em `?token=` (além de `Authorization`). | `ws.py` `_extract_token` L17–21; `admin_ws.py` equivalente | JWT em logs/histórico de proxy | Preferir header / `Sec-WebSocket-Protocol`; deprecar query |
| **L-SEC-11** | P2 | Rate limit | Limites OTP/login/`request_trip` são **por processo em memória**. Multi-worker multiplica capacidade. OTP *request* ainda chaveia IP via `X-Forwarded-For`. | `auth_rate_limit.py`; `api/rate_limit.py` | Brute-force / spam de trips entre instâncias | Store partilhado; OTP request por telefone (já feito no *verify*) |
| **L-SEC-12** | P2 | OTP | Verify sem `FOR UPDATE`; 12 tentativas/min/telefone; 6 dígitos / 5 min — não é brute-force trivial, mas não há lockout/queima. Frontend **não** chama OTP (API viva). | `auth.py` L130–156; `otp.py`; knip/grep FE sem `requestOtp` | Consume duplo; superfície latente quando houver SMS | Lock da row; queimar após N falhas; não expor se o produto é password |
| **L-SEC-13** | P2 | Sessions | Change password não invalida JWTs existentes (TTL ~60 min, sem denylist/`jti`). | `auth.py` `change_my_password`; `security.py` | Token roubado sobrevive à troca de password | `token_version` ou TTL curto + refresh |
| **L-SEC-14** | P2 | SQL | Listagens sem paginação: partner trips, admin partners/drivers/pending, matching full table, redispatch N+1. | `partner_queries.py` L50–68; `admin.py` L470–472, L592, L608 | DoS memória/CPU em admin/partner | Caps + paginação; SQL agg no redispatch |
| **L-SEC-15** | P2 | TX | `log_interaction` faz `db.commit()` na Session do pedido. | `interaction_logging.py` L25–45 | Commit de estado sujo alheio / rollback confuso | Session própria ou nested; nunca commit da session do caller |
| **L-SEC-16** | P2 | Uploads | Upload de docs do *driver* tem size limit, **sem** allowlist MIME/ext (os de viatura têm). | `driver_document_upload.py` L31–54 vs `vehicle_document_upload.py` L18–43 | Ficheiro arbitrário no disco | Alinhar allowlists; servir com Content-Type seguro |
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
| **L-DOC-03** | P2 | Docs | Índice omite `docs/env/` e `STACK_TECNOLOGICO.md`; `ENV_VARS_VERIFICATION.md` sem HERE/capacity/driving hours/next-trip; `GUIA_TESTES.md` Python “3.10+”; Stripe runbook head `b5c6d7e8f9a0` (real **`d2e3f4a5b6c7`**); `TODO_FUTURO.md` B.2 diz que `log_event` **não** leva `request_id` — **falso** (`logging.py` L275–278); comentário `ENABLE_HERE_TOLLS` “no wire yet” vs Portagens V1 em prod. | vários paths em Docs drift | Setup/ops errados | Resync pontual (não reescrever tudo) |
| **L-SEC-19** | P3 | Cron | Secret comparado com `!=`. | `cron.py` L57 | Timing leak teórico | `hmac.compare_digest` |
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

### L-PAY-01 — webhook idempotente demais

O insert em `stripe_webhook_events` usa `ON CONFLICT DO NOTHING`. Se `rowcount != 0`, o código **faz `db.commit()` imediatamente** (comentário: senão o 200 faria rollback e partiria a idempotência). O UPDATE de `payment.status` é **outra** transação. Se essa falhar:

1. O evento já está marcado.
2. O `except SQLAlchemyError` regista `stripe_webhook_db_error_ack` e **mesmo assim** devolve `{"status":"ok"}`.
3. Stripe trata como sucesso e **não retenta**.

Isto é o contrário do padrão “ACK só depois de persistir o efeito”. A intenção anti-poison-queue é compreensível; o resultado é **pagamento preso para sempre** sem retry automático.

**Não coberto** pelos testes de idempotência happy-path em `test_consolidacao_tvde.py`.

### L-PAY-02 — ACK 200 em not-found / mismatch

- PI ainda não existe na BD (corrida create PI vs webhook) → 200, sem retry.
- Amount mismatch → fail-closed (não marca `succeeded`) — correcto — mas também 200.

Precisa de alerta + reconciliação admin (`admin_payment_reconciliation.py` existe; o buraco é **observabilidade de volume**, não ausência total de ferramenta).

### L-TRIP-01 — ofertas na WS antes de serem duráveis

Postgres: outra sessão **não** vê o `flush` sem `commit`. O hub WS é in-process. O motorista recebe `new_trip_offer` e o `accept` vai a **outro** request/session → oferta inexistente até ao `commit` no fim de `create_trip`.

Janela normal: milissegundos (logs + commit). Janela má: **até ~10s** se 0 ofertas (5× `asyncio.sleep(2)` com a mesma Session). Também prende uma conexão do pool.

Em produção “estável” isto parece raro; sob latência/GPS atrasado é exactamente o retry loop.

### L-GPS-01 / L-GPS-02 — frota visível

**Mitigado** em `fix/matching-gps-lockdown`: `POST /matching/find-driver` **removido**; `GET /debug/trip-matching/{id}` devolve ao dono só contagens/`root_cause` (staff mantém listas com coords).

### L-PAY-03 / L-AUTH-01 / L-FE-01 / L-FE-02 / L-OBS-01 / L-TEST-01 / L-DOC-01 / L-DOC-02

Detalhe já na tabela. Notas curtas:

- Cancel vs PI: o trip fica `cancelled` e o hold pode continuar capturável no Stripe até expiry — suporte doloroso, não necessariamente charge imediato.
- `ADMIN_PHONE`: break-glass útil *e* single point of failure. Não é um bypass anónimo.
- Polling: `cleanup` só faz `clearInterval`; in-flight `fn()` continua e chama `setState`.
- Logout: `ActiveTripProvider` está acima do auth na árvore; o estado sobrevive ao logout.
- Pytest: `BACKEND_PYTEST_SAFE.md` cobre **host remoto**, não isolamento entre testes.
- Docs Março: o parágrafo “BD local = External URL da Render” é o finding mais perigoso do lado docs (humano a seguir o runbook).

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

Comparação constante do cron secret, SOS `recorded:false`, lifecycle logs anónimos, `/health?diagnostic=1`, geocode sem abort, flags driver mortas, gate de docs no localStorage, `refresh_token` morto, `isAdmin` latente fora de BETA, locale-en fora do Playwright, mypy estreito, `max_passengers` NULL, índice composto, `simulateRoute.ts`/`testRoutes.ts` (higiene ainda aberta), nanoid/postcss no `npm audit --omit=dev`.

Admin UI **não** está CSS-hidden para passengers quando `isAdmin` é falso: tabs `tab === 'x' &&`. O risco é `isAdmin` errado (L-FE-14), não “mounted but hidden”.

---

## Test quality findings

| Tema | Estado |
|------|--------|
| Isolamento BD | **Fraco** (L-TEST-01) — único P1 de testes |
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
| `ARCHITECTURE_STATUS.md` + blueprint 2026-03-12 | Matching/dispatch/UI/Render service names; **BD local = prod** | P1 (L-DOC-01) |
| `CRON_JOB_ORG_INSTRUCOES.md` | Query secret; 15s vs 60s; jobs 4–6 em falta | P1 (L-DOC-02) |
| `DOCS_INDEX.md` | Omite `docs/env/` e `STACK_TECNOLOGICO.md`; smokes Julho como “operação” | P2 |
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

PRs **pequenos e reversíveis**. Ordem sugerida (não abrir nesta sessão):

| # | Branch sugerida | Scope | IDs |
|---|-----------------|-------|-----|
| 1 | `fix/stripe-webhook-idempotency-tx` | Um TX marcador+status; 5xx em erro de BD; teste de falha a meio | L-PAY-01 (e alerta L-PAY-02 se couber) |
| 2 | `fix/create-trip-commit-before-ws` | Commit antes de `publish_new_offer`; sleep de GPS fora da write TX | L-TRIP-01 |
| 3 | `fix/matching-gps-lockdown` | Desmontar ou staff-only `find-driver`; strip coords em debug matching | L-GPS-01, L-GPS-02 |
| 4 | `fix/fe-logout-and-polling-abort` | Clear trip storage no logout; seq/abort no `usePolling` | L-FE-02, L-FE-01 (L-FE-05 no mesmo ficheiro se barato) |
| 5 | `fix/cron-partial-error-and-runbook` | HTTP não-2xx se `errors`; runbook header-only + jobs 1–6 + TTL 60s | L-OBS-01, L-DOC-02, L-SEC-09 |

**A seguir (não no top 5):** pytest isolation (L-TEST-01 — PR maior), SUPERSEDED da arquitectura Março (L-DOC-01, docs-only), cancel vs PI (L-PAY-03), `ADMIN_PHONE` (L-AUTH-01, precisa decisão de produto).

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

*Fim da auditoria. Sem commit.*
