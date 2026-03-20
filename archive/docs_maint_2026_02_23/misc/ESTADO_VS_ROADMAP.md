# Estado Atual vs Roadmap — Comparativo Curto

## O que está feito

| Área | Estado | Nota |
|------|--------|------|
| **Backend core** | ✅ | Trip lifecycle, JWT, Stripe, driver tracking |
| **Dispatch** | ✅ | Auto-dispatch, pool assigned, accept |
| **Driver availability** | ✅ | Toggle online/offline (frontend + backend) |
| **Rejection / timeout** | ✅ | Offer expiry, timeouts, re-dispatch |
| **Geo matching** | ✅ | Proximidade, `driver_locations` |
| **Maps** | ✅ | MapLibre, rota OSRM, markers |
| **GUI** | ✅ | Design tokens, FEELS FAST, optimistic UI |
| **Admin** | ✅ | Pendentes, viagens, métricas, saúde, ops |

---

## Roadmap vs Realidade

| Roadmap (Engineering) | Estado |
|-----------------------|--------|
| Fase 1 — Trip guardrails | ✅ Feito |
| Fase 2 — Driver simulation | ✅ Feito |
| Fase 3 — Geo matching | ✅ Feito |
| Fase 4 — Dispatch improvements | ✅ Multi-offer, timeout |
| Fase 5 — Observability | ⚠️ Parcial (logs, métricas admin) |
| Fase 6 — WebSockets | ❌ Ainda polling |

---

## Roadmap (Commercialization) — Gaps

| Item | Prioridade | Estado |
|------|------------|--------|
| Matching por distância (nearest) | Crítico | ⚠️ Básico |
| Surge pricing | Alta | ❌ |
| Driver rejection (accept/reject) | Alta | ✅ Timeout + re-dispatch |
| Real-time (WebSockets) | Média | ❌ Polling |
| Pricing engine (base+dist+time) | Alta | ⚠️ Básico |
| Regras de cancelamento | Média | ✅ Testes |
| Rating system | Média | ⚠️ Testes |
| Driver verification | Alta | ❌ |

---

## Resumo

**Onde estamos:** MVP estável, UI polida, fluxo end-to-end funcional. Já não parece protótipo.

**Próximo passo lógico:** Matching por distância (nearest driver) e pricing engine para piloto comercial limitado.
