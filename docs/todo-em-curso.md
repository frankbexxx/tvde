# Em curso — quadro operacional

Vista única para saber sempre o que está em execução, no mesmo formato em todas as sessões.

---

## Agora (2026-05-06)

**Contexto:** `main` inclui **#280**–**#281** (Top 3 + docs), **#282** (Zonas v1 — partner `grant-extra`, catálogo **porto**, ver prompt em `docs/prompts/`). Smokes em produção **fechados por agora** (última ronda **2026-05-09** noite, Manel — ver [`TODOdoDIA.md`](../TODOdoDIA.md)).

- [x] **Smoke produção (sessão Manel)** — passageiro, frota, admin, motorista telefone; viagem visível na frota — **fechado** 2026-05-09 noite.
- [x] **Baseline BD (local + Render)** + **Gestão utilizadores** 10 contas — **fechado** 2026-05-08.
- [x] **Smoke partner** (ponto 1) + **follow-ups partner** (ponto 3) — **fechado** 2026-05-08.
- [x] **Smoke restante** (prints produção): motorista · login (versão **c29dd31**) · cabeçalho (**Frota** validada) — **fechado** 2026-05-09 no [`TODOdoDIA.md`](../TODOdoDIA.md) **2026-05-09**.
- [x] **Onda web #258** em `main`; **Merge `#260`**; **UI touch `#262`**.

- [x] **Fila até fechar:** Stripe item **7** — **fechado** fila OPS (ver [`TODOdoDIA.md`](../TODOdoDIA.md) **2026-05-09**); follow-ups PW nas **Notas E2E** do mesmo ficheiro → refactor **AdminDashboard** P0–P12 (**P0–P12** entregues: hooks + JSX por tab + orquestrador).

### O que falta (prioridade de produto / próxima sessão útil)

1. ~~**Zonas v1 — fecho técnico**~~ — **entregue neste PR:** catálogo **`zone_id`** com âncoras geo (incl. **porto**); **orçamento extra** via partner `POST …/zones/budget/grant-extra` + `GET …/budget/today`; UI frota em `PartnerDriverDetail`. *Seguinte evolução:* geofencing fino / políticas por org (se necessário).
2. **E2E / PW** — follow-ups nas **Notas E2E** do [`TODOdoDIA.md`](../TODOdoDIA.md) (painel **2026-05-09**): seed/tokens, `api-flows`, `driver-passenger-flow` / two-step quando mexeres nesses fluxos.
3. **Opcional curto** — UX Frota: clarificar rótulo **«Só atribuídas»** (filtro *assigned* vs viagem aceite/em curso; anotado no fecho **2026-05-09**).
4. **Lembrete operacional** — Stripe em Render: **`STRIPE_MOCK=false`** por decisão; quando fechar a janela de testes, repor mock (painel **2026-05-10** no `TODOdoDIA.md`).
5. **Backlog EXTRA (Manel + legal + crescimento)** — lista **1–10** em [`docs/product/MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md`](product/MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md) (som, dark mode, wake lock, rating passageiro, documentos partner/driver, QR, promo/família, menu passageiro). *Triagem P0–P2 no próprio doc.*
6. **Backlog** (sem data) — linha rotacional v2; planeamento **login social**; **auditoria** [`PROJECT_AUDIT_2026-05-02.md`](../audit/PROJECT_AUDIT_2026-05-02.md) quando for o foco do dia.

**Nota:** smokes em prod **fechados por agora**. Dev local: Postgres, `uvicorn`, Vite — **reiniciar** se E2E / browser falhar por serviços parados.

**Regra — fecho de etapas:** actualizar estes ficheiros mal algo esteja feito em `main` ou após smoke; **não** exigir confirmação explícita para marcar concluído (evitar retrabalho na leitura retroactiva).

### Rasto vivaço (não bloqueia a fila acima)

- [x] **Top 3 Manel (onda fechada)** — **§10.2 + barra Rendimentos + deep link** em `main` (**#280**, 2026-05-06). Spec: [`docs/product/DRIVER_HOME_TOP3_MANEL.md`](product/DRIVER_HOME_TOP3_MANEL.md). **Sem tarefa aberta:** permuta de ordem entre secções (§10.4) só quando o Manel enviar feedback; até lá a ordem canónica do spec mantém-se. Regressão UI motorista: smoke `DRIVER_MENU_SPEC.md` §7.8 quando se tocar no `DriverDashboard` / menu.
- [x] **Zonas v1 (fatia técnica)** — geo **catálogo** por `zone_id` (âncoras + **porto**); **orçamento extra** >2/dia via partner (`grant-extra` + UI frota). Prompt: [`docs/prompts/PROMPT_ZONES_V1_BUDGET_EXTRA_AND_GEO.md`](prompts/PROMPT_ZONES_V1_BUDGET_EXTRA_AND_GEO.md).
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
- **EXTRA Manel + legal + crescimento (2026-05):** ver [`product/MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md`](product/MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md) — itens **1–10** (som, nocturno, ecrã activo, rating passageiro, documentos partner/motorista, QR, promo/família, menu passageiro).

---

_Relacionado: [`TODOdoDIA.md`](../TODOdoDIA.md) painéis **2026-05-06** · **EXTRA Manel/legal** [`product/MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md`](product/MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md) · **#282** (zonas grant-extra) · PRs **#258**, **#262**, **#280**, **#281**._

_Última revisão: **2026-05-06** — backlog EXTRA Manel + legal documentado._
