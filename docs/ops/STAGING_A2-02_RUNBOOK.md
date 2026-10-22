# A2-02 — Ambiente de staging (Render)

**Objectivo:** segundo stack **PostgreSQL + API + Static Site**, isolado da produção, para OAuth com redirect “a sério”, smokes e merges sem tocar na BD de piloto.

**Referências:** deploy prod exemplo [`docs/deploy/PREPARACAO_RENDER.md`](../deploy/PREPARACAO_RENDER.md); env [`docs/env/ENV_SINGLE_REALITY.md`](../env/ENV_SINGLE_REALITY.md); URIs OAuth [`docs/archive/audits/AUDIT_EXEC_BACKLOG_AL_2026-05.md`](../archive/audits/AUDIT_EXEC_BACKLOG_AL_2026-05.md) §A2-03; roster DEV (11 users) [`docs/testing/DEV_BASELINE_ROSTER.md`](../testing/DEV_BASELINE_ROSTER.md).

---

## Baseline efectivo STAGING (não confundir com DEV)

A BD **`tvde_staging_db`** **não** replica o wipe+seed de 11 utilizadores de DEV. Mantém-se um **baseline mínimo funcional** para OAuth, staff, Stripe TEST e smokes já validados.

| Item | STAGING efectivo (2026-10-21) | Notas |
|------|-------------------------------|--------|
| Utilizadores `active` | **5** | 1× passenger, driver, partner, admin, **super_admin** |
| Roster DEV completo | **11** previstos em [`DEV_BASELINE_ROSTER.md`](../testing/DEV_BASELINE_ROSTER.md) | **6 telefones ausentes** em STAGING (nunca seedados aqui) |
| Frota | **1** motorista aprovado, **1** viatura activa | DEV baseline prevê 4 drivers / 4 viaturas DEMO |
| Integridade | FK órfãos **0** (auditoria read-only) | `MISSING` ≠ corrupção — gap vs roster DEV |

**Telefones presentes (E.164, sem passwords):** `+351912345678` (passenger) · `+351911111111` (driver) · `+351955555502` (partner) · `+351900000000` (admin) · `+351924075365` (super_admin, conta staff + Google).

**Telefones DEV em falta em STAGING:** `+351911111114`, `+351938874006`, `+351918304615`, `+351918870365`, `+351967330628`, `+351939694569` — ver quadro DEV para papéis/nomes.

**Nomes:** podem diferir do label DEV (ex. super_admin com nome de perfil real vs `frank`; passageiro teste com nome = telefone). **Não** implica conta incorrecta.

### Preservar em STAGING (política)

Qualquer regularização futura **deve** preservar, salvo wipe explícito e aprovado:

- Conta **super_admin** staff existente e identidade **Google** associada.
- Histórico de **viagens**, **pagamentos**, **reembolsos** Stripe TEST, **`stripe_webhook_events`**, **audit_events**.

**Proibido por defeito:** reset global (`baseline_reset` / wipe de tabelas de negócio) em STAGING. Seed selectivo dos 6 utilizadores em falta: **adiado** até necessidade funcional demonstrada (E2E/smoke que exija um desses telefones).

Inventário read-only: `python tools/_staging_integrity_audit_readonly.py` (Render job, sem writes).

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
- **Estado actual (temporário):** `ENV=production` (ou `ENVIRONMENT=production`) em staging — o código trata isto como deployed-safe (CORS restrito, alembic no startup, `/dev` off)
- **Futuro (não aplicar nesta fase):** `ENV=staging` / `ENVIRONMENT=staging` **só depois** da semântica deployed estar em `main` (helpers `is_deployed` / `is_staging`). Com o código actual pós-`fix/env-deployed-semantics`, `ENV=staging` deixa de activar CORS `*` nem `/debug` always-on; confirma checklist CORS origins + `ENABLE_DEV_TOOLS=false` antes do flip
- O que define o stack de staging continua a ser **nome do serviço + BD + URLs**

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

- [x] `/config` mostra Google disponível se quiseres OAuth ligado em staging. *(Evidência: OAuth STG **PASS 21/10** · A2-02-1.)*
- [x] Fluxo Google: início → Google → retorno à app → sessão (staff / **super_admin** documentado **21/10**; callback sem `redirect_uri_mismatch`). *(Não exige repetição.)*
- [x] Login clássico / sessões por perfil (regressão §6 «OTP/login clássico» = **password** em deployed; **OTP signup** = **N/A** — ver §8). *(Acta consolidada **22/10** · §8 matriz.)*
- [x] *(Opcional — **N/A** fecho)* Seed / dev tools / `ENABLE_DEV_TOOLS` — política: staging deployed-safe; **não** espelhar prod público; item **opcional** do checklist.
- [x] Roster: testes usam **baseline efectivo** (5 users) — PR [#766](https://github.com/frankbexxx/tvde/pull/766); **não** seed dos 6 DEV em falta.

**Verificação operacional independente (fora deste fecho):** cron agendado em **`tvde-staging-api`** — ver [`TODO_CODIGO_TVDE.md`](../TODO_CODIGO_TVDE.md) §2 · [`TODOdoDIA.md`](../../TODOdoDIA.md) **TVDE-STG**.

---

## 7. Quando considerar A2-02 “fechado” no backlog

- Staging **deployada** (DB + API + app).
- URLs documentadas na §A2-03 do ficheiro de backlog (substituir *a definir*).
- Pelo menos uma passagem dos smokes da secção 6 registada (ex. no [`TODOdoDIA.md`](../TODOdoDIA.md) ou nota de sessão).

**Estado 2026-10-22:** critérios **satistfeitos** — registo canónico: **§8** abaixo + painel [`TODOdoDIA.md`](../../TODOdoDIA.md) **2026-10-22** (**A2-02-2 Concluído**).

---

## 8. Acta de encerramento — smokes assertivos A2-02-2 / F2.2 (**2026-10-22**)

**Decisão:** fecho **documental** de **A2-02-2** e roadmap **F2.2**, por **consolidação** de evidências **15–22/10/2026** — **sem novos testes** nesta acta.

### Referências (PRs / relatórios)

| Área | Referência |
|------|------------|
| Baseline STAGING (5 users) | PR [#766](https://github.com/frankbexxx/tvde/pull/766) · § baseline deste runbook |
| OAuth Google STAGING | **21/10/2026** · A2-02-1 · ROADMAP C3 |
| Logout Admin STG/PROD | PR [#765](https://github.com/frankbexxx/tvde/pull/765) · **PASS 22/10** |
| Stripe TEST / 3DS / reembolsos | PRs [#757](https://github.com/frankbexxx/tvde/pull/757)–[#764](https://github.com/frankbexxx/tvde/pull/764) · [`PILOT_STRIPE_STAGING_CHECKLIST.md`](../runbooks/PILOT_STRIPE_STAGING_CHECKLIST.md) **A–J** |
| II-C UX lista vazia | PR [#768](https://github.com/frankbexxx/tvde/pull/768) · STG 21/10 · PROD **22/10** |
| System Health Fase 1 | PR [#770](https://github.com/frankbexxx/tvde/pull/770) · doc [#771](https://github.com/frankbexxx/tvde/pull/771) · smokes STG/PROD **22/10** |

### Matriz consolidada — sessões STAGING (baseline § telefones)

**Legenda:** «Sessão autenticada documentada» = evidência de uso UI/API com JWT válido no host STAGING; **não** equivale, por si só, a acta técnica explícita «login password com telefone X». «Confirmação humana» = validação Frank **22/10** sem acta técnica dedicada no repo.

| Perfil | Login previsto | Evidência | Tipo de prova |
|--------|----------------|-----------|---------------|
| **Passageiro** (`+351912345678`) | Clássico (password demo) | #768 STG Conta `test_passenger` **21/10**; Manual UI pax Stripe **15–19/10**; confirmação navegação **22/10** | Sessão autenticada **documentada** + confirmação humana |
| **Motorista** (`+351911111111`) | Clássico (password demo) | Manual UI motorista Stripe **15–19/10**; confirmação **22/10** | Sessão autenticada **documentada** + confirmação humana |
| **Parceiro** (`+351955555502`) | Clássico (password) | **Sem** acta técnica STG datada 19–22/10 no repo | **Confirmação humana 22/10** apenas |
| **Admin** (`+351900000000`) | Clássico (password) | Reconcile Admin G/H **19/10**; System Health Admin **22/10** (#770); logout **#765** | Sessão autenticada **documentada** + confirmação humana |
| **Super_admin** (`+351924075365`) | **Google OAuth** (distinto de clássico) | OAuth **PASS 21/10** (A2-02-1) | **PASS documentado** (método Google) |

### Itens §6 classificados como N/A no fecho

| Item | Justificação |
|------|----------------|
| **OTP signup** em STAGING deployed | `503 otp_auth_unavailable` — [`S-AUTH-01_OTP_SMS_DECISION.md`](../architecture/S-AUTH-01_OTP_SMS_DECISION.md); critério §6 «clássico» = **password**, não OTP SMS |
| **Seed / dev tools** (opcional §6) | Opcional; staging **sem** wipe/seed global; `/dev` off em deployed |

### Ressalvas preservadas

1. **Parceiro:** fecho aceita **confirmação humana 22/10**; não há relatório técnico dedicado na janela 19–22/10.
2. **Password vs sessão:** a matriz **não** declara PASS técnico isolado de «password» onde só existe prova de **sessão autenticada** ou UI manual.
3. **Cron STAGING:** permanece **verificação operacional independente** (`TVDE-STG`); **não** condiciona este fecho.
4. **Não repetir** smokes já encerrados (Stripe A–J, OAuth SA, logout, Health, UX copy) salvo regressão comprovada.

### Fora de scope desta acta

- Stripe **LIVE** · SMS OTP real · reset BD STAGING · seed dos 6 utilizadores DEV em falta.
