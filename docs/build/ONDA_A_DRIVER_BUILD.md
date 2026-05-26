# Onda A — Driver core (build)

**Branch:** `feat/onda-a-driver-core`  
**PR título:** `feat(driver): onda A — ofertas, nav, estados híbridos, poll único, cancel`  
**Estimativa:** 1 PR · BE mínimo (expires_at) + FE driver

---

## Objetivo

Melhorar ofertas, navegação, estados de viagem, polling e cancelamento **sem** tocar Partner/Passenger/Admin.

---

## Checklist técnico

### D1 — Ofertas (fechar box + countdown)

| # | Tarefa | Ficheiros |
|---|--------|-----------|
| A1 | BE: adicionar `expires_at: Optional[str]` a `TripAvailableItem`; preencher quando `offer` presente | `backend/app/schemas/trip.py`, `backend/app/api/routers/driver_trips.py` |
| A2 | FE: tipos API available trip + `expires_at` | `web-app/src/api/trips.ts` |
| A3 | FE: estado local `dismissedOfferTripIds` (Set/sessionStorage) — fechar box **não** chama reject | `DriverDashboard.tsx` |
| A4 | FE: botão discreto fechar (X) no `RequestCard` / sheet | `RequestCard.tsx`, `DriverDashboard.tsx` |
| A5 | FE: countdown «Expira em Xs» com `setInterval` 1s; esconder quando expirado ou trip sai da lista | `RequestCard.tsx` ou wrapper |
| A6 | **Não** wire `onReject` / `rejectDriverOffer` | — |

### D2 — Navegação

| # | Tarefa | Ficheiros |
|---|--------|-----------|
| A7 | Manter auto-open recolha no aceitar | `DriverDashboard.tsx` (~794) |
| A8 | Manter auto-open destino quando status → `ongoing` | `ActiveTripActions.tsx` (~174) |
| A9 | Botão **«Abrir navegação»** em accepted/arriving → pickup; ongoing → destino | `ActiveTripActions.tsx` |
| A10 | Corrigir copy menu Navegação (remover mentira sobre botões Recolha/Destino inexistentes) | `DriverOperationsMenu` em `DriverDashboard.tsx` |
| A11 | Investigar F-NAV-1: garantir **uma** abertura por acção (não double-open mesma fase) | `openDriverExternalNav.ts` |
| A12 | Decidir: ligar `warmDriverNavSessionIfNeeded` ao ficar online **ou** apagar dead code | `openDriverExternalNav.ts`, `DriverDashboard.tsx` |

### D3 — Estados híbridos

| # | Tarefa | Ficheiros |
|---|--------|-----------|
| A13 | `accepted` + **longe** pickup → botão **«Cheguei»** → só `markArriving` | `ActiveTripActions.tsx`, `driverTripActions.ts` |
| A14 | `accepted` + **perto** pickup → **«Iniciar viagem»** → `markArriving` + `startTrip` (actual) | idem |
| A15 | `arriving` → **«Iniciar viagem»** → só `startTrip` | idem |
| A16 | Unificar raio gate UI com API (documentar 50m ou 70m num só sítio) | `driverPickupGate.ts`, `geo.ts` / backend config |
| A17 | Actualizar hints PT coerentes com botões | `ActiveTripActions.tsx` |

### D4 — Polling único

| # | Tarefa | Ficheiros |
|---|--------|-----------|
| A18 | Extrair `useDriverActiveTripPoll(tripId, token)` ou Context | novo hook ex. `useDriverActiveTripPoll.ts` |
| A19 | `ActiveTripSummary` + `ActiveTripActions` consomem mesma fonte (1 poll 2s) | `DriverDashboard.tsx`, `ActiveTripActions.tsx` |

### D5 — Cancelamento

| # | Tarefa | Ficheiros |
|---|--------|-----------|
| A20 | Manter presets PT; textarea só se «Outro»; evitar passos extra | `ActiveTripActions.tsx`, `tripCancelReasons.ts` |

### D6 — Limpeza placeholders (Onda A)

| # | Tarefa | Ficheiros |
|---|--------|-----------|
| A21 | Remover ou esconder «Reportar ocorrência» fake (`window.prompt` local) | `DriverDashboard.tsx` |
| A22 | Opcional: esconder chip «Modo Destino – em breve» | `DriverDashboard.tsx` |

---

## Testes / validação

```bash
cd web-app && npm run build
cd web-app && npx playwright test driver-passenger-flow
cd web-app && npm test -- ActiveTripActions
cd backend && pytest tests/ -q -k "offer or driver"  # se alterar BE
```

**Smoke manual (Render):** aceitar → Waze recolha; iniciar → Waze destino; fechar box oferta; countdown; Cheguei vs Iniciar conforme distância.

---

## Não fazer (Onda A)

- Reject offer UI
- WebSocket offers
- Inbox / documentos upload
- Partner / Passenger / Admin
- Refactor massivo `DriverDashboard` monolith

---

## PROMPT — executar Onda A

Copiar para o agente quando for executar:

```
Implementa ONDA A — Driver core conforme docs/build/ONDA_A_DRIVER_BUILD.md

Regras:
- Só scope Onda A (D1–D6 parcial)
- Não mexer Partner, Passenger, Admin, auth, Stripe, pagamentos
- Branch feat/onda-a-driver-core → commit + PR
- D1: fechar box local (sem reject API); countdown com expires_at no BE
- D2: manter auto-open recolha/destino; add «Abrir navegação»; fix copy; fix double-open mesma fase se existir
- D3 híbrido: longe → Cheguei; perto → Iniciar viagem (1 clique); arriving → Iniciar
- D4: deduplicar poll trip activa
- D5: cancel simples
- Esconder report fake
- Actualizar RTL + e2e se necessário
- Resumo curto no fim: ficheiros, limitações, comandos validação
```
