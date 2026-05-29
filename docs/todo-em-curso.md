# Em curso — quadro operacional

Vista única para saber sempre o que está em execução, no mesmo formato em todas as sessões.

---

## Agora (2026-05-29 — smokes **#341** fechados)

**Contexto:** `main` @ **`a208949`** — merge **#341** (`feat/smoke-fixes`). **S-SMK-341-1…6** **Concluídos** (sessão matinal **2026-05-29**).

**Próximo passo:** escolher **1 carril** de fixes (**F-SMK-*** / **TW-SMK-*** / **F-NAV-1**) — ver painel **PRÓXIMA SESSÃO** em [`TODOdoDIA.md`](../TODOdoDIA.md).

**Legenda Estado:** Por iniciar · Em curso · Smoke pendente · Concluído · Bloqueado · N/A — igual [`TODOdoDIA.md`](../TODOdoDIA.md).

### Smokes (#341) — fechados

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **S-SMK-341-1** | Docs Marly 6/6 + aprova | Concluído | Ressalvas **F-SMK-DOC-*** |
| **S-SMK-341-2** | Marly offline ↔ online | Concluído | F-BLK-1 OK |
| **S-SMK-341-3** | Partner shell + Caixa | Concluído | Poll 7: net; Manel ontem OK |
| **S-SMK-341-4** | Discover | Concluído | |
| **S-SMK-341-5** | Passageiro rota fantasma | Concluído | |
| **S-SMK-341-6** | Driver silenciar + categorias | Concluído | **TW-SMK-OFFER-*** · **F-SMK-CAT-1** |

### Rasto smoke docs (**F-SMK-DOC-*** / **TW-SMK-DOC-***)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **F-SMK-DOC-1** | Refresh docs driver após aprovação partner | Por iniciar | Só após sair/entrar |
| **F-SMK-DOC-2** | Input ficheiro «Nenhum selecionado» pós-upload | Por iniciar | |
| **F-SMK-DOC-3** | Lista/alertas partner sem pending_review | Por iniciar | |
| **TW-SMK-DOC-4** | Banner docs topo mapa → infobox bottom | Por iniciar | |
| **TW-SMK-DOC-5** | Partner sem «X / 6» | Por iniciar | |
| **TW-SMK-DOC-6** | Ordem docs driver vs partner | N/A | |

### Rasto smoke **341-6** — ofertas + categorias

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **TW-SMK-OFFER-1** | Ofertas silenciadas no menu errado (Documentos) | Por iniciar | Mover para **Menu → Viagens** |
| **TW-SMK-OFFER-2** | Copy «Menu → Ofertas silenciadas» | Por iniciar | |
| **F-SMK-CAT-1** | Reactivar X: retry/off-on não basta; refresh ou viagem nova | Por iniciar | Sync patch categorias vs poll |

### Trabalho aberto (pós-smokes — escolher carril)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **F-NAV-1** | Waze/Maps abre no **aceite** e de novo ao **iniciar** viagem | Por iniciar | `DriverDashboard` + `ActiveTripActions`; política G12/G19 |
| **TW-DIA23-1** | Micro ajustes layout mapa/caixas | Por iniciar | Lista ecrãs Frank no Render |
| **A2-02-1** | OAuth staging | Em curso | Painel **2026-05-14** |
| **A2-02-2** | Smokes staging | Por iniciar | Depende A2-02-1 |
| **O-UX20-1** | Desenho UX 2.0 | Por iniciar | Após P0 |
| **O-NAV-PP-1** | Barra 4 ícones paridade | Smoke pendente | Partner feito **#341**; passageiro **#287** |

### Fechado — smoke-fixes build (#341)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **F-DOC-1** | Upload `pending_review` | Concluído | PR **#341** |
| **F-BLK-1 / 1b** | Offline sync + gate docs | Concluído | PR **#341** |
| **F-DISC-1** | Discover guard + copy | Concluído | PR **#341** |
| **F-UX-1…8 / F-UX-6** | Offer UX + badge + timeout | Concluído | PR **#341** |
| **F-PAX-1** | Rota fantasma passageiro | Concluído | PR **#341** |
| **F-UX-3** | Partner bottom nav | Concluído | `PartnerLayout` |

### Fechado — fase dia 23 (2026-05-23)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **D23-1…6** | Tokens, sheets, P1, build/e2e, smoke Frank | Concluído | PR **#333** + **#334** |
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

_Última revisão: **2026-05-29** — grelha **S-SMK-341-1…6** concluída; fila **F-SMK-*** / **TW-SMK-*** registada._
