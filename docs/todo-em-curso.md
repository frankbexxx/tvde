# Em curso — quadro operacional

Vista única para saber sempre o que está em execução, no mesmo formato em todas as sessões.

---

## Agora (2026-05-10)

**Abertura:** smokes em produção **fechados por agora** — sessão **2026-05-09 (noite)** com Manel (ver [`TODOdoDIA.md`](../TODOdoDIA.md) **Fecho sessão** nesse painel). **1.º** amanhã: fila de produto / **Rasto vivaço** abaixo, conforme prioridade do dia.

- [x] **Smoke produção (sessão Manel)** — passageiro, frota, admin, motorista telefone; viagem visível na frota — **fechado** 2026-05-09 noite.
- [x] **Baseline BD (local + Render)** + **Gestão utilizadores** 10 contas — **fechado** 2026-05-08.
- [x] **Smoke partner** (ponto 1) + **follow-ups partner** (ponto 3) — **fechado** 2026-05-08.
- [x] **Smoke restante** (prints produção): motorista · login (versão **c29dd31**) · cabeçalho (**Frota** validada) — **fechado** 2026-05-09 no [`TODOdoDIA.md`](../TODOdoDIA.md) **2026-05-09**.
- [x] **Onda web #258** em `main`; **Merge `#260`**; **UI touch `#262`**.

- [x] **Fila até fechar:** Stripe item **7** — **fechado** fila OPS (ver [`TODOdoDIA.md`](../TODOdoDIA.md) **2026-05-09**); follow-ups PW nas **Notas E2E** do mesmo ficheiro → refactor **AdminDashboard** P0–P12 (**P0–P12** entregues: hooks + JSX por tab + orquestrador).

**Nota:** smokes em prod **fechados por agora** (2026-05-09 noite). Dev local: Postgres, `uvicorn`, Vite — **reiniciar** se E2E / browser falhar por serviços parados.

**Regra — fecho de etapas:** actualizar estes ficheiros mal algo esteja feito em `main` ou após smoke; **não** exigir confirmação explícita para marcar concluído (evitar retrabalho na leitura retroactiva).

### Rasto vivaço (não bloqueia a fila acima)

- [ ] **Top 3 Manel** — ranking final quando houver; spec em [`docs/product/DRIVER_HOME_TOP3_MANEL.md`](product/DRIVER_HOME_TOP3_MANEL.md); polish `DRIVER_MENU_SPEC.md` §7.4 / §7.8. *(Feito em código: ordem §10.2 no menu raiz, label barra **Rendimentos**, deep link barra → secção Rendimentos/Caixa.)*
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
| **S1** | Smoke: partner **fechado** 2026-05-08; baseline BD **fechado**; smoke restante (motorista/login/Frota) **fechado** 2026-05-09 | **Fechado** |
| **S2** | **Docs item 8:** `grep` env/Stripe → `ENV_SINGLE_REALITY` (+ templates) | **Feito** (2026-05-07) |
| **S3** | **Ops item 6:** segredos Render, `DATABASE_URL`, `/health` | **Feito** (2026-05-07) |
| **S4** | **Ops item 7:** Stripe test no Render; **`STRIPE_MOCK=false`** para continuar a testar; lembrete **voltar mock** no [`TODOdoDIA.md`](../TODOdoDIA.md) **2026-05-10** | **Fechado** fila OPS (**webhook OK** 2026-05-09); produção app: `/debug/map` só **dev** (2026-05-10) |
| **S5** | **Item 9:** **1º** Passo 1 UI (**feito** `#262`) · **2º** E2E partner drawer (**#267** em `main`) | **2º** fechado; follow-ups PW em curso |

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

_Relacionado: [`TODOdoDIA.md`](../TODOdoDIA.md) painéis **2026-05-10** / **2026-05-09** · **#267** (E2E partner) · plano refactor [`meta/ADMIN_DASHBOARD_REFACTOR_PLAN.md`](meta/ADMIN_DASHBOARD_REFACTOR_PLAN.md) · baseline [`testing/DEV_BASELINE_ROSTER.md`](testing/DEV_BASELINE_ROSTER.md) · PRs **#258**, **#262**._

_Última revisão: **2026-05-11** (admin **P0–P12** completo: hooks + JSX por tab + orquestrador)._
