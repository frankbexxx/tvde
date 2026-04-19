# UI — visibilidade, capacidades e implementação (TODO vivo)

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
| A1 | Reconciliar pagamento Stripe (por viagem) | visível | super_admin | TBD | TBD | #132 + #139 — Activas/Histórico + órfã; validar viewport estreita. |
| A2 | Notas / ops de pagamento por viagem (`payment-ops-note` ou equivalente) | TBD | TBD | TBD | TBD | Inventariar endpoint + tab; expor se operação for frequente. |
| A3 | Saúde do sistema / stuck vs inconsistent | parcial | admin+ | TBD | TBD | Já existe painel; confirmar leitura e acções em mobile. |
| A4 | Timeouts manuais / cron-adjacent | parcial | TBD | TBD | TBD | DevTools + admin; definir o que é só `super_admin`. |
| A5 | Lista utilizadores — bulk / filtros / paginação | parcial | admin | TBD | TBD | Ver Onda T0/T1 em `PROXIMA_SESSAO`. |

*(Acrescentar linhas à medida que o inventário cobre mais rotas.)*

---

## Motorista

| ID | Capacidade / superfície | Estado (UI) | Role | Mobile OK | Playwright | Notas |
|----|-------------------------|-------------|------|-----------|------------|-------|
| D1 | Ofertas / fila antes de accept | TBD | driver | TBD | TBD | WS vs polling — documentar o que o motorista **vê**. |
| D2 | Estados da viagem activa (accept → complete) | visível | driver | TBD | existente E2E | Ver `e2e/`; alinhar com mobile. |

---

## Passageiro

| ID | Capacidade / superfície | Estado (UI) | Role | Mobile OK | Playwright | Notas |
|----|-------------------------|-------------|------|-----------|------------|-------|
| P1 | Pedido / matching / cancel | parcial / visível | passenger | TBD | existente E2E | Confirmar mobile-first em cada passo. |
| P2 | Mensagens de erro acionáveis | TBD | passenger | TBD | TBD | |

---

## Backlog de acção (ordenar na sprint)

- [ ] **Passo 0:** percorrer `AdminDashboard` + dashboards driver/passenger e mover linhas `TBD` → `visível` / `parcial` / `invisível` com evidência (ficheiro + ecrã).
- [ ] **Passo 1:** para cada `invisível` ou `parcial` que bloqueie smoke ou operação, PR único ou bulk por área.
- [ ] **Passo 2:** Playwright por fluxo crítico admin (onde não haja dependência externa frágil).

---

_Última revisão: 2026-04-08_
