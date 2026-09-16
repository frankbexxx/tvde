# P1 Runtime Security Review — 2026-09

**Base:** `docs/analysis/REPO_RUNTIME_HYGIENE_AUDIT_2026-09.md`  
**Branch:** `audit/repo-runtime-hygiene-sep2026`  
**Modo:** READ-ONLY (este ficheiro é o único artefacto novo; sem commits de código, upgrades, env writes, redeploy)  
**Data:** 2026-09-16

---

## Executive decisions (short)

| Tema | Verdict |
|---|---|
| MapLibre | **`MAPLIBRE: CONFIRMED`** |
| React Router | **`REACT_ROUTER: NEEDS REVIEW`** |
| `ENV=staging` drop-in | **Perigoso sem checklist** (CORS `*`, debug always-on, sem alembic auto) |
| `BETA_MODE=False` em PROD hoje | **`NEEDS MIGRATION`** (auth FE actual parte) |
| Python 3.14 Render | **Default da plataforma**, não pin do repo |
| `DEFAULT_PASSWORD` | **`SAFE LEGACY`** (não usado no login path) |
| `/debug` em PROD | Montado via BETA; 4 endpoints JWT-gated; 1 só-dev |

---

## 1. MapLibre — advisory exacto

### Factos

| Campo | Valor |
|---|---|
| Instalado (lock + `npm ls`) | **`maplibre-gl@5.19.0`** (direct) |
| Também puxado por | `react-map-gl@8.1.0` → `@vis.gl/react-maplibre` (deduped 5.19.0) |
| Advisory | **GHSA-jrc7-96c5-q579** / **CVE-2026-85061** |
| Título | XSS Sanitizer Bypass in `DOM.sanitize()` via Live NamedNodeMap Removal Skip |
| Severidade npm | **critical** (CVSS 10.0, CWE-79) |
| Affected | **`<= 6.4.0`** (inclui toda a linha 5.x) |
| Primeira versão corrigida | **`6.4.1`** (release MapLibre; npm `fixAvailable` aponta **6.10.0**, `isSemVerMajor: true`) |
| Impacto | Browser XSS zero-click via **attribution control** `innerHTML` após sanitização falhada |
| Server | N/A (lib client-side) |

### Dependency path

```text
web-app
├── maplibre-gl@5.19.0          (direct)
└── react-map-gl@8.1.0
    └── @vis.gl/react-maplibre@8.1.0
        └── maplibre-gl@5.19.0  (deduped)
```

### Exploitability na nossa app

- `MapView.tsx` usa `react-map-gl/maplibre` **Marker** + style URL MapTiler (`basic-v2`) ou fallback; **sem** `Popup.setHTML` / `setDOMContent` / `innerHTML` nosso.
- O vector de ataque documentado é **attribution HTML** (style/attribution não confiável).
- Style actual: **MapTiler hosted** (`api.maptiler.com/.../style.json?key=…`) — attribution vem do fornecedor de tiles (confiança em MapTiler), não de input de utilizador da app.
- Conclusão: advisory **aplica à versão instalada** (não é falso positivo). Exploit prático contra o nosso style MapTiler é **reduzido**, mas a lib vulnerável está no bundle; upgrade continua recomendado.

### Upgrade

- **Tipo:** **major** (5.19 → ≥6.4.1 / idealmente 6.10.x alinhado ao npm).
- **Risco:** breaking MapLibre 5→6 + possível necessidade de alinhar `react-map-gl` / `@vis.gl/react-maplibre`.
- **Não** é patch dentro de 5.x (fix só em 6.4.1+).

### `MAPLIBRE: CONFIRMED`

---

## 2. React Router — advisory exacto

### Factos

| Campo | Valor |
|---|---|
| Instalado | **`react-router-dom@7.13.0`** (direct) → **`react-router@7.13.0`** (transitive) |
| npm severity agregada | **high** |
| Latest npm (consulta 2026-09-16) | `react-router-dom@7.18.4`, `react-router@8.4.0` (major linha 8 existe; fix 7.x = **≥7.18.2** tipicamente) |
| App routing | **`BrowserRouter` SPA** apenas (`App.tsx`) — **sem** Framework Mode / SSR / RSC / single-fetch |

### Advisories relevantes (via `react-router` 7.13.0)

| GHSA | Sev | Range | Aplica ao nosso SPA? |
|---|---|---|---|
| GHSA-49rj-9fvp-4h2h (turbo-stream RCE) | high | ≥7.0 ≤7.14.1 | **Provavelmente NÃO** (SSR/deserialize) |
| GHSA-8646-j5j9-6r62 (RSC XSS redirect) | high | ≥7.7 <7.13.2 | **NÃO** (RSC) — e 7.13.0 ≥ 7.13.2? range `<7.13.2` → **7.13.0 ainda in-range** mas modo RSC |
| GHSA-8x6r-g9mw-2r78 (`__manifest` DoS) | high | ≥7.0 <7.15 | **NÃO** (framework endpoint) |
| GHSA-rxv8-25v2-qmq8 (single-fetch DoS) | high | ≥7.0 <7.14 | **NÃO** |
| GHSA-qwww-vcr4-c8h2 (RSC CSRF) | high | ≥7.12 <7.18.2 | **NÃO** |
| GHSA-chx6-hx7r-mcp5 (route matching DoS) | high | ≥7.0 <7.18 | **Possível** (client matcher) — impacto DoS browser |
| GHSA-wrjc-x8rr-h8h6 (open redirect `\` in Link/navigate) | moderate | ≥6 <7.18 | **SIM potencial** se `to=` / navigate usar input não sanitizado |
| GHSA-2j2x-hqr9-3h42 (protocol-relative `//`) | moderate | ≥7 <7.14.1 | **SIM potencial** |
| GHSA-84g9-w2xq-vcv6 (CSRF PUT/PATCH document) | low | ≥7.12 <7.15.1 | **Baixo** (SPA Bearer, sem document actions RR) |

### Superfícies nossas

- Auth: tokens em storage + `BrowserRouter`; login não depende de loaders/actions RR.
- Navigation: rotas internas tipicamente literais / role-based; risco open-redirect só se algum `navigate(userInput)` / `<Link to={userInput}>` existir sem validação (não auditado linha-a-linha nesta passagem — **NEEDS REVIEW** pontual).

### Upgrade

- Dentro da linha 7: **minor/patch** até **≥7.18.2** (recomendado para fechar o maior conjunto 7.x).
- Saltar para `react-router@8` = **major** separado (não necessário só para fechar GHSAs 7.x).

### `REACT_ROUTER: NEEDS REVIEW`

(Versão vulnerável **confirmada**; a maior parte dos “high” npm **não** mapeia para SPA `BrowserRouter`. Open-redirect / matching DoS merecem upgrade + grep de `navigate`/`Link` dinâmicos.)

---

## 3. Restantes npm vulnerabilities

Total audit: **20** (2 critical + 11 high + 4 moderate + 3 low). MapLibre + RR/RRD = 3 entradas; restantes **17** packages abaixo (+ vitest critical).

| Package | Advisory (resumo) | Runtime? | Direct/Transitive | Fixed in (npm) | Upgrade risk |
|---|---|---|---|---|---|
| **maplibre-gl** | GHSA-jrc7-96c5-q579 XSS | **Runtime browser** | Direct | ≥6.4.1 (npm sugere 6.10.0) | **Major** |
| **react-router** | múltiplos GHSA (SSR/RSC/DoS/redirect) | Runtime lib (SPA parcial) | Transitive | ≥7.18.x tipicamente | Minor 7.x |
| **react-router-dom** | via react-router | Runtime | Direct | ≥7.18.4 | Minor 7.x |
| **vitest** | UI arbitrary file read/exec + mocker | **Dev/test** | Direct | bump vitest 3→fix | Medium (tooling) |
| **@vitest/mocker** | path traversal | Dev/test | Transitive | com vitest | Low |
| **@playwright/test** | via playwright SSL | **Dev/test e2e** | Direct | ≥1.55.1 area | Low–med |
| **playwright** | SSL browser download | Dev/test | Transitive | ≥1.55.1 | Low–med |
| **vite** | path traversal / fs.deny / websocket (dev server) | **Build/dev** (prod = static assets) | Direct | >7.3.3 | Low–med |
| **undici** | vários TLS/header/cache | Transitive (vite/tooling) | Transitive | >7.28.0 | Low (tooling) |
| **postcss** | XSS stringify / sourceMappingURL | **Build** | Direct | >8.5.22 | Low |
| **browserslist** | OOM / prototype | Build | Transitive | >4.28.6 | Low |
| **brace-expansion** | ReDoS `{}` | Build/tooling | Transitive | bump | Low |
| **js-yaml** | DoS merge keys | Build/tooling | Transitive | >4.3.1 | Low |
| **nanoid** | infinite loop custom size | Build/tooling | Transitive | >3.3.17 | Low |
| **protocol-buffers-schema** | prototype pollution | Transitive (maplibre stack?) | Transitive | ≥3.6.1 | Low–med |
| **baseline-browser-mapping** | DoS invalid input | Build | Transitive | ≥2.11.0 | Low |
| **@humanfs/node** | symlink copy | Dev/tooling | Transitive | ≥0.16.8 | Low |
| **@babel/core** | sourceMappingURL file read | Build | Transitive | >7.29.0 | Low |
| **esbuild** | Windows dev server file read | Dev | Transitive | fora 0.27.3–0.28.0 | Low |
| **postcss-selector-parser** | AST DoS | Build | Transitive | fora 6.1.0–6.1.2 | Low |

### Runtime reais (utilizador final / browser prod)

1. **maplibre-gl** — CONFIRMED  
2. **react-router(-dom)** — NEEDS REVIEW (parcial)  
3. **protocol-buffers-schema** — possível transitivo do stack mapa — verificar path exacto antes de P1

### Dev/build/tooling (não servidos como API)

vitest, playwright, vite, undici, postcss, browserslist, babel, esbuild, js-yaml, nanoid, brace-expansion, humanfs, baseline-browser-mapping, postcss-selector-parser.

---

## 4. ENV staging — mapa e impacto de `ENV=staging`

### Resolução actual (`Settings`)

```text
ENVIRONMENT (se set) > ENV
is_production  ⇔ label ∈ {prod, production}
is_staging     ⇔ label ∈ {staging, stage}
is_development ⇔ NOT is_production   ← staging conta como “development”!
```

**Observado nos logs:** PROD e staging API logam `ENV=production ENVIRONMENT=None prod=True`.

### Consumers → comportamento

| Setting / helper | Consumers principais | Comportamento |
|---|---|---|
| `ENV` / `ENVIRONMENT` | `config.py`, startup log, Sentry fallback env | Label efectiva |
| `is_production_environment()` | alembic-on-startup, CORS strict, `/dev` off, OTP fixed-code gate, `allow_default_password` default, `is_forbidden_default_password`, Stripe webhook require | “Modo prod” |
| `is_staging_environment()` | `is_stripe_live_deploy()` | Staging + `STRIPE_MOCK=false` → regras live Stripe |
| `is_development_environment()` | CORS `*`, vários “não-prod” | **True sempre que não-prod** |
| `BETA_MODE` | auth login/Google/me, admin user ops, debug mount, driver auto-profile/dispatch, location ownership relax | Flag independente do ENV |
| `dev_tools_router_enabled()` | `/dev/*`, OTP print | OFF se prod; senão precisa `ENV=dev` **ou** `ENABLE_DEV_TOOLS` |
| `debug_router_enabled()` | `/debug/*` | Prod → só se BETA; **não-prod → sempre True** |

### Se staging passar de `ENV=production` → `ENV=staging`

| Área | Efeito | Class |
|---|---|---|
| **auth / login password** | Continua a depender de `BETA_MODE`, não de ENV | **neutral** (se BETA mantido) |
| **OTP** | Código fixo `123456` só com `ENABLE_DEV_TOOLS` **e** não-prod — com só `ENV=staging` **não** activa fixo | **neutral** (bom) |
| **OTP signup** | Sem alteração directa por ENV | neutral |
| **Stripe** | `is_stripe_live_deploy`: staging + `STRIPE_MOCK=false` → **ainda live rules**; com mock → não-live. `confirm_on_accept` segue isso | **intended** / verificar mock |
| **CORS** | `is_development_environment()` True → **`allow_origins=["*"]`, credentials False** | **dangerous** |
| **migrations** | `upgrade_to_head()` **deixa de correr** no startup | **dangerous** (drift schema) |
| **dev tools `/dev/*`** | Continua OFF salvo `ENABLE_DEV_TOOLS=true` (ENV≠dev) | **neutral** |
| **debug routes** | `debug_router_enabled()` → **sempre True** em não-prod | **dangerous** (superfície maior que prod+BETA) |
| **logging / Sentry env tag** | Pode passar a “staging” se `ENV` alimentar Sentry | **intended** |
| **test accounts** | Login test ainda exige BETA | neutral |
| **DEFAULT_PASSWORD guards** | `allow_default_password_login()` default **True** em não-prod (mas login actual **não chama** estes helpers — ver §7) | **neutral→unknown** residual |
| **HERE** | `ENABLE_HERE_TOLLS` / key — independente de ENV | neutral |
| **payments** | Ver Stripe acima | intended/dangerous conforme mock |
| **Google OAuth** | Gate é BETA + secrets; CORS `*` pode afectar cookies (app usa Bearer) | **neutral** (Bearer) / **dangerous** se no futuro cookies |
| **security guards** | Produção deixa de ser “prod” → vários defaults abrandam | **dangerous** |

**Conclusão:** **não** mudar só `ENV=staging` sem:

1. CORS explícito (lista staging origins) **ou** distinguir staging de development no código  
2. Estratégia Alembic (startup ou job)  
3. Decisão sobre `/debug` always-on  
4. Confirmar `STRIPE_MOCK` / live rules  

---

## 5. BETA_MODE em PROD — inventário

### O que `BETA_MODE=True` activa hoje

| Superfície | Protegido auth? | Dev guard? | PROD reachable? | Usado fluxo actual? | Seguro desligar? | Se `False` |
|---|---|---|---|---|---|---|
| `POST /auth/login` | rate-limit | — | **SIM** (404 se off) | **SIM** (LoginScreen) | **NÃO** | Login password **morrre** |
| `POST /auth/google/exchange` | rate-limit | — | SIM se OAuth cfg | SIM (passageiro Google) | NÃO sem alternativa | Google login 404 |
| `GET/PATCH /auth/me`, change password | JWT | — | SIM | SIM (conta M1) | NÃO | 404 |
| OTP request: só +351 + MAX_BETA_USERS | — | — | SIM | Parcial (API viva; FE wrappers dead) | Parcial | Abre OTP internacional / sem teto beta |
| OTP verify: cria user `pending` (passenger/driver request) | — | — | SIM | Se OTP usado | Parcial | Signup directo passenger active path diferente |
| Admin pending/list/promote/demote/update/delete/block/… | admin JWT | — | SIM | SIM backoffice beta | NÃO sem redesign | 404 / `[]` |
| `/config` → `beta_mode` + Google client id | public | — | SIM | **SIM** FE AuthContext | NÃO | FE sai do fluxo beta login |
| `/debug/*` mount | ver §8 | parcial | SIM mount | Ops/debug ocasional | Parcial | Router **desmontado** em prod |
| Auto-create `Driver` aprovado em location | driver JWT | — | SIM | BETA onboarding | NÃO sem KYC flow | `driver_not_found` |
| Auto-dispatch trip requested→assigned em location | — | — | SIM | Matching beta fallback | Desejável off a médio prazo | Só multi-offer/cron |
| Relax ownership em `get_driver_location_for_trip` | JWT | — | SIM | Multi-device beta | **SIM preferível off** | Ownership estrito |
| `request_trip` 5/min | JWT | — | SIM | Sempre (limiter **sempre** activo; comentário BETA no Settings está desactualizado) | — | Sem mudança |

### `BETA_MODE=False` em PROD hoje seria:

# **`NEEDS MIGRATION`**

**Evidência:** FE `AuthContext` usa `config.beta_mode` para o fluxo de sessão/login; `POST /auth/login` e Google exchange devolvem **404** sem BETA; admin user governance e auto-driver BETA caem. Não é “SAFE” nem um flip de flag.

---

## 6. Python runtime Render

### Decisão de pin (2026-09-16) — `chore/runtime-python-312-pin`

| Campo | Valor |
|---|---|
| **Runtime escolhido** | **`3.12.14`** |
| **Origem da versão** | Linha canónica do projecto = CI `3.12`; patch exacto = latest stable 3.12 na altura (endoflife.date + actions manifest) = **3.12.14** — não inventado |
| **Mecanismo canónico** | **`.python-version`** (conteúdo `3.12.14`) na **raiz do repo** e em **`backend/`** (Render `rootDir=backend`) |
| **Porquê não `PYTHON_VERSION` env** | Queremos pin **versionado no git**, auditável em PR; Render docs: `.python-version` é suportado (env `PYTHON_VERSION` tem precedência se alguém o definir no dashboard — evitar duplicar) |
| **CI** | `backend-ci.yml` + `web-e2e.yml` → `python-version: "3.12.14"` + step `Assert Python 3.12 line` (`python --version` + assert `sys.version_info[:2]==(3,12)`) |
| **Staging first** | Deploy do commit da branch em `tvde-staging-api` **antes** de merge/PROD |
| **PROD status** | **Não alterado** até staging validado + confirmação explícita / merge |

| Fonte | Versão |
|---|---|
| Repo `.python-version` / `backend/.python-version` | **`3.12.14`** (este PR) |
| Docs internos | Python **3.12** (CI, SSD readiness, guias) |
| CI `backend-ci.yml` / `web-e2e.yml` | **`python-version: "3.12.14"`** |
| Render PROD (antes do pin) | **`3.14.3 (default)`** |
| Render staging (antes do pin) | **`3.14.3 (default)`** |
| Render staging (após pin — ver §6b) | preencher após validação |
| Docs Render | Default **3.14.3** para services criados ≥ 2026-02-11 |

### Respostas

| Pergunta | Resposta |
|---|---|
| Python 3.14 escolhido explicitamente? | **NÃO** (default Render) |
| PROD e staging iguais (antes)? | **SIM** (ambos 3.14.3 default) |
| CI testa a mesma versão? | **SIM após este PR** (`3.12.14`) |
| Diferença CI vs PROD? | **SIM até PROD ser pinado** (PROD ainda 3.14.3) |
| Pin explícito? | **SIM — `.python-version` = `3.12.14`** |

### 6b. Staging validation log

| Check | Resultado |
|---|---|
| Staging version before | `3.14.3 (default)` |
| Staging version after | _pending deploy_ |
| Staging build | _pending_ |
| Staging `/health` | _pending_ |
| Tests / smokes | _pending_ |
| Warnings novos | _pending_ |
| PROD altered | **NÃO** |

---

## 7. DEFAULT_PASSWORD

### Callers

| Símbolo | Uso |
|---|---|
| `Settings.DEFAULT_PASSWORD = "123456"` | Constante + comentário “Legacy; not used for login after test-account MVP” |
| `allow_default_password_login()` / `is_forbidden_default_password()` | **Definidos em `config.py`; zero callers em `app/`** (só testes históricos referem DEFAULT_PASSWORD) |
| `_verify_login_password` | Exige `password_hash`; test accounts usam hash + BETA; **sem fallback para "123456"** |
| Test accounts | `TEST_ACCOUNT_PASSWORD` / `resolved_test_account_password()` — **outro** segredo |
| Privileged test roles | Bloqueados explicitamente no login |

### PROD (análise de código)

- Conta real **sem** hash → `password_not_set` / inválido — **não** autentica com "123456".
- Conta com hash próprio → só esse hash.
- Flag `ALLOW_DEFAULT_PASSWORD_LOGIN` **não liga** nenhum caminho actual de login.

### Verdict: **`SAFE LEGACY`**

( Remoção cosmética/P3 possível; **não** é P1 de autenticação activa. Manter hardening flags se no futuro se reintroduzir fallback. )

---

## 8. `/debug` em PROD

Router montado quando `debug_router_enabled()` → em prod **`BETA_MODE`**.

| Endpoint | Auth | Dev guard | PROD reachable? | Data exposed | Required today? |
|---|---|---|---|---|---|
| `GET /debug/driver-locations` | **Não** | **`_require_dev()` → 404 em prod** | **NÃO** (404) | Todas locations | Não |
| `GET /debug/trip-matching/{trip_id}` | JWT; **só passenger dono** | `_require_dev_or_beta` | **SIM** se BETA | Drivers loc/disponíveis, offers, root_cause | Útil ops; não essencial path feliz |
| `GET /debug/trip/{id}/logs` | JWT + trip access (pax/driver/admin) | `_debug_env_guard` (beta OK) | **SIM** | Buffer logs in-memory trip | Ops |
| `GET /debug/trip/{id}/summary` | JWT + trip access | idem | **SIM** | Timings/summary | Ops |
| `GET /debug/driver-eligibility` | JWT **driver** | `_require_dev_or_beta` | **SIM** | Location, offers, root_cause | Ops motorista |

**Nota:** não foram invocados endpoints em PROD nesta sessão (política READ-ONLY).

---

## 9. Reclassificação dos 5 P1 do relatório base

| P1 original | Após review | Acção |
|---|---|---|
| MapLibre critical | **P1 confirmado** | Upgrade major planeado + smoke mapas |
| React Router high | **P1→P2** (rebaixável) | Upgrade 7.18.x + grep Link/navigate; sem pânico RCE SSR |
| ENV staging = production | **P1 confirmado (decisão)** | Não flip cego; ver checklist §4 |
| BETA_MODE + debug em prod | **P1 confirmado (política)** | BETA **não** desligar sem migração auth; debug aceitável com JWT ou apertar depois |
| DEFAULT_PASSWORD | **P1→P3** (rebaixável) | SAFE LEGACY |
| Python 3.14 (do hygiene P2, elevado aqui) | **P1 de alinhamento CI/prod** | Pin 3.12/3.13 |

### P1s confirmados (manter)

1. MapLibre CVE-2026-85061 / GHSA-jrc7-96c5-q579  
2. Decisão ENV staging (não mudar sem mitigations)  
3. BETA_MODE é requisito do produto actual (não “desligar”)  
4. Pin Python Render ≠ CI  

### P1s rebaixáveis

1. React Router agregate high → **P2** (SPA)  
2. DEFAULT_PASSWORD → **P3**  
3. `/debug` surface → **P2** (auth’d; não é open unauthenticated)  

---

## 10. Remediation candidates

### Safe (após OK humano)

- Pin `PYTHON_VERSION=3.12.x` (ou 3.13.x) em **ambos** os serviços API + espelhar CI  
- Upgrade `react-router-dom` **7.13 → ≥7.18.2** (minor) + smoke rotas/auth  
- Grep/fix open-redirect em `Link`/`navigate` dinâmicos  
- Documentar checklist ENV staging (sem aplicar)  
- Remover ou esvaziar constante `DEFAULT_PASSWORD` em PR cosmético  

### Risky

- `maplibre-gl` 5→6 major (+ peers react-map-gl)  
- `ENV=staging` sem CORS/alembic/debug redesign  
- `BETA_MODE=False` em prod  
- `npm audit fix --force`  
- Desmontar `/debug` sem alternativa de suporte beta  

---

## 11. Recommended PR sequence

1. **docs-only** (este relatório) — merge review  
2. **`chore(runtime): pin Python 3.12 on Render + CI assert`** — zero feature risk relativo  
3. **`fix(deps): react-router-dom ≥7.18.2`** — smoke auth/navigation  
4. **`fix(deps): maplibre-gl ≥6.4.1` (+ peer)** — spike branch + smoke MapTiler/markers  
5. **Decisão produto:** plano de saída de BETA_MODE (auth OTP/password/Google) — **antes** de qualquer flip  
6. **Decisão infra:** ENV staging real **só** com PR de código que trate staging ≠ development (CORS/debug/alembic)

---

## 12. Controlo

| Item | Valor |
|---|---|
| production altered | **NÃO** |
| staging altered | **NÃO** |
| código app alterado | **NÃO** |
| relatório original hygiene | **intocado** |
| este ficheiro | `docs/analysis/P1_RUNTIME_SECURITY_REVIEW_2026-09.md` |

---

*Fim — decisões, não cleanup.*
