# Env — Single Reality (local · CI · Render)

Fonte de verdade **humana** para variáveis de ambiente. Objetivo: evitar deploys a falhar por inconsistências (ex: exigir secrets em modo mock).

## Hosts canónicos no repo (Render — exemplos)

Estes URLs aparecem como **ambiente de trabalho actual** na documentação operacional e no default de `CORS_ALLOWED_ORIGINS` em código; **não** são segredos. Confirmados no dashboard Render (serviços **tvde-app** / **tvde-api**, branch **main**, repo `frankbexxx/tvde`). Se renomeares ou recriares o serviço, actualiza **este bloco** e um `grep` pelos hosts antigos.

| Papel | Serviço Render | Tipo | URL |
|--------|----------------|------|-----|
| App | `tvde-app` | Static site | `https://tvde-app-j51f.onrender.com` |
| API | `tvde-api` | Web service (Python 3) | `https://tvde-api-fd2z.onrender.com` |

Em docs genéricos, preferir o padrão `https://tvde-api-XXXX.onrender.com` quando não for preciso um host concreto.

### Staging (A2-02)

Stack **separada** da tabela acima (**exemplos actuais:** `tvde-staging-db` / `tvde-staging-api` / `tvde-staging-app`). **Não** reutilizar `DATABASE_URL` de produção. App: `https://tvde-staging-app.onrender.com` · API: `https://tvde-staging-api.onrender.com`. Guia: [`docs/ops/STAGING_A2-02_RUNBOOK.md`](../ops/STAGING_A2-02_RUNBOOK.md). Redirect OAuth: [`docs/audit/AUDIT_EXEC_BACKLOG_AL_2026-05.md`](../audit/AUDIT_EXEC_BACKLOG_AL_2026-05.md) §A2-03.

## Nota `STRIPE_MOCK` (código vs template)

Em `backend/app/core/config.py` o campo `STRIPE_MOCK` tem default de **implementação** que pode diferir do que usas em `.env` / Render. **Regra operacional:** em piloto e templates, manter **`STRIPE_MOCK=true`** salvo janela explicitamente a testar Stripe real (alinhar com secção «Stripe por defeito é mock» acima).

## Regras base

- **Stripe por defeito é mock**: `STRIPE_MOCK=true`.
- Só usar Stripe real (test mode) quando for explicitamente testar pagamentos:
  - backend: `STRIPE_MOCK=false` + keys reais de teste
  - web-app: `VITE_STRIPE_MOCK=false` + `VITE_STRIPE_PUBLISHABLE_KEY` (test)

## Templates (copiar para `.env` locais)

- Backend: `docs/env/templates/backend.env.example` → copiar para `backend/.env`
- Web app: `docs/env/templates/web-app.env.local.example` → copiar para `web-app/.env.local`
- **Verificação local vs Render (tabelas):** [`docs/env/ENV_VARS_VERIFICATION.md`](ENV_VARS_VERIFICATION.md)

## Web App (Vite) — `VITE_*`

- **`VITE_API_URL`**
  - **default**: `/api` (proxy dev)
  - **E2E/CI**: `http://127.0.0.1:8000` (browser → API direto)
  - **Render**: URL do `tvde-api` (ex: `https://tvde-api-....onrender.com`)

- **`VITE_E2E`**
  - **usar só em Playwright/CI** (ativa hacks de E2E e tokens de dev)

- **`VITE_MAPTILER_KEY`**
  - necessário para mapa/geocoding (se vazio, pode degradar)

- **`VITE_SENTRY_DSN`** / **`VITE_SENTRY_RELEASE`**
  - opcional (observabilidade)

- **`VITE_DRIVER_HOME_TWO_STEP`** / **`VITE_DRIVER_BOTTOM_NAV`**
  - flags UX (beta)

- **`VITE_STRIPE_MOCK`**
  - recomendado: `true` por defeito

- **`VITE_STRIPE_PUBLISHABLE_KEY`**
  - só necessário se `VITE_STRIPE_MOCK=false`

- **`VITE_APP_DOWNLOAD_URL`**
  - opcional; destino canónico para rotas **`/dl`** e **`/app`** (página externa de download / loja). Se vazio ou ausente, o browser é enviado para a landing **`/download`** no mesmo deploy, com botão para **`/passenger`**.

## Backend (FastAPI) — `backend/app/core/config.py`

Obrigatórias sempre:

- **`DATABASE_URL`**
- **`JWT_SECRET_KEY`**
- **`OTP_SECRET`**

Ambiente:

- **`ENVIRONMENT`** (preferível) ou **`ENV`**
  - “prod” é decidido por `ENVIRONMENT` quando definido; senão por `ENV`

CORS:

- **`CORS_ALLOWED_ORIGINS`**
  - em produção precisa de pelo menos 1 origin (sem `*`)

Stripe:

- **`STRIPE_MOCK`**
  - recomendado: `true` por defeito
- **`STRIPE_SECRET_KEY`**
  - só obrigatório quando `STRIPE_MOCK=false`
- **`STRIPE_WEBHOOK_SECRET`**
  - só obrigatório quando `STRIPE_MOCK=false`
  - o endpoint `/webhooks/stripe` devolve 503 se não estiver configurado

CI/E2E:

- **`OFFER_TIMEOUT_SECONDS`**, **`E2E_KEEP_OFFERS_ALIVE`**, **`E2E_OFFER_TIMEOUT_FLOOR_SECONDS`**
  - usados para acelerar Playwright e evitar expiração de ofertas

## CI (GitHub Actions)

- **`STRIPE_MOCK=true`** sempre (sem dependências externas)
- E2E acelera ofertas (workflow define `OFFER_TIMEOUT_SECONDS=1` e floors E2E)

## Render (produção)

Checklist mínima:

- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `OTP_SECRET`
- `ENVIRONMENT=production` (ou `ENV=production`)
- `CORS_ALLOWED_ORIGINS=<frontend_render_url>,http://localhost:5173`
- `STRIPE_MOCK=true`

No **Static Site** (`tvde-app`), quando houver URL de download **externa** estável para materiais impressos, definir **`VITE_APP_DOWNLOAD_URL`** no *Build Environment*. Sem essa variável, **`/dl`** e **`/app`** abrem a rota interna **`/download`** (mesmo domínio), que liga a **`/passenger`**.

Rotacional (cabeçalho):

- **`ROTACIONAL_FEED_JSON`** (opcional, só **Web service** `tvde-api`): JSON com até ~24 entradas `{"text":"…","source":"meteo|prociv|transito|interno"}` — ver [`docs/product/ROTACIONAL_V2_SPEC.md`](../product/ROTACIONAL_V2_SPEC.md) e `GET /rotacional/messages`.

### Repor modo mock Stripe (pós-janela de testes)

Quando quiseres **desligar** Stripe test mode em produção e voltar à regra «mock por defeito»:

1. **Render → `tvde-api` → Environment:** `STRIPE_MOCK=true` → *Save* → redeploy.
2. **Render → `tvde-app` → Build / Environment:** `VITE_STRIPE_MOCK=true` (e **remover** ou deixar vazio `VITE_STRIPE_PUBLISHABLE_KEY` se não for necessário em mock) → novo *build* do static site.
3. Confirmar no admin **Operações** / fase0 que `STRIPE_MOCK` aparece como activo, e smoke rápido passageiro (copy de pagamento em mock).

**Decisão 2026-05-11:** reposto **mock** em piloto após validação webhook/PI em test mode.

Quando for **voltar** a testar Stripe real:

- `STRIPE_MOCK=false`
- `STRIPE_SECRET_KEY=sk_test_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...` (do endpoint de produção no Stripe)
- `tvde-app`: `VITE_STRIPE_MOCK=false` + `VITE_STRIPE_PUBLISHABLE_KEY` (test)

