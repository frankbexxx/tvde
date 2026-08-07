# MODO FÉRIAS 2026 — operação segura

**Estado actual: ainda NÃO estamos em MODO FÉRIAS.**  
**Tip `main` referência:** `c22331d` (actualizar após pull)  
**Calendário:** férias **14–31 agosto** · entrada oficial **13/14 ago** (após gatilho abaixo)  
**Handoff:** [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md) · painel [`TODOdoDIA.md`](../../TODOdoDIA.md)  
**SSD detalhe:** [`SSD_FERIAS_READINESS.md`](SSD_FERIAS_READINESS.md) · Manel 2: [`DEMO_MANEL_2_SETEMBRO.md`](DEMO_MANEL_2_SETEMBRO.md)

Sem passwords / valores de secrets neste ficheiro.

---

## 1. Estado actual (pré-férias)

| Papel | Agora (até ~13 ago) |
|-------|---------------------|
| **PC principal** | Máquina activa normal |
| **GitHub** | Fonte da verdade remota |
| **SSD** | Backup operacional **em preparação** (já clonada; **não** é ainda o kit de viagem final) |
| **Portátil Maria João** (`claud`) | Emergência / teste **leve** — já validada (#531) |
| **MODO FÉRIAS** | **OFF** |

Já feito: #530 clone+secrets fora repo · #531 smoke leve MJ · #532 guião Manel 2 · #533 checklist pré-férias.  
Ainda pendente: **cifrar `TVDE_SECRETS`** · **refresh SSD no dia 13/14**.

---

## 2. Gatilho — entrar em MODO FÉRIAS

Entrada **oficial** só no **13 ou 14 de Agosto**, depois de **tudo** isto:

| # | Acção | OK? |
|---|--------|-----|
| 1 | PC principal: `main` limpa e = `origin/main` | ☐ |
| 2 | Actualizar SSD (`git pull` no clone) para o tip do dia | ☐ |
| 3 | **Cifrar `TVDE_SECRETS`** (ainda pendente até lá) | ☐ |
| 4 | Confirmar SSD abre / lê no portátil MJ | ☐ |
| 5 | Confirmar `main` limpa/alinhada **também** na SSD | ☐ |

Só então: **MODO FÉRIAS = ON** (registo no painel/handoff nesse dia).

---

## 3. Antes das férias (checklist)

| # | Acção | OK? |
|---|--------|-----|
| 1 | Trabalho normal no PC principal até 13/14 | ☐ |
| 2 | PRs mergeados / tree limpa no PC | ☐ |
| 3 | Dia 13/14: refresh SSD + cifra secrets + smoke leitura no portátil | ☐ |
| 4 | Anotar tip SHA final num papel / password manager | ☐ |
| 5 | Limpeza **leve** no portátil MJ | ✓ **2026-08-07** — ver §9 |
| 6 | Guião Manel 2 à mão (Setembro) | ☐ |

---

## 4. Durante férias — regras

| Papel | Em férias |
|-------|-----------|
| **Portátil MJ** | Máquina activa de trabalho / teste leve |
| **GitHub** | Fonte da verdade — **push frequente** |
| **SSD** | Repo + `TVDE_SECRETS` **cifrada** + backup |
| **PC principal** | Pode estar desligado / inacessível |

### Git

1. Sempre branch pequena: `docs/…` · `fix/…` · `chore/…`  
2. **Nunca** trabalhar / commit directo em `main`  
3. Push frequente para `origin`  
4. PR pequeno quando possível  
5. Se não houver tempo para PR/merge: **pelo menos branch pushed** no GitHub  
6. **Não** deixar alterações só no portátil / só na SSD  

### Preferências de trabalho

| Preferir | Adiar (pós-férias) |
|----------|-------------------|
| Docs · polish FE · copy · guiões | Docker / Postgres / backend local pesado |
| Smoke em **prod** | Activar B2 · Stripe live · PF3D |
| 1 carril pequeno | Features grandes / matching / pagamentos |

### Registo em férias (tom do painel)

Focar: **branches pushed** · tip SSD · smoke de campo (prod) · o que falta reconciliar.  
**Não** manter lista gigante de features.

---

## 5. Pós-férias — reconciliação (PC principal)

| # | Acção | OK? |
|---|--------|-----|
| 1 | PC principal volta a ser máquina activa | ☐ |
| 2 | `git fetch` / `pull` de tudo do GitHub | ☐ |
| 3 | Listar branches criadas em férias | ☐ |
| 4 | Integrar **só** branches limpas / testadas (PR + review) | ☐ |
| 5 | Revalidar / restaurar envs locais (`backend/.env`, `web-app/.env.local`) — **fora do git** | ☐ |
| 6 | Smoke mínimo (health + 1 fluxo ou guião Manel 2) | ☐ |
| 7 | Só então: férias **fechadas** no painel | ☐ |

---

## 6. NÃO fazer em férias

- Activar B2 / `ENABLE_NEXT_TRIP_CHAINING`  
- Stripe live · PF3D ON · docs reais/OCR  
- Commit em `main` · `git add` `.env` / dumps / uploads  
- Colar secrets no chat · mexer Render envs sem necessidade  
- Deixar trabalho **só** no portátil sem push  
- Instalar Docker/backend pesado no portátil MJ  
- Apagar / “limpar” VPN, Office, OneDrive, Power BI, Autenticação.Gov, Brother  
- Bugbot / Cloud Agents / automações  

---

## 7. Comandos mínimos

### PC principal — antes da viagem (13/14)

```powershell
git checkout main
git fetch origin
git pull --ff-only origin main
git status
git rev-parse HEAD
git rev-parse origin/main
# limpo · HEAD = origin/main
```

### SSD / portátil — antes da viagem (13/14)

```powershell
cd D:\TVDE_BACKUP\APP   # ou H:\… conforme letra
git checkout main
git pull --ff-only origin main
git status
git log -1 --oneline
# Cifrar TVDE_SECRETS (humano) — ainda NÃO feito até o fizeres
# Confirmar leitura no portátil MJ
```

### Em férias — criar branch + push de segurança

```powershell
git checkout main
git pull --ff-only origin main
git checkout -b docs/ou-fix/nome-curto
# … alterações …
git add …
git commit -m "…"
git push -u origin HEAD
# Preferir: gh pr create …
# Mínimo aceitável: branch no GitHub (mesmo sem PR ainda)
```

### Pós-férias — PC principal

```powershell
git fetch origin
git checkout main
git pull --ff-only origin main
git branch -a
# Rever branches de férias · abrir/continuar PRs · merge só após review
# Restaurar envs locais a partir do envelope cifrado (não commitar)
```

---

## 8. Secrets

| Regra | |
|-------|--|
| Secrets **não** entram no Git | `.env` gitignored |
| `TVDE_SECRETS` na SSD | **Cifrar antes de viajar** (pendente até o dia 13/14) |
| Chat / docs | Sem valores / passwords |
| Pós-férias | Revalidar e restaurar envs **localmente** no PC principal |

---

## 9. Portátil Maria João Claudino

| Item | Nota |
|------|------|
| User Windows | `claud` (abreviatura de Claudino) |
| Papel | Leve / emergência · em férias = máquina activa de trabalho leve · **GitHub = fonte da verdade** (não fonte única) |
| Validado | Git · Node · `npm.cmd` · install/build/dev FE (#531) |
| Sem | Docker · backend local · limpeza profunda · desinstalações |
| Prod | Browser → Render = caminho principal |

### Limpeza leve (**2026-08-07**) — concluída

| Item | Resultado |
|------|-----------|
| RAM | Antes ~0.7–1.2 GB livre → depois ~**3.43 GB** / 8.22 GB (pós-restart) |
| Startup | Apps de arranque reduzidas (Windows Startup Apps) |
| Chrome | Memory Saver / Poupança de memória **ON** · sem apagar dados/perfis |
| WPS | Instalado · tasks `WpsExternal_claud_interval/startup` + `WpsUpdateTask_claud` **desactivadas** · **não** mexer `\McAfee\WPS\` |
| Phone | CrossDeviceService off pós-restart · PhoneExperienceHost ainda ~178 MB (opcional Definições) |
| Preservado | VPN/OpenVPN · OneDrive · Office/M365 · Power BI · Brother · Autenticação.Gov/pteid · browsers |
| Decisão | Fechada · sem Docker · sem backend · sem limpeza profunda |

---

## 10. Referências rápidas

| Doc | Uso |
|-----|-----|
| [`SSD_FERIAS_READINESS.md`](SSD_FERIAS_READINESS.md) | Checklists SSD detalhadas |
| [`DEMO_MANEL_2_SETEMBRO.md`](DEMO_MANEL_2_SETEMBRO.md) | Guião demo Setembro |
| [`DEMO_4_PAPEIS.md`](DEMO_4_PAPEIS.md) | Smoke 4 papéis prod |

**Frase:** Até 13/14 = pré-férias (PC activo). Dia 13/14 = refresh SSD + cifra + ON. Em férias = portátil + GitHub + branches pushed. Depois = reconciliar no PC.
