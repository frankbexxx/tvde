# Availability — Partner force-online ↔ Driver sync — Smoke Caso A PASS (2026-07-26)

**Estado:** **PASS** — Caso A (sem viagem activa)  
**`main` / `origin/main`:** ≥ `ea4678a` (merge [#477](https://github.com/frankbexxx/tvde/pull/477))  
**Caso B (viagem activa):** **PASS** — [`AVAILABILITY_ACTIVE_TRIP_GUARD_SMOKE_PASS_2026-07-27.md`](./AVAILABILITY_ACTIVE_TRIP_GUARD_SMOKE_PASS_2026-07-27.md)  
**Handoff:** [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md)

---

## 1. Contexto

Partner «Colocar online/offline» grava `Driver.is_available` no backend. Antes do sync FE (#476/#477), a Driver app aberta mantinha estado local `offline` + `localStorage` e só alinhava com `GET /driver/status` no mount — smoke operacional ficava FAIL/BLOCKED apesar do Partner Detail mostrar Online.

Esta sessão fechou:

1. Locks / races de disponibilidade e trip transitions (#469–#474)  
2. UX Partner Driver Detail (#475)  
3. Sync remoto Driver GET poll/focus + hardening stale GET (#476/#477)  
4. Smoke manual **Caso A** fim-a-fim  

---

## 2. PRs incluídas (base)

| PR | Tema |
|----|------|
| [#469](https://github.com/frankbexxx/tvde/pull/469) | Partner force-online bloqueia trip activa (`409 driver_has_active_trip`) |
| [#470](https://github.com/frankbexxx/tvde/pull/470) | Partner force-online `FOR UPDATE` vs accept |
| [#472](https://github.com/frankbexxx/tvde/pull/472) | Driver `go_online` / Admin `recover_driver` serializados com accept |
| [#473](https://github.com/frankbexxx/tvde/pull/473) | Timeouts serializados com arriving/start/complete |
| [#474](https://github.com/frankbexxx/tvde/pull/474) | Admin cancel serializado com complete |
| [#475](https://github.com/frankbexxx/tvde/pull/475) | UX Partner Detail — chip / labels / feedback local |
| [#476](https://github.com/frankbexxx/tvde/pull/476) | Driver sync remoto `GET /driver/status` (poll ~12s + focus/visibility) |
| [#477](https://github.com/frankbexxx/tvde/pull/477) | Hardening: epoch/seq rejeitam GET stale vs toggle local |

**CI:** `backend-ci` · `web-app` · `web-e2e` verdes nas PRs relevantes.

---

## 3. Scope deste smoke

| Incluído | Excluído |
|----------|----------|
| Caso A — force online/offline **sem** viagem activa | Caso B — force-online **com** trip activa |
| Partner Detail ↔ Driver app aberta (sem refresh) | PF3D gates ON |
| Sync read-only via GET | Env/prod · DB · migrations |
| | Redesign / tabs Partner Detail |

---

## 4. Smoke executado — Caso A (PASS)

### 4.1 Estado inicial

| Superfície | Observado |
|------------|-----------|
| Partner Driver Detail | Estado actual: **Offline** |
| Driver app | Badge **OFFLINE** + «Toca no mapa para ficares disponível» |

### 4.2 Partner «Colocar online»

| Superfície | Observado |
|------------|-----------|
| Partner Driver Detail | Estado actual: **Online** |
| Driver app (aberta, **sem** refresh) | Sai de OFFLINE; mostra «À espera de viagens» |

### 4.3 Partner «Colocar offline» / volta a offline

| Superfície | Observado |
|------------|-----------|
| Partner Driver Detail | Estado actual: **Offline** |
| Driver app | Volta a **OFFLINE** + «Toca no mapa para ficares disponível» |

---

## 5. Critérios PASS (Caso A)

| Critério | Resultado |
|----------|-----------|
| Partner Reflecte Online/Offline após acção | PASS |
| Driver app sincroniza **sem** refresh | PASS |
| Sync remoto via `GET /driver/status` (não POST) | PASS (por desenho #476/#477) |
| Poll/focus + epoch/seq evitam GET stale | PASS (código + CI; smoke visual coerente) |
| Force-online/offline operacionalmente efectivo fim-a-fim | PASS |

**Frase de fecho:** Availability sync Caso A fechado com PASS. Caso B (active trip guard) documentado em [`AVAILABILITY_ACTIVE_TRIP_GUARD_SMOKE_PASS_2026-07-27.md`](./AVAILABILITY_ACTIVE_TRIP_GUARD_SMOKE_PASS_2026-07-27.md) — **PASS**.

---

## 6. Fora de scope / não feito neste doc (Caso A)

- Activar `ENABLE_VEHICLE_COMPLIANCE_GATES`  
- Alterações env/prod · DB · migrations · workflows  
- Mais UX/redesign Partner Driver Detail (tabs / scroll — debt PF3B-UX-DRIVER-DETAIL)  
- Next-trip while ongoing / ETA ≤ 5 min (feature futura B2)  

---

## 7. Próximos passos

1. ~~Caso B manual~~ → **PASS** ([`AVAILABILITY_ACTIVE_TRIP_GUARD_SMOKE_PASS_2026-07-27.md`](./AVAILABILITY_ACTIVE_TRIP_GUARD_SMOKE_PASS_2026-07-27.md))  
2. Decisão produto: desenhar B2 «next trip while ongoing ETA ≤ 5 min» — spike 2 trips / queued / locks / UI **antes** de implementar  
3. Depois: roadmap PF3D / Partner Fleet (atribuição real, gates ON controlado, etc.)  

---

*Docs-only. Sem código · testes · FE/backend runtime · env · DB · migrations · workflows.*
