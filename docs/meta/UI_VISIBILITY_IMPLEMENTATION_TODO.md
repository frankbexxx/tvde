# UI — visibilidade, capacidades e implementação (TODO vivo)

**Consulta ao abrir a sessão (2026-04-09):** ler primeiro [`CONSULTA_OBRIGATORIA_SESSAO_2026-04-09.md`](CONSULTA_OBRIGATORIA_SESSAO_2026-04-09.md) (circuito, compliance, aceleração).

**Objectivo:** uma única referência para **o que falta no ecrã** (ou está incompleto) face ao backend / ao processo real. Quando um **smoke** ou uma operação exigir um controlo, implementa-se a partir daqui e marca-se o estado.

**Política acordada (2026-04-08):**

| Tema | Regra |
|------|--------|
| **Telemóvel** | **Critério de verdade:** se não estiver utilizável **no telemóvel** (layout, scroll, botões, leitura), **não conta** como visível para validação. Web com DevTools em **viewport móvel** ajuda no desenvolvimento; **não substitui** o teste no device. |
| **Velocidade** | Preferir **implementação em bulk com juízo** (vários gaps no mesmo ecrã / mesmo padrão) para manter **velocidade de cruzeiro**; CI (lint + testes) pega regressões cedo. |
| **Playwright** | **O mais cedo possível** por fluxo estável; **smoke manual** só quando for **inevitável** (presença humana, Stripe real, SMS, multi-device físico, etc.). |
| **Roles** | **Admin:** operações do dia-a-dia que **não** exigem “grande decisão” de sistema (ex.: aceitar novo utilizador, alterar password a pedido, estados legíveis). **Super admin:** **omnisciente** do processo — o que o admin **não** resolve (reconcile Stripe, stuck profundo, overrides perigosos, ferramentas de sistema). |
| **Naming dos `.md`** | Mantém-se a estrutura actual do repo; **renomear** ficheiros de docs fica para **outra altura**. |

**Ficheiros relacionados:** [`TODOdoDIA.md`](../../TODOdoDIA.md) (prioridades do dia), [`PROXIMA_SESSAO.md`](PROXIMA_SESSAO.md) (handoff), [`todo-em-curso.md`](../todo-em-curso.md) (fio “agora”), [`GUIA_TESTES.md`](../testing/GUIA_TESTES.md) (passos manuais quando aplicável).

---

## Como usar este ficheiro

1. **Inventário:** cada linha da tabela = uma **capacidade** (ou buraco) — API, WS, ou regra de negócio que **deveria** ser operável ou **legível** no UI.
2. **Estado:** `visível` · `parcial` · `invisível` · `TBD` (ainda não confirmado no código).
3. **Ao implementar:** actualizar coluna **Estado** + **Notas** (PR, ecrã, commit); acrescentar teste **Playwright** na coluna respectiva ou justificar **manual** na nota.
4. **Smokes localizados:** referenciar aqui o ID do smoke (ou link para secção no `GUIA_TESTES`) quando existir.

---

## Admin

| ID | Capacidade / superfície | Estado (UI) | Role mínimo | Mobile OK | Playwright | Notas |
|----|-------------------------|-------------|-------------|-----------|------------|-------|
| A1 | Reconciliar pagamento Stripe (por viagem) | visível | super_admin | parcial | parcial | `AdminDashboard.tsx` L2376/2605/2749 — botão «Alinhar pagamento (Stripe)» em Viagens (detalhe), Activas e Histórico. `px-3 py-1.5 text-xs` em todos — **abaixo dos 44 px** recomendados no telemóvel; subir para `min-h-11` quando tocarmos. Sem E2E UI (depende de PI real); API exercida em `tests/test_admin_operational.py`. |
| A2 | Notas / ops de pagamento por viagem (`POST …/payment-ops-note`) | visível | admin | parcial | `e2e/api-flows` | `AdminDashboard.tsx` L124 — textarea `min-h[6rem]`, label/id dedicados, botão «Registar nota (audit)»; não altera Stripe. Confirmar scroll/teclado no device. |
| A3 | Saúde do sistema / stuck vs inconsistent | parcial | admin+ | melhorado | existente E2E | Tab Saúde: `e2e/admin-health-tab.spec.ts` (UI + `Status: ok|degraded`); só API: `e2e/api-flows` (`GET /admin/system-health`). Confirmar **mobile** no device. |
| A4 | Timeouts manuais / cron-adjacent | visível | super_admin (API) | melhorado | backend `pytest` | Operações: botões timeouts/offers/export/cron/validar .env **desactivados** para `admin` com texto alinhado à API (evita 403 após prompt). `pytest` cobre o endpoint; E2E UI não se justifica (prompts de governança). |
| A5 | Lista utilizadores — bulk / filtros / paginação | parcial | admin | parcial | — | `AdminDashboard.tsx` L3480-3518 — input «Filtrar» (nome/telefone/papel), ordenar (nome/papel/estado), contador «A mostrar X de Y», «Carregar mais 50» (`USERS_PAGE_SIZE=50`), bulk select preservado em refresh. **Falta:** confirmação mobile (inputs `text-xs` + botões `px-3 py-1.5`), persistência de filtro (opcional — `sessionStorage` `adminUsersFilter`), E2E de fluxo (bulk block) quando a BD local estiver manejável (Onda T1). |

*(Acrescentar linhas à medida que o inventário cobre mais rotas.)*

---

## Motorista

| ID | Capacidade / superfície | Estado (UI) | Role | Mobile OK | Playwright | Notas |
|----|-------------------------|-------------|------|-----------|------------|-------|
| D1 | Ofertas / fila antes de accept | visível | driver | parcial | existente E2E | `DriverDashboard.tsx` L556-580 — `StatusHeader` («N viagem(ns) disponível(eis)» vs «À espera de viagens»), `RequestCard` por oferta, botão ACEITAR exercido em `driver-passenger-flow.spec.ts`. Poll (não WS); `DRIVER_NEW_TRIP_LIST_HINT` explicita contexto. Confirmar touch targets do `RequestCard` no device. |
| D2 | Estados da viagem activa (accept → complete) | visível | driver | melhorado | existente E2E | Waze/Maps usam `trip` **ou** `acceptedDetailFallback` no footer (alinhado ao `ActiveTripSummary`) para não sumir antes do poll. |

---

## Passageiro

| ID | Capacidade / superfície | Estado (UI) | Role | Mobile OK | Playwright | Notas |
|----|-------------------------|-------------|------|-----------|------------|-------|
| P1 | Pedido / matching / cancel | visível | passenger | parcial | existente E2E | `PassengerDashboard.tsx` — `DestinationSearchField`, `TripPlannerPanel`, `StatusHeader`, botão fixo Cancelar/Pedir nova viagem (L695-707), placeholder «À procura de motorista» no mapa (L665). Confirmar mobile-first em cada passo (recolha↔destino, teclado). |
| P2 | Mensagens de erro acionáveis | parcial | passenger | melhorado | Vitest | `formatApiErrorDetail` + humanize com `err` completo; caixa de erro com «Fechar». |

---

## Backlog de acção (ordenar na sprint)

- [x] **Passo 0:** inventário com evidência (ficheiro/linha) — `TBD` removidos nas tabelas acima; `parcial` sinaliza gap concreto (mobile device ou E2E extra).
- [ ] **Passo 1:** fechar `parcial` **mobile** com bulk na mesma área — prioridade:
  - **A1/A5** — subir botões `text-xs/px-3 py-1.5` para `min-h-11` + `touch-manipulation` (padrão já aplicado em A3 Saúde).
  - Confirmar touch targets no **`RequestCard`** (D1) e no rodapé Cancelar/Pedir nova (P1).
- [ ] **Passo 2:** extra Playwright onde não haja dependência externa:
  - **A5** bulk block (precisa BD local manejável — depende da Onda T1).
  - **P1** cancel flow UI (complementa o E2E existente motorista+passageiro).
- [ ] **Passo 3:** smoke no telemóvel após cada PR relevante (critério de verdade do doc).

---

_Última revisão: 2026-04-20 (manhã — Passo 0 do inventário fechado com evidência)_
