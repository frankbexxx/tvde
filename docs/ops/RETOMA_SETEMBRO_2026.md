# Retoma Setembro 2026 — ETAPA 01 (higiene operacional)

**Data diagnóstico:** 2026-09-01  
**Modo:** READ-ONLY (sem alterações de código, secrets, deploy ou commits neste relatório)  
**Pendência:** `S-OPS-01` · [`TVDE_STATUS_SETEMBRO_2026.md`](../TVDE_STATUS_SETEMBRO_2026.md)  
**Máquina:** PC principal (`C:\dev\APP`)

---

## 1. Git / repositório

| Item | Resultado |
|------|-----------|
| Branch actual | `main` |
| HEAD local | `b1e2b7d` — `docs(product): registar MOBILE-001 … (#541)` |
| `origin/main` | `b1e2b7d` (após `git fetch`) |
| Alinhamento | **OK** — ahead/behind `0/0` |
| Working tree | **Suja só por untracked** — `docs/TVDE_STATUS_SETEMBRO_2026.md` |
| Stash | **4 entradas** — `wip docs A+L painéis` · `wip backlog local` · `op-checklist` · `local backend drift` |
| Worktrees | 1 — `C:/dev/APP` @ `b1e2b7d` `[main]` |
| Branches locais | **~210** (muitas já mergeadas / remotes `gone`) |
| PRs abertas | **0** |
| Risco de perda de trabalho | **ATENÇÃO** — stashes antigos + ficheiro untracked do status Setembro; não há commits locais não pushed |

**Conclusão Git:** seguro retomar em `main` alinhada; não há divergência remota. Tratar stashes/untracked antes de `git clean` ou stash drop.

---

## 2. Backup pré-férias (SSD)

**Fontes no repo (sem inventar letra/caminho além do documentado):**

- [`docs/ops/SSD_FERIAS_READINESS.md`](SSD_FERIAS_READINESS.md)
- [`docs/ops/MODO_FERIAS_2026.md`](MODO_FERIAS_2026.md)

### Procedimento documentado

| Elemento | O que o runbook pede |
|----------|----------------------|
| Clone | Pasta tipo `TVDE_BACKUP\APP` na SSD (letras documentadas historicamente: **H:** PC origem · **D:** portátil MJ) |
| Secrets | **Fora** do clone: `TVDE_SECRETS\` (`backend.env`, `web-app.env.local`) |
| Refresh | `git pull --ff-only origin main` no clone no gatilho 13/14 ago |
| Cifragem | **Cifrar** `TVDE_SECRETS` (BitLocker / 7z / VeraCrypt) — nos docs pré-férias ainda **PENDENTE** |
| Verificação | Abrir SSD no portátil MJ; tip SHA = `origin/main`; smoke leve FE opcional; **sem** Docker/backend no MJ |

### Verificação neste PC (2026-09-01)

| Path documentado | Estado agora |
|------------------|--------------|
| `H:\TVDE_BACKUP\APP` | **ABSENT_OR_UNMOUNTED** |
| `D:\TVDE_BACKUP\APP` | **ABSENT_OR_UNMOUNTED** |
| `H:\TVDE_SECRETS` / `D:\TVDE_SECRETS` / `C:\dev\TVDE_SECRETS` | **ABSENT** |

**Não** foi feita comparação ficheiro a ficheiro (conforme pedido).  
**REQUER VERIFICAÇÃO EXTERNA:** montar SSD e confirmar clone + cifra dos secrets.

---

## 3. Configuração local (sem valores)

### Ficheiros

| Ficheiro | Estado |
|----------|--------|
| `backend/.env` | **PRESENT** |
| `web-app/.env.local` | **PRESENT** |
| `web-app/.env` | **ABSENT** (ok se só `.env.local`) |
| Templates `docs/env/templates/*` | **PRESENT** |

### Backend `.env` — presença de chaves

| Chave | Estado |
|-------|--------|
| `DATABASE_URL` | CONFIGURADO |
| `JWT_SECRET_KEY` | CONFIGURADO |
| `OTP_SECRET` | CONFIGURADO |
| `STRIPE_SECRET_KEY` | CONFIGURADO |
| `STRIPE_WEBHOOK_SECRET` | CONFIGURADO |
| `STRIPE_MOCK` | CONFIGURADO (`true` local) |
| `ENABLE_DEV_TOOLS` | CONFIGURADO (`false` local) |
| `BETA_MODE` | CONFIGURADO (`true` local) |
| `ENV` | CONFIGURADO (`dev`) |
| `GOOGLE_OAUTH_CLIENT_ID` / `SECRET` | CONFIGURADO |
| `REDIS_URL` | AUSENTE |
| `OSRM_BASE_URL` | AUSENTE |
| `SENTRY_DSN` (backend) | AUSENTE |
| `ENABLE_CONFIRM_ON_ACCEPT` | AUSENTE → default código `False` |
| `ENABLE_NEXT_TRIP_CHAINING` | AUSENTE → default `False` |
| `ENABLE_VEHICLE_COMPLIANCE_GATES` | AUSENTE → default `False` |
| `CORS_ALLOWED_ORIGINS` | AUSENTE |

### Frontend `.env.local`

| Chave | Estado |
|-------|--------|
| `VITE_MAPTILER_KEY` | CONFIGURADO |
| `VITE_STRIPE_MOCK` | CONFIGURADO (`true`) |
| `VITE_SENTRY_DSN` | CONFIGURADO |
| `VITE_API_URL` | AUSENTE (Vite proxy → `http://127.0.0.1:8000` — adequado a DEV) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | AUSENTE (coerente com mock local) |
| `VITE_APP_DOWNLOAD_URL` | AUSENTE |
| `VITE_E2E` | AUSENTE |

### Toolchain local

| Tool | Versão |
|------|--------|
| Python | 3.13.9 |
| Node | v24.11.1 |
| npm | 11.6.3 |
| Docker containers | **nenhum** a correr |
| `GET http://127.0.0.1:8000/health` | **200** `{"status":"ok"}` |

---

## 4. Produção / deploy

URLs canónicas nos ops docs (`DEMO_4_PAPEIS.md`, smokes):

| Serviço | URL / nota | Verificação 2026-09-01 |
|---------|------------|-------------------------|
| API Render | `https://tvde-api-fd2z.onrender.com` | **OK** — `GET /health` → 200 `{"status":"ok"}` |
| API diagnostic | `/health?diagnostic=1` | **OK** — 200 |
| Frontend Render | `https://tvde-app-j51f.onrender.com` | **OK** — 200 |
| PostgreSQL Render | `tvde-db` (docs) | **REQUER VERIFICAÇÃO EXTERNA** (dashboard) |
| Redis | se usado em prod | **REQUER VERIFICAÇÃO EXTERNA** · local `REDIS_URL` ausente |
| Cron/jobs Render | docs/histórico P5 | **REQUER VERIFICAÇÃO EXTERNA** |
| Stripe live / mock em prod | política piloto = mock ON | **REQUER VERIFICAÇÃO EXTERNA** (Render env) |
| `ENABLE_DEV_TOOLS` prod | docs: false (O-RENDER-1) | **REQUER VERIFICAÇÃO EXTERNA** |
| Vercel | não faz parte do path actual (static no Render) | N/A no kit actual |
| GitHub Actions | `backend-ci`, `web-e2e`, `frontend-ci` | ver §5 |

---

## 5. Testes e CI

| Item | Estado |
|------|--------|
| Últimos runs `main` (merge #541, 2026-08-11) | `backend-ci` **success** · `web-e2e` **success** |
| `frontend-ci` | Último success visto ~2026-08-03 (mais antigo que os outros) — **ATENÇÃO** / confirmar se ainda dispara em `main` |
| Backend tests | `backend/tests/test_*.py` (~74 ficheiros) |
| Playwright e2e | `web-app/e2e/*.ts` (admin, partner, driver-passenger, api-flows, …) |
| Skip/xfail | sobretudo gates de env (Postgres/OSRM) — não reavaliados nesta passagem |

### Smoke local recomendado (pós-férias, quando quiseres executar)

```powershell
# Git
git checkout main
git fetch origin
git pull --ff-only origin main
git status

# API já a responder localmente nesta sessão → opcional
# curl http://127.0.0.1:8000/health

# FE (outro terminal)
cd web-app
npm.cmd run dev
# abrir http://localhost:5173 · 1 login

# Prod (browser)
# https://tvde-api-fd2z.onrender.com/health
# https://tvde-app-j51f.onrender.com
```

Suites pesadas (`pytest`, Playwright completo): **não** corridas nesta ETAPA 01.

---

## 6. Estado operacional — sinais

| Sinal | Achado |
|-------|--------|
| Docs tip desactualizado | `TODOdoDIA` / `PROXIMA_SESSAO` / biblioteca ainda referem tips pré-`b1e2b7d` / MODO FÉRIAS OFF — **ATENÇÃO** docs |
| Cifra `TVDE_SECRETS` | Docs pré-férias: **PENDENTE**; neste PC pasta não visível — **REQUER VERIFICAÇÃO EXTERNA** |
| Flags perigosas locais | `STRIPE_MOCK=true`, `ENV=dev`, B2/PF3D defaults OFF — esperado DEV · **OK** |
| Mocks | Coerente com piloto; não confundir com prod live | **OK** (conhecido) |
| Cold start Render | Health respondeu rápido hoje | **OK** |
| Migrations pendentes | Não detectável sem BD; heads no repo intactos | **REQUER VERIFICAÇÃO EXTERNA** se houver dúvida de schema prod |
| Serviços suspensos | API+App responderam | **OK** no momento |
| Stash `local backend drift` | Pode conter alterações esquecidas | **ATENÇÃO** — inspeccionar antes de dropar |
| Higiene branches | ~210 locais | **ATENÇÃO** (R-GIT-1) — não bloqueia retoma |

---

## 7. Checklist ETAPA 01

| Check | Estado | Acção necessária |
|-------|--------|------------------|
| `main` = `origin/main` @ `b1e2b7d` | OK | — |
| Working tree sem alterações tracked | OK | Decidir commit/PR do `TVDE_STATUS_SETEMBRO_2026.md` quando quiseres |
| Untracked status Setembro | ATENÇÃO | Guardar via PR docs ou manter local consciente |
| Stashes (4) | ATENÇÃO | `git stash show -p stash@{n}` · dropar só após revisão |
| Branches locais (~210) | ATENÇÃO | Limpeza R-GIT-1 depois; não urgente para retoma |
| Prod API `/health` | OK | — |
| Prod App HTTP 200 | OK | — |
| Backend local `/health` | OK | — |
| Env local backend essencial | OK | — |
| `VITE_API_URL` | ATENÇÃO | Aceitável com proxy DEV; definir se FE for apontar a prod |
| MapTiler key local | OK | — |
| Stripe publishable FE | ATENÇÃO | Ausente + mock true — OK local; live exige keys |
| Redis local | ATENÇÃO | Ausente — confirmar se stack local precisa |
| Sentry backend local | ATENÇÃO | Ausente — opcional DEV |
| CI recente `main` | OK | backend-ci + web-e2e success 2026-08-11 |
| Frontend-ci frequência | ATENÇÃO | Último success mais antigo — confirmar workflow |
| SSD clone montado | REQUER VERIFICAÇÃO EXTERNA | Ligar SSD · `git log -1` no clone |
| `TVDE_SECRETS` cifrado | REQUER VERIFICAÇÃO EXTERNA | Confirmar pasta + cifra |
| Render Postgres / Redis / cron / envs prod | REQUER VERIFICAÇÃO EXTERNA | Dashboard Render |
| Alinhar tip nos painéis docs | ATENÇÃO | Actualizar `TODOdoDIA` / handoff na próxima sessão docs |

---

## Pode-se retomar desenvolvimento?

**SIM**

1. `main` local = `origin/main` (`b1e2b7d`); sem commits locais perdidos.  
2. Produção API + App respondem healthy.  
3. Backend local healthy; toolchain Python/Node presentes.  
4. Envs locais essenciais de DEV estão presentes (Stripe mock, JWT/OTP, MapTiler).  
5. Atenções (stash, SSD, secrets cifra, docs tip) **não** impedem começar código/docs — mas devem ser fechadas cedo para não acumular risco.

---

## 8. Acções para marcar ETAPA 01 como concluída

Ordem sugerida — **não executadas** nesta passagem:

1. **Humano / SSD:** montar disco · confirmar `TVDE_BACKUP\APP` tip · confirmar `TVDE_SECRETS` existe e está cifrado.  
2. **Humano / Render:** confirmar `STRIPE_MOCK`, `ENABLE_DEV_TOOLS`, Postgres, cron (checklist visual).  
3. **Git:** rever 4 stashes; decidir destino do untracked `docs/TVDE_STATUS_SETEMBRO_2026.md` (PR docs).  
4. **Docs:** actualizar tip/`MODO FÉRIAS` nos painéis para realidade pós-férias (retoma Setembro).  
5. **Opcional:** smoke browser prod (login 1 papel) + `npm.cmd run dev` no FE.  
6. **Depois:** só então declarar **S-OPS-01 Concluído** e abrir **ETAPA 02** (Demo Manel 2).

---

## Resultado ETAPA 01

| Campo | Valor |
|-------|--------|
| Estado | **PASS COM ATENÇÕES** |
| Bloqueadores | **0** |
| Atenções | **9** (ver checklist ATENÇÃO) |
| Verificações externas | **4** grupos: SSD · secrets cifra · Render dashboard · (opcional) frontend-ci |

**Não avançar para ETAPA 02 sem nova instrução.**
