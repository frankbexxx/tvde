# Passo a passo — Stripe + Render (sem confusão)

---

## O que já tens (está correto)

| Onde | O quê | Estado |
|------|-------|--------|
| TVDE-api (Render) | STRIPE_SECRET_KEY, JWT, OTP, DATABASE_URL, etc. | OK |
| TVDE-app (Render) | VITE_API_URL = https://tvde-api-fd2z.onrender.com | OK |
| Stripe | sk_test e pk_test | OK |

---

## Única coisa a verificar: Webhook no Stripe

### Passo 1 — Abrir os Webhooks

1. Abre o **Stripe Dashboard**
2. Menu lateral: **Developers** → **Webhooks**
3. Clica em **Webhooks**

### Passo 2 — Ver se o endpoint existe

Procura um endpoint com esta URL:

```
https://tvde-api-fd2z.onrender.com/webhooks/stripe
```

**Se existir:** vai ao Passo 3.  
**Se NÃO existir:** clica em **Add endpoint** e coloca essa URL. Depois vai ao Passo 3.

### Passo 3 — Copiar o Signing secret

1. Clica no endpoint (o que tem a URL do Render)
2. Na secção **Signing secret**, clica em **Reveal**
3. Copia o valor (começa por `whsec_...`)

### Passo 4 — Atualizar no Render

1. Abre o **Render Dashboard**
2. Entra no serviço **TVDE-api** (não na TVDE-app)
3. Menu lateral: **Environment**
4. Procura a variável **STRIPE_WEBHOOK_SECRET**
5. Clica em **Edit**
6. Cola o valor que copiaste no Passo 3
7. Guarda (Save)

### Passo 5 — Redeploy (se o Render não fizer sozinho)

Se o Render não redeployar automaticamente após guardar as variáveis:

1. Na página do TVDE-api, clica em **Manual Deploy** → **Deploy latest commit**

---

## Resumo

- **Stripe Dashboard** → Webhooks → endpoint com URL do Render → Signing secret  
- **Render** → TVDE-api → Environment → STRIPE_WEBHOOK_SECRET = esse valor  

Nada mais. Quando isto estiver feito, podes testar a app.
