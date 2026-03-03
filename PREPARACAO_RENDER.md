# Preparação para Deploy no Render

Guia passo a passo para colocar a TVDE no Render e preparar a validação humana em campo.

---

## Visão geral

| Serviço | Tipo | Descrição |
|---------|------|-----------|
| **tvde-db** | PostgreSQL | Base de dados |
| **tvde-api** | Web Service | Backend FastAPI |
| **tvde-app** | Static Site | Web app React |

**Ordem de criação:** 1) PostgreSQL → 2) Backend → 3) Stripe Webhook → 4) Frontend

---

## Pré-requisitos

- [ ] Conta no [Render](https://render.com)
- [ ] Repositório Git (GitHub, GitLab ou Bitbucket) com o código
- [ ] Conta Stripe (modo teste)
- [ ] Código em `main` ou branch que queres usar

---

## Passo 1 — PostgreSQL

1. No [Render Dashboard](https://dashboard.render.com), clica **New +** → **PostgreSQL**.
2. Configura:
   - **Name:** `tvde-db`
   - **Region:** `Frankfurt (EU Central)` ou o mais próximo
   - **Database:** `ride_db` (ou o nome que preferires)
   - **User:** `tvde` (ou deixar o default)
   - **Plan:** Free

3. Clica **Create Database**.
4. Quando estiver pronto, abre o serviço e copia o **Internal Database URL** (formato `postgresql://user:pass@host/dbname`).
5. Guarda este URL — vais precisar para o backend.

---

## Passo 2 — Backend (Web Service)

1. **New +** → **Web Service**.
2. Liga o repositório (GitHub/GitLab/Bitbucket).
3. Configura:

| Campo | Valor |
|-------|-------|
| **Name** | `tvde-api` |
| **Region** | Mesmo do PostgreSQL |
| **Branch** | `main` (ou a tua) |
| **Root Directory** | `backend` |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

4. **Environment Variables** — adiciona:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Cola o Internal Database URL do Passo 1 |
| `ENV` | `production` |
| `JWT_SECRET_KEY` | Gera um segredo forte (ex: `openssl rand -hex 32`) |
| `JWT_ALGORITHM` | `HS256` |
| `OTP_SECRET` | Gera outro segredo (ex: `openssl rand -hex 16`) |
| `STRIPE_SECRET_KEY` | `sk_test_...` (do Stripe Dashboard) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_placeholder` (temporário — atualizas no Passo 3) |
| `ENABLE_DEV_TOOLS` | `true` (permite Seed e Tokens em produção — para validação em campo) |

5. Clica **Create Web Service**.
6. Espera o deploy terminar. O backend exige `STRIPE_WEBHOOK_SECRET` em produção — usamos placeholder para o primeiro deploy. No Passo 3 substituímos pelo valor real do Stripe.
7. Copia o **URL** do serviço (ex: `https://tvde-api.onrender.com`). Vais precisar para o Stripe e para o frontend.

---

## Passo 3 — Stripe Webhook

1. Abre o [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**.
2. Clica **Add endpoint**.
3. **Endpoint URL:** `https://tvde-api.onrender.com/webhooks/stripe` (substitui pelo teu URL do backend).
4. **Events to send:** seleciona `payment_intent.succeeded` e `payment_intent.payment_failed` (e `charge.payment_failed` se existir).
5. Clica **Add endpoint**.
6. Abre o novo webhook e clica **Reveal** no **Signing secret** (começa por `whsec_...`).
7. Copia o valor.
8. No Render, volta ao serviço **tvde-api** → **Environment** → edita `STRIPE_WEBHOOK_SECRET` e cola o valor. Se usaste placeholder, atualiza agora.
9. **Save Changes** — o Render faz redeploy automaticamente.

---

## Passo 4 — Frontend (Static Site)

1. **New +** → **Static Site**.
2. Liga o mesmo repositório.
3. Configura:

| Campo | Valor |
|-------|-------|
| **Name** | `tvde-app` |
| **Branch** | `main` |
| **Root Directory** | `web-app` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

4. **Environment Variables** — adiciona:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://tvde-api.onrender.com` (o URL do teu backend) |

5. Clica **Create Static Site**.
6. Espera o build terminar.
7. **Redirects/Rewrites** (obrigatório para SPA): No serviço **tvde-app** → **Settings** → secção **Redirects/Rewrites** → **Add Rule**:
   - **Source:** `/*`
   - **Destination:** `/index.html`
   - **Action:** Rewrite
   (Isto evita 404 ao recarregar em `/passenger` ou `/driver`.)
8. Copia o **URL** do site (ex: `https://tvde-app.onrender.com`).

---

## Passo 5 — Seed e teste

1. Abre o URL do frontend no browser.
2. Expande **Dev** (▶ Dev) e clica **Seed**.
3. A página recarrega. Se aparecer erro, verifica se o backend está a correr e se não há erros nos logs do Render.
4. Testa o fluxo: Passageiro → Pedir viagem → Motorista → ACEITAR → Cheguei → Iniciar → Concluir.

---

## Notas importantes

### Render Free Tier

- O backend **adormece** após ~15 min sem tráfego. O primeiro request pode demorar 30–60 s.
- O PostgreSQL tem limite de dados e conexões.
- Para validação humana, o adormecimento pode ser aceitável — avisa os testadores que o primeiro carregamento pode demorar.

### URLs

- **Frontend:** `https://tvde-app.onrender.com` (ou o nome que escolheste)
- **Backend:** `https://tvde-api.onrender.com`
- **Health check:** `https://tvde-api.onrender.com/health`

**URLs em produção (atual):**

- **Backend:** `https://tvde-api-fd2z.onrender.com`
- **Health check:** `https://tvde-api-fd2z.onrender.com/health`

### Stripe

- Usa **modo teste** (chaves `sk_test_...` e `pk_test_...`).
- O webhook usa o **Signing secret** do endpoint de produção (o URL do Render), não o do `stripe listen`.

### Logs

- No Render: Dashboard → serviço → **Logs** para ver erros e output do backend.

### DATABASE_URL

- Se a password do PostgreSQL tiver `@`, o backend codifica-a automaticamente. Não é preciso alterar manualmente.

---

## Checklist final

- [ ] PostgreSQL criado e URL copiado
- [ ] Backend deployado e a responder em `/health`
- [ ] Stripe webhook criado e secret configurado
- [ ] Frontend deployado com `VITE_API_URL` correto
- [ ] Redirects/Rewrites: `/*` → `/index.html` (Rewrite) para SPA
- [ ] Seed executado com sucesso
- [ ] Fluxo completo testado (passageiro + motorista)
