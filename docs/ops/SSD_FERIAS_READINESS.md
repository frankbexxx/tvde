# SSD / férias readiness — runbook operacional

**Estado:** readiness parcial **PASS** · tip docs `c22331d` · **ainda NÃO em MODO FÉRIAS** · **cifra `TVDE_SECRETS` pendente** · limpeza leve MJ **PASS** 2026-08-07  
**Modelo canónico:** [`MODO_FERIAS_2026.md`](MODO_FERIAS_2026.md)  
**Handoff:** [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md) · painel [`TODOdoDIA.md`](../../TODOdoDIA.md) · Manel 2: [`DEMO_MANEL_2_SETEMBRO.md`](DEMO_MANEL_2_SETEMBRO.md)  
**Envs (templates):** [`ENV_SINGLE_REALITY.md`](../env/ENV_SINGLE_REALITY.md) · [`BACKEND_PYTEST_SAFE.md`](../testing/BACKEND_PYTEST_SAFE.md)

Objectivo: kit SSD + portátil para férias **sem** depender só da memória do PC fixo, **sem** perder secrets, **sem** partir `main`.

**Nota:** a SSD deve ser **actualizada de novo a 13/14 Agosto** (último pull) imediatamente antes da viagem — o clone actual é preparação, não o kit final.

---

## Checklist final pré-férias (executável)

### Já feito

| # | Item | Ref |
|---|------|-----|
| ✓ | SSD clone limpo + secrets **fora** do repo | #530 |
| ✓ | Portátil Maria João (`claud`) smoke **leve** PASS (Git/Node/`npm.cmd`/FE) | #531 |
| ✓ | Guião DEMO MANEL 2 Setembro | #532 · [`DEMO_MANEL_2_SETEMBRO.md`](DEMO_MANEL_2_SETEMBRO.md) |
| ✓ | Checklist risco operacional | #533 |
| ✓ | Modelo MODO FÉRIAS (ainda OFF) | #534 |
| ✓ | Limpeza leve portátil MJ (RAM ~3.4 GB livre; nada desinstalado) | 2026-08-07 |
| ✓ | B2 groundwork OFF (sem activar) | #525–#527 |
| ✓ | `main` tip referência docs | `c22331d` |

### Ainda falta (antes de viajar / gatilho 13–14 ago)

| # | Acção | OK? |
|---|--------|-----|
| 1 | **Cifrar** pasta `TVDE_SECRETS` na SSD (H: ou D:) — **PENDENTE** · BitLocker / 7z / VeraCrypt | ☐ |
| 2 | Confirmar 2.º sítio seguro da password do envelope (não no chat) | ☐ |
| 3 | **Dia 13/14:** PC principal `git pull` + tree limpa | ☐ |
| 4 | **Dia 13/14:** SSD `git pull` → tip do dia (= `origin/main`) | ☐ |
| 5 | Confirmar SSD lê no portátil MJ | ☐ |
| 6 | Anotar tip SHA final · só então **MODO FÉRIAS ON** ([`MODO_FERIAS_2026.md`](MODO_FERIAS_2026.md)) | ☐ |

### Validação mínima — PC principal

```powershell
git checkout main
git fetch origin
git pull --ff-only origin main
git status
git rev-parse HEAD
git rev-parse origin/main
# Esperado: limpo · HEAD = origin/main · tip do dia (ex. ≥ 3aa2583)
```

Opcional: `GET /health` na API Render → OK (prod).

### Validação mínima — SSD / portátil MJ

```powershell
cd D:\TVDE_BACKUP\APP   # ou H:\… conforme letra
git status
git pull --ff-only origin main
git log -1 --oneline
# Frontend (se precisar): npm.cmd --version · npm.cmd run build
# NÃO instalar Docker/backend · NÃO alterar Execution Policy
```

Prod no browser = caminho principal de emergência. FE local só até proxy (sem `:8000` = esperado).  
Operação em férias (branches/push/pós): ver [`MODO_FERIAS_2026.md`](MODO_FERIAS_2026.md).

### Se o PC principal falhar

| Continua a funcionar | Não contar com |
|----------------------|----------------|
| GitHub + `main` remota | Stack Docker/venv do PC fixo |
| Prod Render (app + API) | Backend local no portátil MJ |
| SSD clone + docs + guião Manel 2 | Secrets em plaintext sem cifra |
| Portátil MJ: FE build/dev leve + prod | Pytest / matching local completo |

### NÃO fazer em férias

- Activar `ENABLE_NEXT_TRIP_CHAINING` / B2 UI / matching chain  
- Stripe live · PF3D ON · docs reais/OCR  
- Commit directo em `main` · `git add` de `.env` / dumps / uploads  
- Colar secrets no chat · mexer envs Render sem necessidade  
- Instalar Docker/backend no portátil da Maria João  
- Limpar VPN/Office/OneDrive/Power BI/Autenticação.Gov/Brother  
- Bugbot / Cloud Agents / automações  
- Redispatch imediato / features “só porque há tempo”  

---

## Checkpoints executados

### 2026-08-04 — SSD (PC origem)

| Item | Resultado |
|------|-----------|
| SSD | Disco **H:** (noutro PC a letra pode ser **D:**) |
| Clone | `…\TVDE_BACKUP\APP` · `main` · tip então **`939b8a4`** · limpo |
| Secrets | Fora do repo: `…\TVDE_SECRETS\` — **sem** `.env` dentro do clone |
| Cifragem | **Pendente** antes da viagem |

### 2026-08-05 — Portátil Maria João Claudino (smoke **leve PASS**)

| Item | Resultado |
|------|-----------|
| Pessoa | Maria João Claudino · Windows user **`claud`** (abreviatura de Claudino) |
| SSD neste PC | **D:** · `D:\TVDE_BACKUP\APP` · `D:\TVDE_SECRETS` |
| Git | 2.55.0 · `git config --global --add safe.directory D:/TVDE_BACKUP/APP` (dubious ownership) |
| Tip no clone nesse dia | `939b8a4` — fazer `git pull` para tip actual (`94b479a`+) |
| Node | v24.19.0 · usar **`npm.cmd`** (Execution Policy; **não** alterar) |
| Frontend | `npm.cmd install` / `run build` / `run dev` **PASS** |
| Proxy `/api` → `:8000` | `ECONNREFUSED` — **esperado** sem backend local |
| Docker / backend local | **Não** instalar (decisão humana) |
| Software da Maria João | Críticos **preservados** (VPN, Office, OneDrive, Power BI, Autenticação.Gov, Brother) |

### 2026-08-07 — Limpeza leve portátil MJ (**PASS**)

| Item | Resultado |
|------|-----------|
| RAM pós-restart | ~**3.43 GB** livres / 8.22 GB (antes ~0.7–1.2 GB) |
| Feito | Startup reduzido · Chrome Memory Saver · WPS scheduled tasks off (`WpsExternal_claud_*`, `WpsUpdateTask_claud`) |
| Não feito | Desinstalar · Docker · backend · mexer McAfee `\McAfee\WPS\` · apagar dados Chrome |
| Residual opcional | PhoneExperienceHost (~178 MB) via Definições |
| Decisão | Fechada — portátil mais apto como máquina leve/emergência |

**Papel validado:** emergência / férias = máquina activa **leve** · GitHub = verdade · docs/repo · FE até proxy · **prod no browser**. Stack completa = PC fixo.

### Próximos passos humanos

Ver **Checklist final pré-férias** (topo). Único blocker de viagem: **cifrar `TVDE_SECRETS`**.

Sem valores de secrets neste documento.

---

## 0. Princípios

1. Preferir **`git clone` / `git pull`** na SSD em vez de copiar pastas “sujas”.
2. Secrets **fora** do chat e **fora** do git — envelope cifrado separado.
3. No portátil: **recriar** `venv` e `node_modules` (nunca confiar em cópia).
4. Trabalho em **branch** `fix/…` / `docs/…` — nunca commits directos em `main`.
5. Pytest **só** BD local — ver [`BACKEND_PYTEST_SAFE.md`](../testing/BACKEND_PYTEST_SAFE.md).

---

## 1. Checklist — máquina origem (antes da cópia)

| # | Acção | OK? |
|---|--------|-----|
| 1 | `git checkout main` | ☐ |
| 2 | `git fetch origin` · `git pull --ff-only origin main` | ☐ |
| 3 | `git status` → working tree **limpa** | ☐ |
| 4 | `git rev-parse HEAD` = `git rev-parse origin/main` | ☐ |
| 5 | Confirmar `backend/.env` e `web-app/.env.local` **existem** e estão **gitignored** | ☐ |
| 6 | Preparar **envelope secrets** cifrado (ver §5) — **sem** colar valores em chat | ☐ |
| 7 | Anotar tip SHA num papel/password manager (não o conteúdo dos `.env`) | ☐ |
| 8 | Opcional: `git check-ignore -v backend/.env web-app/.env.local` | ☐ |

---

## 2. Checklist — SSD (o que vai / o que não vai)

### 2.1 Devem ir

| Conteúdo | Como |
|----------|------|
| Código versionado + `.git` | `git clone https://github.com/frankbexxx/tvde.git` na SSD **ou** mirror limpo após `pull` |
| Branch | `main` no tip conhecido |
| Docs / scripts | Vêm com o clone |
| Templates env | `docs/env/templates/*` (seguros, sem secrets reais) |
| Envelope secrets | Arquivo **encriptado** à parte (ZIP/7z password, BitLocker, VeraCrypt) — **não** plaintext solto |

### 2.2 NÃO devem ir (ou regenerar no portátil)

| Pasta / ficheiro | Motivo |
|------------------|--------|
| `backend/venv/`, `.venv/` | Paths/máquina-específicos |
| `web-app/node_modules/`, `web-app/dist/` | Regenerável; enorme |
| `uploads/`, `backend/uploads/` | Dados locais / PII |
| `*.dump`, dumps SQL soltos, exports | Volume + risco |
| `*_pytest_out.txt`, `.pytest_cache/`, `test-results/`, `htmlcov/` | Lixo |
| Secrets em plaintext na raiz da SSD | Risco se SSD se perder |
| Contas `sk_live` / Stripe live | Fora de scope férias; fica no Render |

### 2.3 Opções de cópia

| Método | Quando |
|--------|--------|
| **A — clone fresco na SSD** | Preferido |
| **B — robocopy/xcopy sem artefactos** | Se já tens clone; excluir `venv`, `node_modules`, caches |
| **C — trabalhar no disco interno do portátil** | SSD só como mirror/backup (melhor performance) |

---

## 3. Checklist — portátil (primeira abertura)

| # | Acção | OK? |
|---|--------|-----|
| 1 | Instalar: Git · **Python 3.12** · **Node 18+** · Docker Desktop · Windows Terminal · Cursor (opc.) · `gh` (opc.) | ☐ |
| 2 | Abrir repo (SSD ou cópia para disco interno) | ☐ |
| 3 | `git status` + `git log -1 --oneline` = tip esperado | ☐ |
| 4 | Restaurar envelope → `backend/.env` + `web-app/.env.local` | ☐ |
| 5 | Docker Desktop **running** | ☐ |
| 6 | Postgres: `docker start ride_postgres` (ou criar contentor — §6) | ☐ |
| 7 | Backend: venv + `pip install` + `alembic upgrade head` | ☐ |
| 8 | Frontend: `npm ci` | ☐ |
| 9 | Launcher `scripts\windows\Open-TVDE-Dev-WT.bat` **ou** arranque manual §6 | ☐ |
| 10 | Smoke: `GET /health` + abrir `http://localhost:5173` + 1 login demo | ☐ |

**Modo “só consultar”:** sem Docker — ler docs + GitHub + prod Render (precisa internet).

---

## 4. Ficheiros env — estratégia (sem valores neste doc)

### Nomes a ter no envelope (valores **nunca** no chat / neste MD)

**Backend (`backend/.env`) — tipicamente:**

- `DATABASE_URL` — local: Postgres Docker `localhost` / `ride_db` (**nunca** URL Render em pytest)
- `JWT_SECRET_KEY`, `OTP_SECRET`
- `ENV` / `ENVIRONMENT` = `dev`
- `ENABLE_DEV_TOOLS`, `STRIPE_MOCK=true`
- `CORS_ALLOWED_ORIGINS` (incluir `http://localhost:5173`)
- Opcionais: Map/OAuth/cron só se precisares offline avançado

**Web (`web-app/.env.local`) — tipicamente:**

- `VITE_API_URL` (dev: `/api` ou proxy)
- `VITE_STRIPE_MOCK=true`
- `VITE_MAPTILER_KEY` se mapa local for necessário

**Templates no repo (seguros):**

- `docs/env/templates/backend.env.example` → copiar para `backend/.env` e preencher do envelope
- `docs/env/templates/web-app.env.local.example` → `web-app/.env.local`

**Segundo sítio:** password manager ou USB cifrada de backup.

---

## 5. Envelope secrets — como guardar

| Prática | |
|---------|--|
| Formato | ZIP/7z **com password** **ou** volume BitLocker/VeraCrypt |
| Conteúdo | Só `backend/.env` + `web-app/.env.local` (e lista de tip SHA) |
| Local | SSD + **cópia** noutro sítio seguro |
| Proibido | Colar secrets no Cursor/chat · commit · email/WhatsApp plaintext |

Validação: `Test-Path backend\.env` e `web-app\.env.local` = True · `git status` limpo.

---

## 6. Comandos mínimos

```powershell
# --- Git ---
git checkout main
git fetch origin
git pull --ff-only origin main
git status
git log -1 --oneline
git rev-parse HEAD
git rev-parse origin/main

# --- Docker / Postgres ---
docker version
docker start ride_postgres
# Primeira vez (se contentor não existir) — ver também scripts/1_start_db.ps1:
# docker run --name ride_postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ride_db -p 5432:5432 -d postgres

# --- Backend ---
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Health
curl http://127.0.0.1:8000/health
# ou: Invoke-WebRequest http://127.0.0.1:8000/health

# --- Frontend ---
cd web-app
npm ci
npm run dev
# Abrir http://localhost:5173

# --- Pytest seguro (BD local; NÃO Render) ---
# A partir da raiz do repo:
.\scripts\windows\Invoke-BackendPytest.ps1
```

**Launcher Windows Terminal (preferido):**

```text
scripts\windows\Open-TVDE-Dev-WT.bat
```

Abre abas Backend / Frontend / Postgres / Utils (+ Cursor). Ver [`scripts/windows/README.md`](../../scripts/windows/README.md).

---

## 7. Plano offline / online fraco

| Cenário | O que fazer |
|---------|-------------|
| **Offline total** | Ler docs · editar código local · notas; **sem** pull/push/CI/Render |
| **Offline + Docker OK** | Stack local completa com `STRIPE_MOCK=true` |
| **Online fraco** | Preferir **prod Render** para ver apps; local só para debug |
| **Só acompanhar** | GitHub + Render + telemóvel; SSD = backup |

---

## 8. Riscos

| Risco | Mitigação |
|-------|-----------|
| SSD perdida com secrets plaintext | Envelope cifrado + 2º backup |
| `venv` / `node_modules` copiados | Sempre recriar no portátil |
| Docker não sobe / WSL lento em USB | Plano B: prod Render ou só docs; preferir disco interno |
| Pytest / app contra BD Render | `DATABASE_URL` local · `Invoke-BackendPytest.ps1` |
| `main` suja / commit directo | Branch por tarefa; `pull --ff-only` |
| Path D: vs C: | Activar venv relativo; não hardcodar caminhos antigos |

---

## 9. Não fazer

- Colar secrets / passwords / keys no chat Cursor  
- `git add` de `.env`, `.env.local`, dumps, uploads  
- Trabalhar / commit directo em `main`  
- Correr testes ou app local apontados à BD **Render**  
- Levar dumps SQL, `uploads/`, PII na SSD sem necessidade  
- Activar B2 / Stripe live / PF3D / docs reais “porque estás de férias”  
- Bugbot / Cloud Agents / automações  

---

## 10. Smoke mínimo pós-arranque

| Check | Esperado |
|-------|----------|
| `git status` | limpo |
| `docker ps` | `ride_postgres` Up |
| `GET /health` | 200 / ok |
| `npm run dev` | Vite em `:5173` |
| Login demo Pax ou Driver | OK (password demo contas teste) |

Baseline phones: ver handoff [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md) (secção Ambiente).

---

## 11. Referências

| Doc | Uso |
|-----|-----|
| [`GUIA_TESTES.md`](../testing/GUIA_TESTES.md) | Setup longo Docker/Python/Node |
| [`ENV_SINGLE_REALITY.md`](../env/ENV_SINGLE_REALITY.md) | Vars canónicas |
| [`BACKEND_PYTEST_SAFE.md`](../testing/BACKEND_PYTEST_SAFE.md) | Guard pytest ≠ Render |
| [`DEMO_4_PAPEIS.md`](DEMO_4_PAPEIS.md) | Smoke 4 papéis (prod) |
| [`scripts/windows/README.md`](../../scripts/windows/README.md) | Launchers WT |

---

**Frase de fecho:** SSD = clone limpo + envelope cifrado. Portátil = reinstalar deps + Docker. Férias = preferir prod/docs; código só em branch. Secrets nunca no chat nem no git.
