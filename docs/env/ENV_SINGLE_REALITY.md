# Env — Single Reality (local · CI · Render)

Fonte de verdade **humana** para variáveis de ambiente. Objetivo: evitar deploys a falhar por inconsistências (ex: exigir secrets em modo mock).

## Regras base

- **Stripe por defeito é mock**: `STRIPE_MOCK=true`.
- Só usar Stripe real (test mode) quando for explicitamente testar pagamentos:
  - backend: `STRIPE_MOCK=false` + keys reais de teste
  - web-app: `VITE_STRIPE_MOCK=false` + `VITE_STRIPE_PUBLISHABLE_KEY` (test)

## Templates (copiar para `.env` locais)

- Backend: `docs/env/templates/backend.env.example` → copiar para `backend/.env`
- Web app: `docs/env/templates/web-app.env.local.example` → copiar para `web-app/.env.local`

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

Quando for testar Stripe real:

- `STRIPE_MOCK=false`
- `STRIPE_SECRET_KEY=sk_test_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...` (do endpoint de produção no Stripe)

