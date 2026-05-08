# Em curso — quadro operacional

Vista única para saber sempre o que está em execução, no mesmo formato em todas as sessões.

---

## Agora (2026-05-08)

- [x] **Onda web #258** em `main` (`79d9ff6`): partner drawer com conteúdo mínimo real; motorista header compacto + polish menu + rating/pagamento concluído; login build label; AppHeaderBar papel + ref conta.
- [x] **Smoke partner** (produção): **fechado** 2026-05-08 — ver `TODOdoDIA.md` painel **2026-05-08** (discover Default fleet; sem bloqueador).
- [ ] **Smoke restante** (produção, prints): motorista + login (versão) + cabeçalho (papéis) — sequência no mesmo painel; local = só PW/dev.
- [x] **Merge `#260`** (`main`): sync motorista pós-aceite.
- [x] **UI touch targets (Passo 1):** merge **`#262`** (`main`).
- [ ] **Fila «até ao fim»:** ~~docs ENV (item 8)~~ **fechado** → ~~segurança Render (item 6)~~ **fechado** → ~~Passo 1 UI~~ **fechado (#262)** → Stripe test (item 7) → **opcional** E2E/PW (item 9.2).

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
| **S1** | Smoke **2026-05-08**: partner **fechado**; resto sequencial (motorista, login, cabeçalho) + follow-ups só se falhar | **Parcial** |
| **S2** | **Docs item 8:** `grep` env/Stripe → `ENV_SINGLE_REALITY` (+ templates) | **Feito** (2026-05-07) |
| **S3** | **Ops item 6:** segredos Render, `DATABASE_URL`, `/health` | **Feito** (2026-05-07) |
| **S4** | **Ops item 7:** Stripe test mode; revert mock | Pendente (humano) |
| **S5** | **Item 9:** **1º** Passo 1 UI (**feito** `#262`) · **2º** E2E opcional (ex. partner drawer) | **2º** pendente |

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

_Relacionado: [`TODOdoDIA.md`](../TODOdoDIA.md) painel **2026-05-08** · plano refactor admin em [`meta/ADMIN_DASHBOARD_REFACTOR_PLAN.md`](meta/ADMIN_DASHBOARD_REFACTOR_PLAN.md) · [`meta/UI_VISIBILITY_IMPLEMENTATION_TODO.md`](meta/UI_VISIBILITY_IMPLEMENTATION_TODO.md) · PRs **#258**, **#262**._

_Última revisão: **2026-05-08** (smoke partner fechado; prod vs local; fecho automático; #262; nota vite/BETA/seed no `TODOdoDIA`)._
