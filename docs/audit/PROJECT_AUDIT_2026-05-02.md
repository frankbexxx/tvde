# Auditoria de negócio e produção — TVDE / V@mulá

**Data:** 2026-05-02
**Branch auditada:** `fix/driver-menu-placement-gps-pricing-copy` (working tree limpa exceto `docs/product/DRIVER_MENU_SPEC.md` modificado)
**Último commit em `main`:** `9966b75` — *fix(driver): menu no topo, GPS compacto, estimativa só no menu*
**Total de commits no repo:** 659

> Documento **só de leitura**. Sem alterações ao código. Auditoria conduzida por inspecção do repositório (`backend/`, `web-app/`, `docs/`, `.github/`), CI, dependências e historial Git.

---

## Sumário executivo

O projecto é uma **plataforma de ride-sharing TVDE para Portugal**, com marca própria (V@mulá) e modelo comissional (15% inicial, 12,5% após período experimental). O alvo declarado é competir com Uber/Bolt no mercado nacional.

- **Estado actual:** **MVP web validado em campo** — produção a correr no Render (<https://tvde-app-j51f.onrender.com>); piloto alpha de **2026-04-25** em Oeiras/Cascais executado com sucesso; 4 dispositivos reais; fluxo passageiro→motorista→pagamento funcional ponta-a-ponta.
- **Maturidade técnica:** **alta para um projecto de 1 dev**; baixa para entrar em produção comercial regulada e escalar a milhares de utilizadores.
- **Maturidade de negócio:** **pré-comercial** — sem registo TVDE público, sem pagamentos reais a motoristas (Stripe Connect ausente), sem termos legais redigidos por advogado, sem CRM/marketing, sem onboarding documental obrigatório.
- **Gap principal vs Uber/Lyft:** ausência de **apps nativas** (iOS/Android), de **pagamento real ao motorista** (payouts), de **SMS OTP real**, de **observabilidade de produção** (APM/dashboards) e de **escalabilidade horizontal** (matching e WebSockets in-process).

**Veredicto operacional:** o produto **funciona end-to-end** num cenário controlado (~5–30 testers BETA). **Não está pronto** para abrir o tap a milhares de utilizadores ou para suportar a operação comercial regulada de uma frota.

---

## 1. Estrutura e tecnologia

### 1.1 Mapa do repositório

```text
APP/
├── backend/        FastAPI + SQLAlchemy 2 + Alembic + Stripe
├── web-app/        React 19 + Vite 7 + TypeScript 5.9 + Tailwind 3.4
├── docs/           ~14 sub-pastas (architecture, deploy, legal, ops, …)
├── .github/        3 workflows CI + Dependabot
├── audits/         Outputs npm audit / pip-audit (vazios = sem vulnerabilidades)
├── scripts/        PowerShell + Python helpers (DB, simulador, smoke)
├── tools/          Tools auxiliares (api_runner)
├── image/          Assets de marca (V@mulá iconmark)
├── logs/           CSVs de testes humanos (interaction logs 2026-03)
├── README.md
└── TODOdoDIA.md    Documento operacional vivo (regras de sessão)
```

- **143** ficheiros Python no backend (`backend/app` + `backend/tests`).
- **84 ficheiros `.ts` + 55 `.tsx`** no web-app.
- **Sem código nativo** (sem `Podfile`, sem `AndroidManifest.xml`, sem React Native).
- **Sem Dockerfile** nem `render.yaml` — deploy configurado **manualmente** no painel do Render.

### 1.2 Stack técnica

| Camada | Tecnologia | Versão | Notas |
|---|---|---|---|
| Backend | FastAPI + Uvicorn | — | ASGI, lifespan com `alembic upgrade head` em produção |
| ORM | SQLAlchemy | ≥2.0 | Mapped types, sessões síncronas |
| Migrações | Alembic | ≥1.13 | 9 revisões aplicadas (head: `f1a2b3c4d5e6_driver_zone_sessions_v1`) |
| BD | PostgreSQL 15 | — | Sem PostGIS; lat/lng em `Numeric(9,6)` |
| Pagamentos | Stripe | ≥8.0 | PaymentIntent manual capture, webhook com idempotência |
| Auth | PyJWT + bcrypt + OTP HMAC-SHA256 | — | OTP gerado server-side, **sem SMS real** |
| Realtime | WebSockets FastAPI | nativo | Hubs **in-process** (não escala horizontalmente) |
| Frontend | React 19 + React Router 7 + Vite 7 + Tailwind 3.4 | — | TypeScript estrito |
| Mapa | MapLibre GL + react-map-gl | 5.x / 8.x | MapTiler primário + Nominatim fallback |
| Observabilidade | Sentry SDK (FastAPI + React) | condicional | Liga só com `SENTRY_DSN` |
| Testes API | pytest + httpx | — | **38 ficheiros** de testes (~140 testes) |
| Testes UI | Vitest + Testing Library | 3.x / 16.x | ~90 testes |
| Testes E2E | Playwright | 1.51 | 3 specs (`api-flows`, `driver-passenger-flow`, `admin-health-tab`) |
| Lint | Ruff (backend) + ESLint 9 (frontend) | — | CI bloqueia em vermelho |
| Hosting | Render (Web Service + Postgres + Static) | — | Sem segundo ambiente (staging) |
| External | UptimeRobot, cron-job.org, Stripe webhooks | — | Configurados |

### 1.3 Domínio (modelo de dados)

Tabelas principais (via `backend/app/db/models/`):

- `users` — papéis: `passenger`, `driver`, `admin`, `super_admin`, `partner`
- `drivers` — `partner_id` obrigatório, `vehicle_categories` (CSV), `commission_percent`, `is_available`, `avg_rating`, `cancellation_count`
- `driver_locations` — última posição (uma linha por motorista)
- `partners` — frotas (multi-tenant)
- `trips` — `requested → assigned → accepted → arriving → ongoing → completed | cancelled | failed` + `cancellation_fee`, `cancelled_by`, ratings bidireccionais
- `trip_offers` — multi-offer dispatch top N motoristas
- `payments` — Stripe PaymentIntent + commission/payout (UNIQUE `stripe_payment_intent_id`)
- `stripe_webhook_events` — dedup por `evt_*`
- `audit_event` — auditoria persistente (retenção 90 dias)
- `interaction_log` — telemetria de UX
- `otp` — códigos OTP com `expires_at`
- `driver_zone_day_budget` + `driver_zone_session` — regra «2 mudanças de zona/dia» (v1)

Pontos fracos do schema:
- **Lat/lng em `Numeric`**, não geo-tipo. Sem índice espacial → matching por **scan completo** (ver §3.1).
- `vehicle_categories` é **CSV em `Text`**, não tabela relacional. Limita filtros e queries analíticas.
- Sem tabela formal de **documentos do motorista** (carta, IMT, seguro). Texto livre em `drivers.documents`.

---

## 2. Funcionalidades implementadas (snapshot)

### 2.1 App Passageiro (web)

- **Sim:** pedir viagem (origem por texto / mapa, destino por texto / mapa, fallback Nominatim+MapTiler PT-first), estimativa de preço, viagem ao vivo (polling 5 s + WS), cancelar, avaliação 1–5 estrelas, histórico recente.
- **Parcial:** geolocalização (depende de permissões do device), ETA (existe mas não dedicado), histórico (mostra mas sem filtros), pagamento (Stripe no backend; **sem 3DS no frontend**).
- **Não:** múltiplos destinos, agendar viagem, partilha de viagem (live tracking link), favoritos, promoções, escolha de método de pagamento, dinheiro como first-class.

### 2.2 App Motorista (web)

- **Sim:** receber pedidos, aceitar/rejeitar oferta com `offer_id`, navegação Waze/Google (com confirmação), iniciar/terminar viagem, online/offline, preferência de navegação persistida, wake lock, **categorias de veículo** (toggles + persistência), **menu** com rendimentos semanais, histórico paginado, documentos (placeholder), zonas v1 («2 mudanças/dia»).
- **Parcial:** ganhos (totais semanais, sem dashboard), histórico (5+, paginação), score do motorista, cancelamento com motivo.
- **Não:** heatmap, bonus/incentivos, metas, pausa formal, notificações de procura, suporte in-app.

### 2.3 App Partner (frota)

- **Sim:** lista de motoristas, atribuir motoristas, ver viagens da frota, métricas básicas, online/offline, ativar/desativar, export CSV.
- **Parcial:** earnings por motorista, relatórios, filtros avançados (datas/BI), onboarding.
- **Não:** documentos/licenças, tracking em tempo real da frota, performance analytics.

### 2.4 Admin

- **Sim:** gestão de utilizadores, criar parceiros, ver todas as viagens, métricas globais, **system-health** (anomalies + reconciliation Stripe), tabs com paginação e bulk-block, deep links `?tab=&tripId=`.
- **Parcial:** suporte (resolução), refunds, pricing rules, auditoria (audit_event existe mas UI mínima).
- **Não:** dynamic pricing (surge), sistema de disputas, gestão de campanhas, fraude.

### 2.5 Plataforma transversal

- Multi-tenant (`partner_org_id`) com isolamento testado (`test_partner_tenant_isolation.py`, `test_partner_auth_isolation.py`).
- RBAC documentado em `docs/RBAC_ENDPOINT_AUDIT.md`.
- Cron job consolidado: timeouts de viagem, expirar ofertas, redispatch, cleanup audit, snapshot system-health, expirar zonas — protegido por `CRON_SECRET` (header preferred ou query legacy).
- Webhook Stripe com **idempotência por `evt_*`** + chaves Stripe nas chamadas.

---

## 3. Pontos críticos para entrar em produção comercial

### 3.1 Escalabilidade — bloqueador estrutural

| Componente | Como está | Limite prático | Recomendação |
|---|---|---|---|
| **Matching `find_nearest_driver`** | `SELECT *` de `driver_locations` + Haversine em Python (`backend/app/services/matching.py`) | ~centenas de motoristas online | Migrar para **PostGIS** (`geography(POINT)` + `ST_DWithin` + GiST index) ou para H3/Geohash buckets. |
| **`create_offers_for_trip`** | Mesmo padrão: lê todos `Driver+DriverLocation` aprovados disponíveis, filtra em Python | Idem | Idem; query nativa por bounding box + raio. |
| **`hub.py` / `driver_offers_hub.py`** | Subscrições WebSocket em **dict in-process** | **1 worker uvicorn** apenas | Substituir por **Redis pub/sub**, NATS ou Postgres LISTEN/NOTIFY antes de subir réplicas. |
| **`run_scheduled_jobs`** | Endpoint `/cron/jobs` accionado por cron-job.org | Single-tenant; N executores podem causar dupla execução | Adicionar lock (advisory lock PG) ou mover para worker dedicado (ex.: APScheduler/Celery beat). |
| **Polling 5s** | Passageiro/motorista pollam a API | Custo linear com utilizadores activos | Empurrar mais para WS / SSE quando o hub for distribuído. |
| **Build do frontend** | `1.67 MB` minificado (warning Vite); sem code-splitting por rota | Tempo de cold start em 3G/4G fraco | `manualChunks`, `import()` por rota, `React.lazy`. |

### 3.2 Segurança e identidade

| Item | Estado | Risco |
|---|---|---|
| **OTP por SMS real** | **Falta** — `app/auth/otp.py` apenas gera código e faz `print` (`[OTP] phone=… code=…`). Em `ENABLE_DEV_TOOLS` o código é **fixo `123456`**. | Sem SMS, **não há autenticação real**. |
| **Login BETA** | `DEFAULT_PASSWORD = "123456"` em `app/core/config.py` se o utilizador não definiu password. | Aceitável em alpha; **inaceitável em produção pública**. |
| **JWT** | HS256, 60 min, segredo via env. Sem refresh token. | OK para web; precisa **refresh** para mobile e revogação. |
| **CORS** | Lista explícita em produção; `*` em dev. | OK. |
| **Rate-limit** | Apenas em `request_trip` (BETA, 5/min/utilizador). Sem rate-limit no login/OTP. | **Brute-force OTP** possível (6 dígitos = 1M combinações; sem throttling). |
| **CSRF** | Bearer-token em header → CSRF não aplicável. | OK. |
| **Auditoria de segurança formal (A034)** | **Falta** | Necessário para qualquer fase comercial. |
| **Rotação de segredos** | Sem procedimento documentado | Risco em caso de leak. |
| **Sentry** | Configurado mas opcional | OK; ligar em produção. |
| **Bandit / SAST** | `bandit.yaml` no `backend/` mas **sem job CI** que o execute | Adicionar a `backend-ci.yml`. |
| **`pip-audit` / `npm audit`** | Outputs em `audits/` mostram **0 vulnerabilities** (último run) | Bom; falta agendar. |
| **Dependabot** | Activo (`.github/dependabot.yml`) | OK. |

### 3.3 Pagamentos

- **PaymentIntent manual capture** está bem implementado (`stripe_service.py`), com idempotência tanto em `create/confirm/capture/update` como no webhook (tabela `stripe_webhook_events`).
- **Falta o lado do motorista:** **Stripe Connect** (`Express`/`Standard`) para split automático e payouts é referido no `PROJECT.md` mas **não existe no código**. Hoje o motorista vê o `driver_payout` calculado, **mas o dinheiro não sai automaticamente**.
- **3DS / SCA no frontend** não implementado. O fluxo `accept_trip` regista o PI mas o passageiro nunca confirma um cartão na web-app.
- **Sem método de pagamento por dinheiro** como first-class.
- **Sem refunds** explícitos na UI admin (modelo permite-os).

### 3.4 Operação e infraestrutura

| Item | Estado | Risco |
|---|---|---|
| **Backups Postgres formais (A028)** | **Falta** — não há script no repo nem documentação de restore | Recovery point objectivo desconhecido. |
| **Staging (A027)** | **Falta** — só dev local + produção | Zero teste pré-deploy real. |
| **Deploy as Code** | **Falta** `render.yaml`/Terraform; tudo manual no UI Render | Repetibilidade baixa. |
| **APM / dashboards** | Sentry condicional + UptimeRobot HEAD-only | Sem latência p50/p95 nem traces. |
| **Push notifications** | **Falta** | Bloqueia experiência mobile real. |
| **Monitorização externa SLA** | UptimeRobot básico | Sem alerting accionável detalhado. |
| **Runbook de incidentes** | Existe `W2_RUNBOOK.md`; sem on-call formal | OK para single dev, frágil para crescimento. |

### 3.5 Qualidade e dívida técnica

| Item | Métrica / observação |
|---|---|
| `web-app/src/features/driver/DriverDashboard.tsx` | **1857 linhas, 78 KB** — refactor candidato (extrair sub-componentes; testar lógica em `*.ts`). |
| `backend/app/api/routers/admin.py` | **1740 linhas, 64 KB** — partir por área (utilizadores, viagens, saúde, governance). |
| `backend/app/services/trips.py` | **1486 linhas** — núcleo crítico; cobertura de testes parece boa, mas a função `complete_trip` é candidata a state-machine explícita. |
| Bundle frontend | **1.67 MB** — falta code-split / lazy. |
| Tests `pytest -q` | ~140 (estimativa por número de ficheiros) — boa cobertura do core. |
| Tests Vitest | ~90 — focado em utilitários e RTL. |
| Tests E2E | 3 specs Playwright — cobertura baixa para um produto regulado. |
| Mypy | `mypy.ini` existe; **não corre em CI** (`backend-ci.yml` apenas `ruff` + `pytest`). |
| Type-check frontend | Corre em CI (`tsc -b --noEmit`). |
| Cobertura | **Sem `pytest --cov` em CI**; sem badge. |
| `.env`/segredos | `DEPLOY_SECRETS.md` está em `.gitignore` (correcto). |

### 3.6 Conformidade legal e produto

- **Licença TVDE em Portugal**: a operação requer licença IMT + seguro de responsabilidade civil ride-sharing + compliance RGPD + contrato com motoristas. O repo tem a checklist (`docs/legal/PARCEIRO_TVDE_CHECKLIST.md`) mas **fora do âmbito do código**.
- **Termos de uso e Política de Privacidade** — não existem na app (precisam advogado).
- **Registo de tratamentos RGPD** — não existe.
- **Verificação de identidade do motorista (KYC)** — manual, sem integração.
- **Seguro do passageiro** — depende do parceiro TVDE (humano), não da plataforma.
- **Marca V@mulá** — assets em `web-app/public/brand/`; sem registo de marca documentado no repo.

---

## 4. Modelo de negócio observado

| Eixo | O que se vê no código/docs |
|---|---|
| **Mercado** | Portugal (regex telefone `+351`, fuso `Europe/Lisbon`, copy 100% PT). |
| **Receita** | Comissão por viagem (`drivers.commission_percent`, default ~15%). Cancellation fee 20% mín. €1,50. |
| **Custo unitário** | Render (~30–50 €/mês para serviço web + Postgres pequeno) + Stripe (1,4–2,9% + €0,25 EU) + MapTiler/Nominatim (free tier por agora). |
| **GTM** | BETA fechado (≤30 utilizadores), recrutamento por WhatsApp, parceiro TVDE referido como «Manel». |
| **Estrutura** | 1 dev (Frank) + Cursor; sem co-fundadores técnicos; sem investidores documentados. |
| **Diferenciação** | Mercado nacional + relação directa com partner TVDE; experiência simples (sem surge); regras «2 mudanças de zona/dia» como UX-first para motoristas locais (vs algoritmo opaco da Uber). |
| **KPIs no produto** | Telemetria base (`interaction_log`, `audit_event`, `system_health`). Sem dashboard executivo. |

---

## 5. Comparação contra Uber/Lyft (gap analysis condensado)

| Capacidade | Uber/Lyft | TVDE/V@mulá hoje |
|---|---|---|
| Apps **nativas** iOS/Android | Sim | **Não** (PWA web) |
| **SMS OTP** real | Sim (Twilio/MessageBird/etc.) | **Não** (só print/console) |
| **Pagamento ao motorista** automático | Stripe Connect / sistema interno | **Não** (Connect ausente) |
| **Surge / dynamic pricing** | Sim | Não |
| **Dispatch a milhares de motoristas/cidade** | Sim (PostGIS, S2/H3, ML matching) | Não (Python loop) |
| **Multi-país / multi-moeda** | Sim | Só PT/EUR |
| **Marketplace de produtos** (X, XL, Comfort, Pets, Black, Eats…) | Sim | Categorias existem mas sem produto/UI dedicado |
| **Push** + notificações ricas | Sim | Não |
| **In-app chat / call (mascarado)** | Sim | Não |
| **Safety toolkit** (SOS, share trip, pin verify) | Sim | Não |
| **KYC + verificação biométrica** | Sim (Persona/Onfido/Stripe Identity) | Não |
| **Background-check de motorista** | Sim (Checkr) | Não automático |
| **Suporte 24/7** | Sim (humano + bot) | Não |
| **Programa de incentivos / quests** | Sim | Não |
| **Ride-pooling** | Sim | Não |
| **Integração com mapas/navegação** | Própria + Mapbox + Google | Waze/Google deep-links |
| **Data/ML** (ETA, pricing, fraud) | Sim | Não |
| **Compliance global** (TVDE, IRS/AT, faturação electrónica) | Sim | Em curso (humano) |

---

## 6. Roteiro recomendado — para chegar a uma «full app» tipo Uber/Lyft

> Premissas: equipa cresce de 1 dev para ≥3–5 nos próximos 12–18 meses; foco continua em PT antes de internacionalizar; a marca quer manter UX simples.

### Fase A — **Fundação produção** (3 meses · 1–2 devs)

Objectivo: deixar o MVP actual em condições de operar com **algumas centenas de utilizadores reais** e **dinheiro a sair** correctamente.

1. **Stripe Connect** (Express) com KYC integrado — split automático passageiro→plataforma→motorista, payouts diários/semanais.
2. **SMS OTP real** — Twilio Verify (ou MessageBird/Vonage) com rate-limit no `/auth/otp/request`.
3. **3DS/SCA no frontend** — Payment Element + confirmCardPayment com retry do PI.
4. **Backups Postgres** automáticos + 1 exercício de restore documentado (A028).
5. **Staging Render** (segundo serviço + segunda BD + Stripe test) — A027.
6. **render.yaml** ou Terraform mínimo para repetibilidade de deploy.
7. **Sentry obrigatório em produção** + dashboards UptimeRobot/BetterStack com alertas (Slack/Telegram).
8. **Auditoria de segurança light** (A034): pentest manual + SAST (Bandit/Semgrep no CI) + revisão RBAC.
9. **Refactor monstros**: partir `DriverDashboard.tsx` e `routers/admin.py` em sub-módulos (≤500 linhas cada).
10. **Cobertura de testes** medida (pytest-cov + Codecov) e **≥10 specs E2E** (cenários críticos: pedido, accept/cancel motorista, accept/cancel passageiro, cobrança, refund, suspensão, OTP).
11. **Termos & Privacidade** com advogado — exibir no onboarding com aceite registado.

### Fase B — **Apps nativas + push** (4–6 meses · +1 dev mobile)

Objectivo: ter presença real em telemóvel sem perder o investimento web.

1. **Decisão**: **React Native (Expo)** vs **Flutter** vs **native Swift+Kotlin**.
   - Recomendação para esta equipa: **React Native + Expo + EAS Build**, partilhando schemas TypeScript com a web-app e re-utilizando lógica.
2. **App passageiro nativa** com:
   - Push (FCM/APNs via Expo Notifications),
   - Geolocalização background (com aviso explícito + consent),
   - Apple Pay / Google Pay via Stripe,
   - Deep-links e App Clips/Instant Apps (opcional).
3. **App motorista nativa** com:
   - Persistent location service,
   - Lifecycle robusto (Doze/App Standby Android, BG modes iOS),
   - Wake-lock, navegação embutida (Mapbox SDK ou Google Maps SDK).
4. **Lojas**: contas Apple Developer (€99/ano) + Google Play (€25 one-off), processo de revisão (privacy nutrition labels, location justification, ride-sharing review).
5. **CI mobile**: EAS Build + EAS Submit; channels OTA via Expo Updates.

### Fase C — **Escalabilidade do core** (3–4 meses · paralelizável com B)

1. **PostGIS** + `ST_DWithin` + índice GiST em `driver_locations.geom`.
2. **Matching service** dedicado (mesmo monolito, mas função SQL): top-K motoristas por raio, freshness, rating, vehicle category, partner policy.
3. **Realtime distribuído**: Redis pub/sub (já vem com Render/Upstash) por trás dos hubs `hub.py` e `driver_offers_hub.py` — passa a suportar N workers.
4. **Worker dedicado** (Celery/Dramatiq/RQ) para cron, evitando que o web absorva timeouts e cleanup.
5. **Code-splitting frontend**: `manualChunks` por rota (`passenger`, `driver`, `admin`, `partner`); reduzir bundle de 1.67 MB para <400 KB inicial.
6. **Migrar polling 5 s → SSE/WS** onde fizer sentido (passageiro a ver motorista a chegar).
7. **APM** com tracing (OpenTelemetry → Honeycomb/Tempo/Datadog) para latência p95 do dispatch.

### Fase D — **Confiança, segurança e suporte** (paralelizável)

1. **KYC do motorista**: Stripe Identity ou Onfido — verificação documental + selfie + liveness.
2. **Background-check** (PT: registo criminal automatizado se possível; senão, fluxo manual com SLA).
3. **Safety toolkit no passageiro**: PIN verification antes de entrar no carro, share trip por SMS/WhatsApp, botão SOS (112 / chamada parceiro).
4. **Trust & Safety backend**: detecção de viagens canceladas em série, motoristas com rating < threshold, alertas a admin.
5. **Suporte in-app**: chat com agente humano (Front/Intercom/Crisp) + base de conhecimento. SLAs por tier.
6. **In-app voice/chat motorista↔passageiro mascarado** (Twilio Programmable Voice + Proxy) — número intermediário descartável.
7. **Faturação automática AT/IRS** — emitir fatura PT (Vendus/Moloni/InvoiceXpress) por viagem; exportar SAFT.

### Fase E — **Crescimento e diferenciação** (contínuo)

1. **Pricing dinâmico** modesto: surge por zona + hora, **com transparência** (mostrar multiplicador como Lyft Prime, não esconder como Uber X).
2. **Programa de incentivos** motoristas: missions/quests («Faz 20 viagens este fim-de-semana → +€30»).
3. **Promoções passageiro**: códigos referral, primeiro mês com desconto, parcerias (universidades, empresas).
4. **Múltiplos produtos**: V@mulá X / XL / Pet / Verde (eléctrico) / Comfort — categorias já existem; falta UI dedicada.
5. **Multi-stop, agendamento, partilha de viagem**.
6. **Modo empresa** (B2B): faturação consolidada, billing department, relatórios.
7. **Data warehouse** (BigQuery / ClickHouse / Postgres réplica) + dbt para BI; dashboards Metabase/Grafana.
8. **ML**: ETA mais preciso (gradient boosting sobre histórico), supply forecast por zona/hora, fraud scoring.
9. **Internacionalização**: ES/BR como segunda língua; i18n no frontend (lib `react-intl` ou `i18next`).

### Fase F — **Compliance & escala regional**

1. **Conformidade RGPD** completa (DPIA, registo de tratamentos, contrato sub-processadores).
2. **Acessibilidade WCAG 2.1 AA** (já há trabalho `tablist`/`role`/touch targets).
3. **Reverse-charge VAT** se expandir EU.
4. **Multi-tenant real**: cada cidade/parceiro pode ter pricing/regras próprias (já há base com `partners`).
5. **Data residency** (UE) e logs auditáveis para reguladores.

---

## 7. Sequenciamento sugerido (12 meses, equipa pequena)

| Trimestre | Foco principal | Resultado verificável |
|---|---|---|
| **T1 (M1–M3)** | Fase A — fundação produção + smoke real com pagamento Connect + SMS OTP | 50 utilizadores reais a pagar de verdade; payouts semanais funcionais |
| **T2 (M4–M6)** | Fase B — app nativa passageiro (RN/Expo) + Fase C parte 1 (PostGIS, Redis pub/sub) | Passageiros em iOS/Android via TestFlight/Internal Track; matching <200 ms para 500 motoristas online |
| **T3 (M7–M9)** | App motorista nativa + KYC + safety + suporte | Motoristas a usar app nativa em produção; fluxo SOS testado; agente humano respondendo via in-app |
| **T4 (M10–M12)** | Crescimento (incentivos, promoções, BI) + lançamento público numa cidade | KPIs comerciais (CAC, LTV, take-rate) mensuráveis; primeiro relatório financeiro |

---

## 8. Recomendações imediatas (próximos 30 dias)

Sem alterar arquitectura nem abrir ondas grandes:

1. **Adicionar rate-limit ao `/auth/otp/request` e `/auth/login`** (a janela actual é insuficiente; usar `slowapi` ou middleware simples por IP+telefone).
2. **Job CI** que corra `bandit -r backend/app -c backend/bandit.yaml` e `pip-audit` em cada PR.
3. **`pytest-cov`** com gate ≥70% nas pastas `services/` e `api/routers/`.
4. **Backups Postgres** no Render: activar **Point-In-Time Recovery** (Render plan ≥ Standard) e documentar em `docs/ops/`.
5. **Code-splitting** do bundle (`React.lazy` por rota) — fix do warning de 500 KB e melhora cold start mobile.
6. **`SENTRY_DSN`** definido em produção (ainda é opcional na config).
7. **Documentar incident response** mínimo (`docs/ops/INCIDENT_RUNBOOK.md`): contacto, rollback Render, rollback Stripe, comunicação aos motoristas.
8. **Escolher rota mobile** (decisão estratégica): RN+Expo vs PWA reforçada — bloqueia tudo o resto da Fase B.

---

## 9. Observações sobre o método de trabalho

- **Disciplina de documentação muito acima da média** para um projecto de 1 dev. `TODOdoDIA.md`, `PROXIMA_SESSAO.md`, `DOCS_INDEX.md`, especificações por feature (`DRIVER_MENU_SPEC.md`, `DRIVER_HOME_TOP3_MANEL.md`, `PRICING_DECISION.md`).
- **Histórico Git limpo**, com PRs numeradas (#211–#220 recentes), commits com prefixo `tipo(âmbito):` em PT.
- **Regras `.cursor/rules/`** para sincronizar `main` e fluxo de commit/PR.
- **Risco**: **bus factor 1**. Sem co-piloto humano, todo o conhecimento crítico (decisões de pagamento, BD prod, contas Stripe/Render) está numa cabeça e em ficheiros locais (`docs/_local/`, `DEPLOY_SECRETS.md` em gitignore).

---

## 10. Conclusão

O projecto é, **na sua escala actual, mais maduro do que a maioria dos «MVPs ride-sharing» open-source** que circulam na internet: tem dispatch com timeouts e redispatch, multi-tenant com isolamento testado, Stripe webhook idempotente, RBAC documentado, alembic em produção, CI com Postgres real, telemetria e auditoria, design pensado por fatias com utilizador real («Manel»).

Mas **não é Uber/Lyft, e o caminho até lá é caro**. A diferença entre o que está hoje e uma plataforma comercial regulada de ride-sharing à escala nacional **não é incremental** — exige:

- equipa com **3–5 pessoas mínimas** (mobile, backend, ops, suporte/produto),
- **6–12 meses** de trabalho focado nas fases A–C,
- **investimento operacional** (Stripe Connect requer KYB, lojas requerem contas + revisão, SMS tem custo unitário, suporte 24/7 tem custo fixo),
- **decisão de mercado**: continuar PT-only e ser «Bolt local com cara» ou tentar internacionalizar e competir frontalmente (não recomendado com esta equipa).

A **estratégia mais defensável** dado o estado actual é:

> *Fase A em 3 meses → smoke comercial controlado em PT (uma cidade, uma frota parceira, ≤200 utilizadores, dinheiro a sair); só depois decidir se vale o esforço de Fase B (apps nativas) ou se uma PWA bem feita basta para o nicho V@mulá.*

---

_Auditoria concluída — `2026-05-02`. Sem alterações ao código._
