# Onda C — Partner mapa + alertas (build)

**Branch:** `feat/onda-c-partner-map`  
**PR título:** `feat(partner): onda C — mapa live frota + alertas operacionais`  
**Depende de:** **merge Onda B** (trips com coords)

---

## Objetivo

Mapa simples da frota + painel alertas acionáveis. Poll only — sem WebSocket.

---

## Checklist técnico

### P4 — Mapa live

| # | Tarefa | Ficheiros |
|---|--------|-----------|
| C1 | FE: novo ecrã/tab «Mapa» no menu partner ou toggle home | `PartnerSideMenu.tsx`, `PartnerHome.tsx` ou `PartnerFleetMap.tsx` (novo) |
| C2 | FE: reutilizar `MapView` / `MapStage` patterns | `web-app/src/components/maps/` |
| C3 | FE: poll 10–15s — `fetchPartnerDrivers` + `fetchPartnerTrips` (activas) | `api/partner.ts` |
| C4 | FE: markers motoristas (cor: online livre / em viagem / offline) | novo componente |
| C5 | FE: markers viagens activas (searching/assigned/accepted/arriving/ongoing) | idem |
| C6 | FE: tap marker → navigate `/partner/drivers/:id` ou `/partner/trips/:id` | react-router |
| C7 | FE: legenda cores PT | UI |

### P5 — Alertas operacionais

| # | Tarefa | Ficheiros |
|---|--------|-----------|
| C8 | FE: componente `PartnerAlertsPanel` — agrega regras | novo ou `PartnerHome.tsx` |
| C9 | Regras mínimas: motorista offline > X min; doc expirado/pending; viagem stuck (assigned >5min); viagem sem motorista | client-side sobre dados B |
| C10 | Cada alerta: tipo, severidade (info/warn/crit), entidade, link acção | idem |
| C11 | Integrar no home acima de «Precisa de atenção» ou substituir/merge | `PartnerHome.tsx` |

---

## Testes / validação

```bash
cd web-app && npm run build
```

Smoke manual: mapa mostra motoristas com GPS; viagem activa visível; alerta viagem stuck clicável.

---

## Não fazer (Onda C)

- Heatmap / dispatch manual
- WebSocket
- Inbox
- Backend novo salvo endpoint agregado opcional (preferir FE agregação)

---

## PROMPT — executar Onda C

```
Implementa ONDA C — Partner mapa + alertas conforme docs/build/ONDA_C_PARTNER_MAP_BUILD.md

Regras:
- Requer Onda B merged (trips com coords)
- Branch feat/onda-c-partner-map → commit + PR
- Mapa poll simples: motoristas + viagens activas; cores; click → detalhe
- Alertas operacionais FE-only com severidade + links
- Reutilizar MapView existente
- Sem WS, heatmap, inbox, pagamentos
- Resumo curto no fim
```
