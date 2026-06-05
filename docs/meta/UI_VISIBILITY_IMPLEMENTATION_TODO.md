# UI — visibilidade, capacidades e implementação (TODO vivo)

**Consulta ao abrir a sessão:** [`TODOdoDIA.md`](../../TODOdoDIA.md) painel **PRÓXIMA SESSÃO** + [`PROXIMA_SESSAO.md`](PROXIMA_SESSAO.md). (Consulta Abril 2026 arquivada Lote 4.)

**Objectivo:** uma única referência para **o que falta no ecrã** (ou está incompleto) face ao backend / ao processo real. Quando um **smoke** ou uma operação exigir um controlo, implementa-se a partir daqui e marca-se o estado.

**Política acordada (2026-04-08):**

| Tema | Regra |
|------|--------|
| **Telemóvel** | **Critério de verdade:** se não estiver utilizável **no telemóvel** (layout, scroll, botões, leitura), **não conta** como visível para validação. Web com DevTools em **viewport móvel** ajuda no desenvolvimento; **não substitui** o teste no device. |
| **Velocidade** | Preferir **implementação em bulk com juízo** (vários gaps no mesmo ecrã / mesmo padrão) para manter **velocidade de cruzeiro**; CI (lint + testes) pega regressões cedo. |
| **Playwright** | **O mais cedo possível** por fluxo estável; **smoke manual** só quando for **inevitável** (presença humana, Stripe real, SMS, multi-device físico, etc.). |
| **Roles** | **Admin:** operações do dia-a-dia que **não** exigem “grande decisão” de sistema (ex.: aceitar novo utilizador, alterar password a pedido, estados legíveis). **Super admin:** **omnisciente** do processo — o que o admin **não** resolve (reconcile Stripe, stuck profundo, overrides perigosos, ferramentas de sistema). |
| **Naming dos `.md`** | Mantém-se a estrutura actual do repo; **renomear** ficheiros de docs fica para **outra altura**. |

**Ficheiros relacionados:** [`TODOdoDIA.md`](../../TODOdoDIA.md) (prioridades + abertos), [`PROXIMA_SESSAO.md`](PROXIMA_SESSAO.md) (handoff), [`GUIA_TESTES.md`](../testing/GUIA_TESTES.md) (passos manuais quando aplicável).

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
| A1 | Reconciliar pagamento Stripe (por viagem) | visível | super_admin | melhorado | parcial | `AdminDashboard.tsx` — botão «Alinhar pagamento (Stripe)» e pares no mesmo padrão: **`min-h-11` + `touch-manipulation`** (bulk Passo 1, 2026-05-06). Sem E2E UI (depende de PI real); API exercida em `tests/test_admin_operational.py`. |
| A2 | Notas / ops de pagamento por viagem (`POST …/payment-ops-note`) | visível | admin | parcial | `e2e/api-flows` | `AdminDashboard.tsx` L124 — textarea `min-h[6rem]`, label/id dedicados, botão «Registar nota (audit)»; não altera Stripe. Confirmar scroll/teclado no device. |
| A3 | Saúde do sistema / stuck vs inconsistent | parcial | admin+ | melhorado | existente E2E | Tab Saúde: `e2e/admin-health-tab.spec.ts` (UI + `Status: ok|degraded`); só API: `e2e/api-flows` (`GET /admin/system-health`). Confirmar **mobile** no device. |
| A4 | Timeouts manuais / cron-adjacent | visível | super_admin (API) | melhorado | backend `pytest` | Operações: botões timeouts/offers/export/cron/validar .env **desactivados** para `admin` com texto alinhado à API (evita 403 após prompt). `pytest` cobre o endpoint; E2E UI não se justifica (prompts de governança). |
| A5 | Lista utilizadores — bulk / filtros / paginação | parcial | admin | melhorado | — | `AdminDashboard.tsx` — filtros/ordenar/carregar mais e acções em bulk com **`min-h-11` + `touch-manipulation`** (Passo 1). **Falta:** confirmação no **device**; persistência de filtro (opcional — `sessionStorage` `adminUsersFilter`); E2E bulk block quando a BD local estiver manejável (Onda T1). |

*(Acrescentar linhas à medida que o inventário cobre mais rotas.)*

---

## Motorista

| ID | Capacidade / superfície | Estado (UI) | Role | Mobile OK | Playwright | Notas |
|----|-------------------------|-------------|------|-----------|------------|-------|
| D1 | Ofertas / fila antes de accept | visível | driver | parcial | existente E2E | `DriverDashboard.tsx` — `StatusHeader` com **pluralização** («1 viagem disponível» / «N viagens disponíveis») e, com pedidos, **`compact`** para reduzir altura em viewport curta (merge **2026-05-06** / #258). `RequestCard` + ACEITAR em `driver-passenger-flow.spec.ts`. Confirmar no **device** após smokes. |
| D2 | Estados da viagem activa (accept → complete) | visível | driver | melhorado | existente E2E | Waze/Maps usam `trip` **ou** `acceptedDetailFallback` no footer (alinhado ao `ActiveTripSummary`) para não sumir antes do poll. |

---

## Passageiro

| ID | Capacidade / superfície | Estado (UI) | Role | Mobile OK | Playwright | Notas |
|----|-------------------------|-------------|------|-----------|------------|-------|
| P1 | Pedido / matching / cancel | visível | passenger | melhorado | existente E2E | `PassengerDashboard.tsx` — fluxo principal + painel cancelar: select motivo, «Voltar», chip «Tentar outra vez» (geolocalização) e fechar com **`min-h-11`** / `PrimaryActionButton` já `min-h-[52px]`. Confirmar no **device** após merge. |
| P2 | Mensagens de erro acionáveis | parcial | passenger | melhorado | Vitest | `formatApiErrorDetail` + humanize com `err` completo; caixa de erro com «Fechar». |

---

## Backlog de acção (ordenar na sprint)

- [x] **Passo 0:** inventário com evidência (ficheiro/linha) — `TBD` removidos nas tabelas acima; `parcial` sinaliza gap concreto (mobile device ou E2E extra).
- [x] **Passo 1:** fechar `parcial` **mobile** com bulk na mesma área — prioridade:
  - **A1/A5** — botões admin com `min-h-11` + `touch-manipulation` (padrão A3 Saúde; tab Saúde ordenação também `min-h-11`).
  - **D1** — `RequestCard` / ACEITAR já com alturas altas; sem alteração obrigatória.
  - **P1** — rodapé cancelar + chip geolocalização alinhados a `min-h-11`.
- [ ] **Passo 2:** extra Playwright onde não haja dependência externa:
  - **A5** bulk block (precisa BD local manejável — depende da Onda T1).
  - **P1** cancel flow UI (complementa o E2E existente motorista+passageiro).
- [ ] **Passo 3:** smoke no telemóvel após cada PR relevante (critério de verdade do doc).

---

_Última revisão: 2026-05-06 — Passo 1 UI touch targets (admin A1/A5, passageiro P1); nota D1 #258 mantida._
