# A2-02 — Ambiente de staging (Render)

**Objectivo:** segundo stack **PostgreSQL + API + Static Site**, isolado da produção, para OAuth com redirect “a sério”, smokes e merges sem tocar na BD de piloto.

**Referências:** deploy prod exemplo [`docs/deploy/PREPARACAO_RENDER.md`](../deploy/PREPARACAO_RENDER.md); env [`docs/env/ENV_SINGLE_REALITY.md`](../env/ENV_SINGLE_REALITY.md); URIs OAuth [`docs/audit/AUDIT_EXEC_BACKLOG_AL_2026-05.md`](../audit/AUDIT_EXEC_BACKLOG_AL_2026-05.md) §A2-03.

---

## 1. Decisão (mínimo)

| Decisão | Recomendação |
|--------|----------------|
| Nomes dos serviços | `tvde-staging-db`, `tvde-staging-api`, `tvde-staging-app` (ou prefixo que escolhas; **não** reutilizar `tvde-db` / `tvde-api` de prod) |
| Branch | `main` (igual à prod) ou branch de release — o importante é **BD e secrets diferentes** |
| Stripe | `STRIPE_MOCK=true` por defeito; webhook staging só se testares pagamento real em janela explícita |
| Google OAuth | Mesmo **OAuth client** que em dev, **com redirect URI de staging acrescentado** na consola Google (secção 4) |

---

## 2. Ordem de criação (Render)

1. **PostgreSQL** (nova instância; **Internal Database URL** para a API staging).
2. **Web Service** API — `Root Directory` `backend`; build/start como em [`PREPARACAO_RENDER.md`](../deploy/PREPARACAO_RENDER.md) passo 2.
3. **Static Site** app — `Root Directory` `web-app`; `Publish Directory` `dist`; regra SPA **`/*` → `/index.html` (Rewrite)**.
4. Após primeiro deploy da API: **`alembic upgrade head`** (Render Shell ou job one-shot com a mesma `DATABASE_URL` da staging).

**Regra:** `DATABASE_URL` da staging **nunca** é a URL da BD de produção.

---

## 3. Variáveis essenciais

### API (`tvde-staging-api`)

Copiar o bloco de prod e **substituir**:

- `DATABASE_URL` → Internal URL da **tvde-staging-db**
- `JWT_SECRET_KEY`, `OTP_SECRET` → **novos** valores (não reutilizar prod)
- `CORS_ALLOWED_ORIGINS` → URL **publicada** do static staging **+** `http://localhost:5173` se precisares de testar local contra API staging
- `GOOGLE_OAUTH_*` → template [`docs/env/templates/backend.env.example`](../env/templates/backend.env.example): `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` (secret só na API)
- Manter `STRIPE_MOCK=true` até haver motivo para o contrário
- `ENVIRONMENT=production` ou `ENV=production` é aceitável no Render; o que define “staging” é o **nome do serviço + BD + URLs**, não este flag

### Static (`tvde-staging-app`)

- `VITE_API_URL` → URL **https** do `tvde-staging-api` **sem barra final**
- Rebuild obrigatório após alterar qualquer `VITE_*`

---

## 4. Google Cloud Console

1. **APIs OAuth 2.0** → credenciais Web do projecto.
2. **Authorized JavaScript origins:** incluir origem do static staging (ex. `https://tvde-staging-app-xxxxx.onrender.com`).
3. **Authorized redirect URIs:**  
   `https://<host-staging-app>/auth/google/callback`  
   (deve coincidir byte a byte com o que o SPA usa.)

Alinhar com a tabela §A2-03 no backlog de auditoria: após criar serviços, **preencher a linha “Staging”** com esse host.

---

## 5. Verificações rápidas

| Passo | URL / acção | Esperado |
|-------|-------------|----------|
| Health | `GET https://<staging-api>/health` | 200 |
| Config | `GET …/config` | JSON inclui flags Google (`google_oauth_enabled`, `google_oauth_client_id`) quando env preenchido |
| CORS | Abrir staging app no browser, login | Sem erro de CORS na consola ao chamar API |
| OAuth | Login com Google (passageiro) | Callback `/auth/google/callback` sem `redirect_uri_mismatch` |

---

## 6. Smokes assertivos (checklist curto)

Executar **só com staging já criado** (e redirects Google actualizados):

- [ ] `/config` mostra Google disponível se quiseres OAuth ligado em staging.
- [ ] Fluxo Google: início → Google → retorno à app → sessão passageiro (ou erro controlado se conta em estado intermédio).
- [ ] OTP/login clássico ainda funciona (regressão rápida).
- [ ] (Opcional) Seed / dev tools conforme política de `ENABLE_DEV_TOOLS` na staging — **não** espelhar prod se for público.

---

## 7. Quando considerar A2-02 “fechado” no backlog

- Staging **deployada** (DB + API + app).
- URLs documentadas na §A2-03 do ficheiro de backlog (substituir *a definir*).
- Pelo menos uma passagem dos smokes da secção 6 registada (ex. no [`TODOdoDIA.md`](../TODOdoDIA.md) ou nota de sessão).
