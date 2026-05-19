# Em curso — quadro operacional

Vista única para saber sempre o que está em execução, no mesmo formato em todas as sessões.

---

## Agora (2026-05-19)

**Contexto:** `main` inclui **#319** / **#320** (motorista funcional + docs TW). Screenshots `_temp/` analisados → grelha **G01–G27**; premissas **User shell** + módulos UI. **Cluster A (header)** — VAM fechado com Frank (G03, G04, menu 4 ícones, faixa dicas). Staging / A+L: painel **2026-05-14** em [`TODOdoDIA.md`](../TODOdoDIA.md).

**Próximo carril produto:** **USER-SHELL-C** (ActionPanel, Cluster C) → smoke → **Cluster D** (VAM) → clusters E–F → **TW-01…05** → **O-UX20-1** → **O-NAV-PP-1**.

**Legenda Estado** (fixa — mesmo vocabulário que o bloco *Formato dos painéis* em [`TODOdoDIA.md`](../TODOdoDIA.md)): Por iniciar · Em curso · Smoke pendente · Concluído · Bloqueado · N/A.

**Sessão 2026-05-12 (fecho):** env + OAuth consola + provisioning staging + `alembic` no Shell Render + static + CORS; **EXTRA** herdado nos painéis **2026-05-13** e **2026-05-14**.

**Próximo carril infra:** após staging/Google/smokes — **A4** (painel **2026-05-14**, **A2-02-***). **Próximo carril UX:** painel **2026-05-19** (**USER_SHELL** / **G-**), depois **2026-05-15** (**TW-**).

### Trabalho vivo (painel **2026-05-19** — USER_SHELL)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **G03**, **G04** | VAM Cluster A (header passageiro) | Concluído (VAM) | [`screenshot-tweaks-g-matrix.md`](../ux/screenshot-tweaks-g-matrix.md) |
| **USER-SHELL-A** | Header `userCompact` | Concluído | **#321** |
| **USER-SHELL-B** | InfoPanel + HintLine | Concluído | **#322** |
| **USER-SHELL-C** | ActionPanel + slide + stack | Smoke pendente | PR **feat/user-shell-cluster-c** |
| **G-CLUSTER-B** | VAM Cluster B | Concluído (VAM) | USER-SHELL-B |
| **G-CLUSTER-C** | VAM Cluster C | Concluído (VAM) | USER-SHELL-C |
| **G-CLUSTER-D** … **F** | VAM clusters restantes | Por iniciar | Após smoke C |

### Trabalho vivo (painel **2026-05-15** — motorista / TW)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **E-MARCO-1** | FIX-007/008 + inventário A–E | Concluído | Merge **#319** |
| **TW-01** … **TW-05** | TWEAKS_UX (densidade, copy, screenshots) | Por iniciar | Mapeados a clusters G (grelha) |
| **O-UX20-1** | Spec UX 2.0 | Por iniciar | [`DRIVER_UX_2_0.md`](product/DRIVER_UX_2_0.md) |
| **O-NAV-PP-1** | Barra 4 ícones passageiro/parceiro | Por iniciar | Shell menu já alinhado em VAM Cluster A |

### Trabalho vivo (painel **2026-05-14**)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **A2-02-1** | OAuth `GOOGLE_OAUTH_*` na API **staging** + URIs Google | Em curso | Ver [`TODOdoDIA.md`](../TODOdoDIA.md) **2026-05-14** |
| **A2-02-2** | Smokes assertivos **staging** | Por iniciar | Depende de A2-02-1 onde aplicável |
| **A2-02-3** | Fecho checklist §A2-03 / §A3 no audit | Concluído | [`AUDIT_EXEC_BACKLOG_AL_2026-05.md`](../audit/AUDIT_EXEC_BACKLOG_AL_2026-05.md) — actualizado na mesma PR; OAuth/smokes = A2-02-1/2 |
| **X-1** … **X-9** | Lista **EXTRA** produto | Concluído / N/A (X-4) | Ver tabelas **2026-05-14** em [`TODOdoDIA.md`](../TODOdoDIA.md) |
| **R-1** | Rotacional v3 | Concluído | Cache HTTP + cron; ver [`ROTACIONAL_V2_SPEC.md`](../product/ROTACIONAL_V2_SPEC.md) |
| **F-1** | Motorista: CTA aceitar visível sem scroll (360×800) | Concluído | [`TODOdoDIA.md`](../TODOdoDIA.md) painel **2026-05-14** |
| **F-2** | Passageiro: menu → QR no ecrã | Concluído | Idem |
| **F-3** … **F-6** | Placeholders issues (Lista Frank) | N/A | [`MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md`](../product/MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md) |

- [x] **Linha rotacional v2 (infra)** — `GET /rotacional/messages` + `ROTACIONAL_FEED_JSON` + `AppHeaderBar`; spec [`docs/product/ROTACIONAL_V2_SPEC.md`](../product/ROTACIONAL_V2_SPEC.md) (**2026-05-11**).

### Rumo **A+L** — auditoria + login social

**Legenda:** **A** = auditoria / backlog pós-[`PROJECT_AUDIT_2026-05-02.md`](../audit/PROJECT_AUDIT_2026-05-02.md); **L** = login social. Ordem: **A1→A2→L1→A3→L2→L3→A4**.

| ID | O quê | Estado |
|----|--------|--------|
| **A1** | Inventário de temas (lista bruta) | Concluído — [`AUDIT_EXEC_BACKLOG_AL_2026-05.md`](../audit/AUDIT_EXEC_BACKLOG_AL_2026-05.md) §A1 |
| **A2** | Priorização + backlog executável + gates | Concluído — mesmo ficheiro §A2 |
| **L1** | Produto, fluxos, RGPD mínimo (sem código) | Concluído — [`SOCIAL_LOGIN_L1_SPEC.md`](../product/SOCIAL_LOGIN_L1_SPEC.md) |
| **A3** | Gate: rate-limit, URIs, secret só no backend | Em curso — staging **criado** (DB+API+app); falta **OAuth na API staging**, **smokes assertivos**, fecho checklist §A3 / §A2-03 (ver painel [`TODOdoDIA.md`](../TODOdoDIA.md) **2026-05-14**) |
| **L2** | Backend + Google (`POST /auth/google/exchange`) + colunas `email` / `oauth_google_sub` | Concluído |
| **L3** | Web passageiro: callback `/auth/google/callback` + botão Google | Concluído |
| **A4** | Fecho onda auditoria (P1/P2 → trimestre) | Por iniciar |

**Próximo passo executável:** **A2-02 (fecho)** — OAuth + test users na **staging**; smokes; marcar §A3 quando checklist verde; depois **A4**. Lista produto **EXTRA** — [`TODOdoDIA.md`](../TODOdoDIA.md) **2026-05-14**.

- [x] **Landing QR interna (`/download`) + redirects `/dl`·`/app`** — **merge `main`** **#289**.
- [x] **Docs pós-#287** — **merge `main`** **#288** (`TODOdoDIA`, `todo-em-curso`, `VITE_APP_DOWNLOAD_URL` / templates).
- [x] **Barra inferior passageiro + Frota «Por aceitar»** — **#287**; prompts em [`docs/prompts/passenger-frota-2026-05-06/`](../prompts/passenger-frota-2026-05-06/).

- [x] **Onda Manel EXTRA P0–P2** — **merge `main`** **#285** (2026-05-10 noite); prompts em [`docs/prompts/manel-legal-extra-2026-05/`](../prompts/manel-legal-extra-2026-05/).

- [x] **Smoke produção (sessão Manel)** — passageiro, frota, admin, motorista telefone; viagem visível na frota — **fechado** 2026-05-09 noite.
- [x] **Baseline BD (local + Render)** + **Gestão utilizadores** 10 contas — **fechado** 2026-05-08.
- [x] **Smoke partner** (ponto 1) + **follow-ups partner** (ponto 3) — **fechado** 2026-05-08.
- [x] **Smoke restante** (prints produção): motorista · login (versão **c29dd31**) · cabeçalho (**Frota** validada) — **fechado** 2026-05-09 no [`TODOdoDIA.md`](../TODOdoDIA.md) **2026-05-09**.
- [x] **Onda web #258** em `main`; **Merge `#260`**; **UI touch `#262`**.

- [x] **Fila até fechar:** Stripe item **7** — **fechado** fila OPS (ver [`TODOdoDIA.md`](../TODOdoDIA.md) **2026-05-09**); follow-ups PW nas **Notas E2E** do mesmo ficheiro → refactor **AdminDashboard** P0–P12 (**P0–P12** entregues: hooks + JSX por tab + orquestrador).
- [x] **Rotacional v2** — infra pública + feed opcional + cabeçalho; **janela fechada** 2026-05-11 (documental); **v3** (fontes externas automáticas) no rasto/backlog.

### O que falta (prioridade de produto / próxima sessão útil)

1. **USER-SHELL-B** — smoke Cluster B (InfoPanel); merge PR. Painel **2026-05-19**.
2. **VAM Cluster C** (ActionPanel / G08) — conversa Frank.
3. **TWEAKS_UX** (**TW-01** … **TW-05**) — alinhados à grelha G; painel **2026-05-15**.
4. **UX 2.0** — sessão de desenho (**O-UX20-1**); stub [`DRIVER_UX_2_0.md`](product/DRIVER_UX_2_0.md).
5. ~~**Zonas v1 — fecho técnico**~~ — entregue; geofencing fino = evolução futura.
6. **E2E / PW** — **`driver-passenger-flow`**: ✅ **2026-05-15** (4/4, pós-#319). Revalidar só com delta em motorista/passageiro.
7. ~~**Opcional curto — UX Frota «Só atribuídas»**~~ — **entregue em #287** («Por aceitar» + tooltip).
8. ~~**Lembrete operacional — Stripe**~~ — **2026-05-11:** mock reposto em piloto; ver [`docs/env/ENV_SINGLE_REALITY.md`](../env/ENV_SINGLE_REALITY.md) § *Repor modo mock*.
9. ~~**Backlog EXTRA (Manel + legal + crescimento)**~~ — *onda técnica P0–P2 **entregue** em **#285**; lista canónica e próximas fases normativas/OCR em [`product/MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md`](product/MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md).*
10. **Backlog** (sem data) — ~~**rotacional v3**~~ **feito** (cache + `ROTACIONAL_V3_FETCH_URL` + cron); **A+L** — fecho **A2-02** (OAuth/smokes **staging**) + **A4**; **EXTRA** produto — ver [`TODOdoDIA.md`](../TODOdoDIA.md) **2026-05-14**; docs [`AUDIT_EXEC_BACKLOG_AL_2026-05.md`](../audit/AUDIT_EXEC_BACKLOG_AL_2026-05.md), [`SOCIAL_LOGIN_L1_SPEC.md`](../product/SOCIAL_LOGIN_L1_SPEC.md).

**Nota:** **Ronda smokes prod 2026-05-13** fechada (grelha **S-** no [`TODOdoDIA.md`](../TODOdoDIA.md) **2026-05-14**). **S-13** concluído **sem** reexecutar W1 (sem delta Stripe/cron). Daqui em diante: **E2E/pytest** no que for repetível; **smoke humano em prod** só **assertivo** quando houver **delta** no fluxo ou após deploy relevante — ver bloco *Testes automáticos vs smokes* no mesmo painel. Dev local: Postgres, `uvicorn`, Vite — **reiniciar** se E2E / browser falhar por serviços parados.

**Regra — fecho de etapas:** actualizar estes ficheiros mal algo esteja feito em `main` ou após smoke; **não** exigir confirmação explícita para marcar concluído (evitar retrabalho na leitura retroactiva).

### Rasto vivaço (não bloqueia a fila acima)

- [x] **Top 3 Manel (onda fechada)** — **§10.2 + barra Rendimentos + deep link** em `main` (**#280**, 2026-05-06). Spec: [`docs/product/DRIVER_HOME_TOP3_MANEL.md`](product/DRIVER_HOME_TOP3_MANEL.md). **Sem tarefa aberta:** permuta de ordem entre secções (§10.4) só quando o Manel enviar feedback; até lá a ordem canónica do spec mantém-se. Regressão UI motorista: smoke `DRIVER_MENU_SPEC.md` §7.8 quando se tocar no `DriverDashboard` / menu.
- [x] **Zonas v1 (fatia técnica)** — geo **catálogo** por `zone_id` (âncoras + **porto**); **orçamento extra** >2/dia via partner (`grant-extra` + UI frota). Prompt: [`docs/prompts/PROMPT_ZONES_V1_BUDGET_EXTRA_AND_GEO.md`](prompts/PROMPT_ZONES_V1_BUDGET_EXTRA_AND_GEO.md).
- [x] **Rotacional v2** — feed público opcional (`ROTACIONAL_FEED_JSON` + `GET /rotacional/messages`) + cabeçalho; **em `main`** + spec [`ROTACIONAL_V2_SPEC.md`](../product/ROTACIONAL_V2_SPEC.md).
- [ ] **Rotacional v3** — ~~job/cron + cache~~ entregue (`ROTACIONAL_V3_FETCH_URL`); evolução: fontes IPMA/Prociv com ToS próprias.
- [ ] **Rumo A+L** — **A2-02** fecho (OAuth staging + smokes + §A2-03) + **A4**; **EXTRA** motorista/partner/QR/som (ver [`TODOdoDIA.md`](../TODOdoDIA.md) **2026-05-14**); docs [`STAGING_A2-02_RUNBOOK.md`](ops/STAGING_A2-02_RUNBOOK.md), [`AUDIT_EXEC_BACKLOG_AL_2026-05.md`](audit/AUDIT_EXEC_BACKLOG_AL_2026-05.md). Fonte: [`PROJECT_AUDIT_2026-05-02.md`](audit/PROJECT_AUDIT_2026-05-02.md).

---

## Plano por sessões — fila **1–9** (quinta+sexta) até fechada

_Lista original: smoke → header motorista → follow-ups smoke → partner drawer → driver drawer → segurança → Stripe test → docs → E2E opcional._

| Sessão | Foco | Estado |
|--------|------|--------|
| **S0** (feita) | Código **#258**: itens **2**, **4**, **5** (mínimo) + extras login/header/rating | **Merge `main`** |
| **S1** | Smoke: partner **fechado** 2026-05-08; baseline BD **fechado**; smoke restante (motorista/login/Frota) **fechado** 2026-05-09 | **Fechado** |
| **S2** | **Docs item 8:** `grep` env/Stripe → `ENV_SINGLE_REALITY` (+ templates) | **Feito** (2026-05-07) |
| **S3** | **Ops item 6:** segredos Render, `DATABASE_URL`, `/health` | **Feito** (2026-05-07) |
| **S4** | **Ops item 7:** Stripe test no Render; **`STRIPE_MOCK=false`** para continuar a testar; lembrete **voltar mock** no [`TODOdoDIA.md`](../TODOdoDIA.md) **2026-05-10** | **Fechado** fila OPS (**webhook OK** 2026-05-09); piloto **encerrado** — **`STRIPE_MOCK=true`** reposto (2026-05-11); `/debug/map` só **dev** (2026-05-10) |
| **S5** | **Item 9:** **1º** Passo 1 UI (**feito** `#262`) · **2º** E2E partner drawer (**#267** em `main`) | **2º** fechado; E2E **api-flows** revalidado **2026-05-11** |

**Regra:** não reabrir **S0** salvo regressão; **S1** alimenta prioridade do **S2+** se aparecer bug de produto.

---

## Hoje (2026-05-01) — fechado

- [x] Pesquisa benchmarks (RSG, Uber web, Lyft destination filter) + notas visuais.
- [x] Reunião Manel: QR, portagens (princípios), ecrã persistente, wireframes, lista viagens + 2 anos, registo criminal 3/3 meses, fila LIS; princípio produto **não restritivo**.
- [x] Documento `docs/research/driver-app-benchmarks.md` + actualização `DRIVER_MENU_SPEC.md`.
- [x] Código zonas v1 (backend + web) mergeado em `main`; `.gitignore` `test-results/` (Playwright).

---

## Amanhã (2026-05-03) — primeira sessão útil

- [ ] **Auditoria projecto (agente)** — ler [`docs/audit/PROJECT_AUDIT_2026-05-02.md`](audit/PROJECT_AUDIT_2026-05-02.md) na **primeira** abertura do dia (output externo; **não** para hoje).
- [x] [OPS] **Smokes curtos em série** — `TODOdoDIA.md` painel **2026-05-02** fechado 2026-05-03 (nav + P1–P5 §7.8 + build).
- [x] [DOCS] **Portagens** — spec mínima em [`docs/product/PORTAGENS_SPEC.md`](product/PORTAGENS_SPEC.md) (merge `main` 2026-05-03).
- [x] [CÓDIGO] **Zonas v1 — extensão de prazo (partner)** — merge `main` 2026-05-03; **pendente** na mesma linha: geo `zone_id`, políticas extra-orçamento.
- [x] Menu motorista — detalhe de viagem em modal com ação de ocorrência (histórico com percurso + «Mostrar mais»).
- [x] Categorias + «dois destinos por dia» — contrato + implementação v1 núcleo em `main`.
- [x] **Rotacional v2** — em `main`; **v3** = APIs externas automáticas — [`ROTACIONAL_V2_SPEC.md`](../product/ROTACIONAL_V2_SPEC.md).
- [x] Planeamento **login social** — absorvido no rumo **A+L**; spec **L1** em [`SOCIAL_LOGIN_L1_SPEC.md`](product/SOCIAL_LOGIN_L1_SPEC.md).

---

## Backlog (não bloquear agora)

- Theming/polish amplo de superfície e iconografia final.
- Refactors estruturais sem impacto directo em operação.
- **Rotacional v3** — integrações meteorológicas / estado de estradas (ex.: IPMA; [Meteopt](https://www.meteopt.com); avisos Prociv onde couber); refresh periódico sem edição manual do JSON.
- **EXTRA Manel + legal + crescimento (2026-05):** ver [`product/MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md`](product/MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md) — itens **1–10**; **shell passageiro** evoluído com barra inferior (**#287**) + QR **`/download`** (**#289**).

---

_Relacionado: [`TODOdoDIA.md`](../TODOdoDIA.md) painel **2026-05-12** (**A+L**) · **2026-05-11** · **EXTRA Manel/legal** [`product/MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md`](product/MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md) · **#285** · **#287** · **#288** · **#289**._

_Última revisão: **2026-05-12** — `main` com rotacional v2 mergeado; rumo **A+L** (próximo **A3**); Stripe mock checklist alinhado._
