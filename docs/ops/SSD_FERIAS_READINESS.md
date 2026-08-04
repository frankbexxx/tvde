# SSD / férias readiness — runbook operacional

**Estado:** execução parcial **2026-08-04** · tip referência `939b8a4`  
**Handoff:** [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md) · painel [`TODOdoDIA.md`](../../TODOdoDIA.md)  
**Envs (templates):** [`ENV_SINGLE_REALITY.md`](../env/ENV_SINGLE_REALITY.md) · [`BACKEND_PYTEST_SAFE.md`](../testing/BACKEND_PYTEST_SAFE.md)

Objectivo: levar o projecto numa SSD e usar no portátil nas férias **sem** depender da memória da máquina fixa, **sem** perder secrets, **sem** partir `main`.

---

## Checkpoint executado (**2026-08-04**)

| Item | Resultado |
|------|-----------|
| SSD | Disco **H:** |
| Clone | `H:\TVDE_BACKUP\APP` · branch `main` · tip **`939b8a4`** · `origin/main` alinhado · working tree limpa |
| Remote | `https://github.com/frankbexxx/tvde.git` |
| Runbook no clone | Presente |
| Secrets | Fora do repo: `H:\TVDE_SECRETS\backend.env` · `H:\TVDE_SECRETS\web-app.env.local` |
| Clone limpo de envs | **Sem** `backend/.env` · **sem** `web-app/.env.local` dentro de `H:\TVDE_BACKUP\APP` |
| Cifragem | **Pendente** — cifrar pasta `H:\TVDE_SECRETS` **antes da viagem** |
| Smoke portátil | **Pendente** |

**Próximos passos humanos**

1. Cifrar `H:\TVDE_SECRETS` (BitLocker / ZIP-7z password / VeraCrypt — à escolha).  
2. No portátil: abrir clone (ou copiar para disco interno) · validar `git status` / tip.  
3. Restaurar envs **apenas no portátil**: copiar para `backend/.env` e `web-app/.env.local` (não deixar plaintext permanente na SSD sem cifra).  
4. Smoke local mínimo: Docker `ride_postgres` · venv + alembic · `npm ci` · `/health` · Vite `:5173` (comandos §6).

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
