# Em curso — quadro operacional

Vista única para saber sempre o que está em execução, no mesmo formato em todas as sessões.

---

## Agora (2026-05-23)

**Contexto:** `main` @ **`91aa886`** — merge **#334** (dia 23 full: P1 tokens, step1 driver, audit helpers). Fase **DIA 23 fechada** por Frank («quase bom»); **não** reabrir TW-05 / gate TVDE salvo regressão.

**Próximo carril (escolher na abertura da sessão):**

1. **P0 produto** — **F-NAV-1** (Waze duplo) + **TW-DIA23-1** (micro layout)
2. **P1 infra** — **A2-02-1/2** staging OAuth + smokes
3. **P5 ops** — `TODO_CODIGO_TVDE` (PROD_VALIDATION, backups)

**Legenda Estado:** Por iniciar · Em curso · Smoke pendente · Concluído · Bloqueado · N/A — igual [`TODOdoDIA.md`](../TODOdoDIA.md).

### Trabalho aberto (prioridade Frank)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **F-NAV-1** | Waze/Maps abre no **aceite** e de novo ao **iniciar** viagem | Por iniciar | `DriverDashboard` + `ActiveTripActions`; política G12/G19 |
| **TW-DIA23-1** | Micro ajustes layout mapa/caixas | Por iniciar | Lista ecrãs Frank no Render |
| **A2-02-1** | OAuth staging | Em curso | Painel **2026-05-14** |
| **A2-02-2** | Smokes staging | Por iniciar | Depende A2-02-1 |
| **O-UX20-1** | Desenho UX 2.0 | Por iniciar | Após P0 |

### Fechado — fase dia 23 (2026-05-23)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **D23-1…6** | Tokens, sheets, P1, build/e2e, smoke Frank | Concluído | PR **#333** + **#334**; gate [`dia23-gate-checklist.md`](dia23-gate-checklist.md) |
| **TW-05** | InfoBox + mapa | Concluído | Fase fechada; só TW-DIA23-1 residual |

### Fechado — USER_SHELL + motorista (histórico recente)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **USER-SHELL A–F** | G01–G27 | Concluído | Painéis **2026-05-19/20** |
| **E-MARCO-1** | FIX-007/008 | Concluído | **#319** |
| **TW-01…04** | TWEAKS_UX | Concluído | Ver [`TODOdoDIA.md`](../TODOdoDIA.md) |

**Lista consolidada completa:** painel **PRÓXIMA SESSÃO** em [`TODOdoDIA.md`](../TODOdoDIA.md).

**Regra — fecho de etapas:** actualizar estes ficheiros mal algo esteja feito em `main` ou após smoke; **não** exigir confirmação explícita para marcar concluído.

---

## Plano por sessões — fila **1–9** (quinta+sexta) — **FECHADA**

| Sessão | Foco | Estado |
|--------|------|--------|
| **S0** … **S5** | Smoke, docs, ops, Stripe, E2E | **Fechado** |

---

## Backlog (não bloquear agora)

- **Rotacional v3** evolução (IPMA/Prociv) — cache base feito
- **EXTRA Manel/legal** — [`product/MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md`](product/MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md)
- **TODO_FUTURO** §D — OTP, tenant queries, observabilidade
- **BACKLOG_POST_PILOTO** — histórico alpha

_Relacionado: [`TODOdoDIA.md`](../TODOdoDIA.md) · [`PROXIMA_SESSAO.md`](meta/PROXIMA_SESSAO.md) · [`UI_VISIBILITY_IMPLEMENTATION_TODO.md`](meta/UI_VISIBILITY_IMPLEMENTATION_TODO.md) · [`TODO_CODIGO_TVDE.md`](TODO_CODIGO_TVDE.md)._

_Última revisão: **2026-05-23** — fecho fase dia 23; F-NAV-1 + TW-DIA23-1 abertos._
