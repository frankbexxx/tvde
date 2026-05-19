# Motorista — UX 2.0 (fase futura)

**Estado:** stub — **sem implementação** nem compromisso de data.

## Objectivo

Evolução de **composição e experiência visual** do ecrã motorista **depois** do marco funcional actual (Tabelas A–E, FIX-001…008 em `main`, **#319**): mais polimento, consistência e identidade — **sem** quebrar o fluxo já validado (mapa cheio, marcador → painel aceitar, barra 4 ícones em viagem).

## Fora de âmbito (nesta fase de desenho)

- Novos fluxos de negócio (matching, estados de viagem, APIs).
- Mudança da arquitectura de navegação acordada no inventário.
- Passageiro / parceiro (podem ter fases próprias; motorista primeiro).

## Entrada (quando abrir O-UX20-1)

1. **USER_SHELL** — Cluster A em código; clusters **B–F** com VAM fechado ou priorizado ([`screenshot-tweaks-g-matrix.md`](../ux/screenshot-tweaks-g-matrix.md)).
2. Fila **TWEAKS_UX** (**TW-01** … **TW-05**) tratada ou priorizada com Frank (mapeados aos clusters G).
3. Feedback Manel / campo (se aplicável).
4. Screenshots sessão **2026-05-15** consolidados em **TW-05** / grelha G.

## Saída esperada (sessão de desenho)

- Princípios curtos (mapa-first, densidade, hierarquia de acções).
- Lista de épicos UX 2.0 (vazia ou rascunho — a preencher na sessão).
- Ligação ao [`driver-home-inventory.md`](../ux/driver-home-inventory.md) e ao painel **TW-** em [`TODOdoDIA.md`](../../TODOdoDIA.md).

## Referências

- Inventário actual: [`docs/ux/driver-home-inventory.md`](../ux/driver-home-inventory.md)
- Backlog fixes + TWEAKS: [`docs/ux/driver-ux-fixes-backlog.md`](../ux/driver-ux-fixes-backlog.md)
- TODO operacional: [`TODOdoDIA.md`](../../TODOdoDIA.md) — painel **2026-05-15**, **O-UX20-1**
