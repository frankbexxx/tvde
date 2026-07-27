# B2-DIAG — Next trip while ongoing / ETA ≤ 5 min (2026-07-27)

**Estado:** **DIAGNÓSTICO CONCLUÍDO** — sem implementação  
**`main`:** ≥ `aa63330` (inclui Availability Guard A+B docs + [#480](https://github.com/frankbexxx/tvde/pull/480))  
**Pré-condições:** Caso A PASS · Caso B PASS · lifecycle assign/accept hardening (#480)  
**Handoff:** [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md)

---

## 1. Veredicto

| Pergunta | Resposta |
|----------|----------|
| O sistema actual **suporta** next-trip while ongoing de forma segura? | **Não** |
| É possível com alterações? | **Sim — alterações substanciais** |
| É só mudar um `if`? | **Não** |

O produto desejado (tipo Uber/Bolt: aceitar próxima viagem com a actual `ongoing` se ETA restante ≤ N minutos) **não** cabe no modelo actual sem redesenho de:

- current vs next/queued  
- semântica de `is_available`  
- matching  
- timeouts  
- lifecycle (complete/cancel → free driver)  
- Driver UI  
- Partner/Admin UI  
- ETA remaining  
- testes de race  

**Availability Guard actual (Caso A + Caso B) permanece a regra correcta até existir feature B2 atrás de flag OFF.**

---

## 2. Modelo actual (resumo)

### 2.1 Trip / Driver

- Trip: `status`, `driver_id`, origem/destino, `duration_min`, `started_at`, `completed_at` — **sem** `queued` / `next` / `accepted_at`.  
- Índices em `driver_id` / `status` — **não únicos**.  
- **Sem** unique constraint “1 trip activa por driver”.  
- **Sem** `Driver.active_trip_id` (Partner expõe `active_trip_id` **computado**, singular).  
- `Driver.is_available` = bit **misto**: online/em serviço **e** elegível para ofertas.

### 2.2 Uma trip activa (app logic)

Conjunto canónico que bloqueia disponibilidade: **`accepted` | `arriving` | `ongoing`**.

Helpers com **`limit(1)`** / mapa 1:1:

- `get_current_active_trip_for_driver`  
- `driver_has_active_assigned_trip`  
- Partner `active_trip_by_driver_for_partner` (comenta multi-trip como “data anomaly”)  

Accept / matching / `list_available_trips` exigem `is_available=True`; accept seta `False`. Matching **não** faz `NOT EXISTS` active trip — confia no flag.

### 2.3 FE

- Driver: `ActiveTripContext` / bootstrap `GET /driver/trips/active` — **singular**.  
- Partner roster/detail: `active_trip_id` singular.  
- Sem UI “próxima viagem aceite”.

### 2.4 ETA

- Existe: destino, `DriverLocation`, `started_at`, `duration_min`, OSRM no create.  
- **Não** existe: ETA remaining first-class / live re-route in-trip.

---

## 3. Blockers técnicos

1. **`is_available` binário** — não distingue “em serviço” vs “livre para oferta imediata” vs “elegível para chain”.  
2. **Sem modelo current vs next/queued.**  
3. **APIs/FE `limit(1)` / singular `activeTripId`** — segunda trip some ou clobber.  
4. **`_set_driver_available` / complete / cancel** — libertam matching **sem** verificar siblings.  
5. **Timeout `accepted` > 10 min** → cancel + free driver — mataria uma “next” aceite durante ongoing longo.  
6. **Matching só com `is_available=True`** — driver ongoing nunca recebe oferta.  
7. **Sem ETA remaining** para a janela de 5 minutos.  
8. **UI Driver/Partner/Admin** desenhada para uma trip em fluxo.

**Não blockers parciais:** Payment 1:1 por trip (`uq_payments_trip_id` + guard em `accept_offer`/#480); DB permite várias rows por `driver_id`.

---

## 4. Riscos (se forçarem Opção A sem desenho)

| Risco | Severidade |
|-------|------------|
| Double-book / matching reaberto ao completar a actual com next viva | **Alto** |
| Timeout `accepted` cancela a next | **Alto** |
| Bootstrap/UI mostra só uma das duas trips | **Alto** |
| Pax ETA pickup incorrecto (motorista ainda em dropoff) | **Alto** |
| Payment/PI da next criado cedo demais | Médio |
| Partner/Admin confundem viagem actual vs próxima | Médio |
| Casos de corrida accept × complete × timeout × force-online | **Alto** |

---

## 5. Opções de desenho

| Opção | Ideia | Prós | Contras |
|-------|-------|------|---------|
| **A** — 1 `ongoing` + 1 `accepted` sem schema novo | Adaptar queries/flags | Parece rápido | Timeouts, free-driver, UI — **risco alto**; quase o mesmo trabalho que B |
| **B** — estado `queued` / `next` | Aceite da próxima fica queued; promove a accepted/arriving quando a actual termina | Separação clara; timeouts distintos; legível em Partner/Admin | Migration + state machine + UI |
| **C** — hold / intenção | Aceite = reserva; bind formal só no fim da actual | Menos Payment precoce | UX Pax frágil; risco de perder a trip |

### Recomendação engenharia

**Opção B (queued/next)** — ou variante leve: status `queued` + promoção no `complete` da actual.

- Opção A só com redesign profundo de timeouts + sibling-aware free → pouco ganho vs B.  
- Opção C se produto quiser **não** autorizar pagamento na aceitação da next.

---

## 6. Guardrails (se/quando avançar)

```text
NEXT_TRIP_CHAINING_ENABLED=false   # default — zero impacto OFF
NEXT_TRIP_WINDOW_MINUTES=5
```

| Regra | Valor |
|-------|--------|
| Max next por driver | **1** |
| Janela | Só com trip actual **`ongoing`** + ETA remaining ≤ window |
| Flag OFF | Comportamento = Availability Guard actual (Caso B) |
| Produção ON | Só após race tests + smoke dedicado chain |
| PF3D / env actual | **Não** misturar com activação desta feature |

### ETA (fases)

| Fase | Método |
|------|--------|
| **B2 fallback** | `remaining ≈ max(0, duration_min − elapsed(started_at))` — aproximação |
| **B3** | OSRM `DriverLocation → destination` da trip actual |

---

## 7. Decisões pendentes do produto

1. **Modelo:** Opção **B** (queued) vs **C** (hold) vs **adiar** B2?  
2. **Pagamento:** criar PI/autorização na aceitação da next, ou só na promoção?  
3. **Pax:** copy/ETA honestos enquanto motorista ainda termina a actual?  
4. **Limite:** confirmar max **1** next.  
5. **Prioridade** vs PF3D / atribuição real de viaturas?

**Não implementar B2 antes desta decisão.**

---

## 8. Faseamento sugerido

| ID | Item | Estado |
|----|------|--------|
| **B2-DIAG** | Este diagnóstico | **Concluído** |
| **B2-PRODUTO** | Decisão Manel: B vs C vs adiar; UX/pagamento | **Por iniciar** |
| **B2-SPIKE** | Spike flag OFF: queued + sibling-aware free + timeout rules (sem ON) | Após decisão |
| **B2-IMPL** | Matching janela ETA fallback + accept next + UI mínima | Após spike go |
| **B2-SMOKE** | Smoke chain dedicado | Antes de ON |
| **B3** | ETA OSRM live | Depois B2 estável |

### Ficheiros afectados (ordem de magnitude, se B avançar)

- Backend: `trips.py`, `trip_timeouts.py`, `offer_dispatch.py`, `driving_compliance.py`, `partner_queries.py`, `driver_status.py`, `partner_fleet.py`, enums/state_machine, possível migration  
- Driver FE: `ActiveTripContext`, `DriverDashboard`, `ActiveTripActions`, polls, availability sync  
- Partner FE: roster/detail/home  
- Testes: races accept×complete×timeout×matching; FE dual-trip; helper ETA  

---

## 9. Fora de scope deste doc

- Implementação de código / branches / PRs de feature  
- Activar flags em env/prod  
- Migrations  
- Alterar Availability Guard A/B (já PASS)  
- Activar PF3D gates  
- Documentar PASS de smoke B2 (ainda não existe feature)  

---

## 10. Referências

| Doc / PR | Nota |
|----------|------|
| [`AVAILABILITY_FORCE_ONLINE_SYNC_SMOKE_PASS_2026-07-26.md`](../ops/AVAILABILITY_FORCE_ONLINE_SYNC_SMOKE_PASS_2026-07-26.md) | Caso A PASS |
| [`AVAILABILITY_ACTIVE_TRIP_GUARD_SMOKE_PASS_2026-07-27.md`](../ops/AVAILABILITY_ACTIVE_TRIP_GUARD_SMOKE_PASS_2026-07-27.md) | Caso B PASS |
| [#480](https://github.com/frankbexxx/tvde/pull/480) | Lock `assign_trip` / BETA auto-dispatch / payment guard `accept_offer` |
| [#469](https://github.com/frankbexxx/tvde/pull/469)…[#477](https://github.com/frankbexxx/tvde/pull/477) | Locks + sync availability |

---

**Frase de fecho:** B2-DIAG concluído. Sistema actual **não** suporta next-trip while ongoing com segurança. Decisão produto pendente (B queued vs C hold vs adiar). **Não implementar** antes dessa decisão.

*Docs-only. Sem código · testes · env · DB · migrations · flags activas.*
