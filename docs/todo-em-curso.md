# Em curso — quadro operacional

Vista única para saber sempre o que está em execução, no mesmo formato em todas as sessões.

---

## Agora (2026-05-09)

**1.º na abertura:** **smoke restante** (produção): motorista + login (versão) + cabeçalho (papéis) — ver [`TODOdoDIA.md`](../TODOdoDIA.md) painel **2026-05-09**.

- [x] **Baseline BD (local + Render)** + **Gestão utilizadores** 10 contas — **fechado** 2026-05-08.
- [x] **Smoke partner** (ponto 1) + **follow-ups partner** (ponto 3) — **fechado** 2026-05-08.
- [ ] **Smoke restante** (prints produção): motorista, login, cabeçalho — **1.º** no [`TODOdoDIA.md`](../TODOdoDIA.md) **2026-05-09**.
- [x] **Onda web #258** em `main`; **Merge `#260`**; **UI touch `#262`**.

- [ ] **Fila até fechar:** Stripe item **7** → **Item 9.2** (PR noite **2026-05-08**: E2E partner + dev seed; merge → marcar no [`TODOdoDIA.md`](../TODOdoDIA.md) + follow-ups PW) → refactor **AdminDashboard** P0–P12.

**Fecho sessão 2026-05-08 (noite):** código E2E partner em branch `feat/e2e-partner-playwright-seed`; **amanhã:** smoke restante (produção) como **1.º**; depois alinhar testes PW (`driver-passenger-flow`, `api-flows` `display_name`) conforme caixa **Notas E2E** no `TODOdoDIA` **2026-05-09**.

**Regra — fecho de etapas:** actualizar estes ficheiros mal algo esteja feito em `main` ou após smoke; **não** exigir confirmação explícita para marcar concluído (evitar retrabalho na leitura retroactiva).

### Rasto vivaço (não bloqueia a fila acima)

- [ ] **Top 3 Manel** — ranking final quando houver; spec em [`docs/product/DRIVER_HOME_TOP3_MANEL.md`](product/DRIVER_HOME_TOP3_MANEL.md); polish `DRIVER_MENU_SPEC.md` §7.4 / §7.8.
- [ ] **Zonas v1:** geo por `zone_id`, orçamento extra >2/dia via partner (se aplicável).
- [ ] Linha rotacional v2 (mais mensagens / dados internos sem APIs externas).
- [ ] Planeamento **login social** (onda própria).
- [ ] [OPS] **Auditoria projecto** — [`docs/audit/PROJECT_AUDIT_2026-05-02.md`](audit/PROJECT_AUDIT_2026-05-02.md) quando for o foco do dia.

---

## Plano por sessões — fila **1–9** (quinta+sexta) até fechada

_Lista original: smoke → header motorista → follow-ups smoke → partner drawer → driver drawer → segurança → Stripe test → docs → E2E opcional._

| Sessão | Foco | Estado |
|--------|------|--------|
| **S0** (feita) | Código **#258**: itens **2**, **4**, **5** (mínimo) + extras login/header/rating | **Merge `main`** |
| **S1** | Smoke: partner **fechado** 2026-05-08; baseline BD **fechado**; **continuação** smoke restante **2026-05-09** | **Parcial** → **abertura 2026-05-09** |
| **S2** | **Docs item 8:** `grep` env/Stripe → `ENV_SINGLE_REALITY` (+ templates) | **Feito** (2026-05-07) |
| **S3** | **Ops item 6:** segredos Render, `DATABASE_URL`, `/health` | **Feito** (2026-05-07) |
| **S4** | **Ops item 7:** Stripe test mode; revert mock | Pendente (humano) |
| **S5** | **Item 9:** **1º** Passo 1 UI (**feito** `#262`) · **2º** E2E partner drawer (PR **2026-05-08**) | **2º** em PR → pós-merge + follow-ups PW |

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
- [ ] Linha rotacional v2 (mais mensagens ou dados internos da app, ainda sem APIs externas).
- [ ] Planeamento de login social (Google e afins) como onda própria.

---

## Backlog (não bloquear agora)

- Theming/polish amplo de superfície e iconografia final.
- Refactors estruturais sem impacto directo em operação.

---

_Relacionado: [`TODOdoDIA.md`](../TODOdoDIA.md) painel **2026-05-09** (e fecho **2026-05-08**) · plano refactor [`meta/ADMIN_DASHBOARD_REFACTOR_PLAN.md`](meta/ADMIN_DASHBOARD_REFACTOR_PLAN.md) · baseline [`testing/DEV_BASELINE_ROSTER.md`](testing/DEV_BASELINE_ROSTER.md) · PRs **#258**, **#262**._

_Última revisão: **2026-05-09** (abertura: smoke restante; fecho noite 2026-05-08: PR E2E partner + docs listas; follow-ups PW documentados no `TODOdoDIA`)._
