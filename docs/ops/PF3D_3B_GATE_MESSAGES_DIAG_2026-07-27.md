# PF3D-3B — Gate messages / observabilidade — Diagnóstico (2026-07-27)

**Estado:** **DIAGNÓSTICO / PROPOSTA** — sem implementação  
**`main`:** ≥ `ac2540f`  
**Flag:** `ENABLE_VEHICLE_COMPLIANCE_GATES` continua **OFF** (default `false`)  
**Spec matriz:** [`PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md`](./PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md)  
**Smoke OFF:** [`PF3D_3A_OFF_SMOKE_PASS_2026-07-26.md`](./PF3D_3A_OFF_SMOKE_PASS_2026-07-26.md)  
**Handoff:** [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md)

---

## 1. Contexto

- Availability Guard actual **PASS** (Caso A + Caso B).  
- B2 next-trip: DIAG feito — **em espera** até resposta do Manel.  
- PF3D-3A: gates **existem** atrás de flag; smoke **OFF** PASS.  
- PF3D-3 global / ON: **bloqueado** (atribuição real + docs reais).  
- Este doc regista que a **UX/mensagens operacionais** dos gates ainda são fracas — fatia **PF3D-3B** (mensagens/observabilidade) **antes** de qualquer ON controlado.

Roadmap relacionado: PF3D-0 chama FE mensagens **PF3D-4**. **PF3D-3B** = fatia mínima (copy + CTA + logs) sem activar flag.

---

## 2. Estado actual PF3D

| Peça | Estado |
|------|--------|
| `ENABLE_VEHICLE_COMPLIANCE_GATES` | Default **`false`** — OFF ≡ sem queries pesadas / sem 409 compliance |
| Gate helper | `vehicle_compliance_gate.py` — `evaluate_driver_vehicle_compliance_gate` |
| Status puro | `vehicle_compliance_status` (PF3D-1) |
| Partner read-only | PF3D-2 `vehicle_compliance` + PF3C `document_summary` / alertas Home |
| Wiring (só se ON) | Driver `go_online` · Partner force-online · matching soft-filter · accept |
| Não gated | `start_trip` · assign viatura |
| Admin recover-driver | **Bypass** compliance |

---

## 3. Códigos actuais

| Code | `allowed` | Uso |
|------|-----------|-----|
| `vehicle_compliance_gates_disabled` | True | Flag OFF |
| `vehicle_compliance_ok` | True | Compliant |
| `vehicle_compliance_warning` | True | Soft — **não** 409 (`expiring_soon` / `pending_review`) |
| `no_active_vehicle` | False | Sem `active_vehicle_id` → 409 / skip matching |
| `vehicle_documents_blocked` | False | missing / expired / rejected |
| `unknown_vehicle_compliance` | False | Viatura activa mas summary indisponível |

HTTP `detail` = **só o code** (reasons internas não vão na resposta).

---

## 4. UX gaps

| Gap | Evidência |
|-----|-----------|
| Driver vê código cru | `formatDriverAvailabilityError` — só `driving_hours_blocked` tem PT |
| Partner force-online | Copy amigável só para `driver_has_active_trip`; compliance = raw |
| Sem CTA directo | Erro de gate **não** liga a Frota / Viaturas / documentos |
| Matching skip | Só `log_event("vehicle_compliance_filtered")` — Driver não sabe |
| Admin | Sem mapeamento FE; recover **bypassa** gate |
| Warning vs blocked | Backend distingue; UI Driver **não** explica warning (nunca 409) |
| PF3C ≠ gate UX | Alertas frota ajudam docs; **não** partilham códigos HTTP de gate |

---

## 5. Proposta PF3D-3B (mínima)

| Item | Detalhe |
|------|---------|
| i18n PT/EN | Códigos bloqueantes: `no_active_vehicle`, `vehicle_documents_blocked`, `unknown_vehicle_compliance` — Driver availability + Partner force-online + accept (espelho `driving_hours_blocked` / `driver_has_active_trip`) |
| CTA Partner | No erro de gate → Frota / Viaturas / documentos (reutilizar PF3C) |
| Logs leves | `log_event` em go_online / force-online / accept 409 (hoje matching já loga) |
| Testes | RTL/unit do mapeamento de mensagens (cenário flag ON em teste; **prod OFF**) |
| Flag | **Não** activar `ENABLE_VEHICLE_COMPLIANCE_GATES` |

---

## 6. Fora de scope

- Activar `ENABLE_VEHICLE_COMPLIANCE_GATES` / PF3D-3 ON  
- Alterar matching / filtros  
- DB / migrations / env prod  
- Admin override (PF3D-5)  
- Banner proactivo de warning no Driver  
- Expandir HTTP `detail` com reasons (opcional futuro)  
- Implementação B2 next-trip  

---

## 7. Recomendação

**Implementar PF3D-3B mínimo (copy + CTA Partner + logs) antes de qualquer PF3D ON controlado.**

Ordem sugerida:

1. Decisão Manel B2 (espera) — paralelo  
2. Atribuição real de viaturas / docs reais (pré-requisito ON)  
3. **PF3D-3B mensagens**  
4. Smoke ON controlado (só depois 2+3)  

Enquanto gates OFF, 3B tem **zero impacto operacional** em prod; reduz custo de debug no primeiro ON.

---

## 8. Ficheiros afectados (quando implementar)

| Área | Paths |
|------|--------|
| Driver FE | `driverAvailabilitySync.ts`, `DriverDashboard.tsx`, `locales/*/driver.json` |
| Partner FE | `PartnerDriverDetail.tsx`, `locales/*/partner.json` |
| Backend (opcional) | `driver_status.py`, `partner_fleet.py`, `trips.py` — só logs |
| Testes | RTL availability Driver/Partner |
| Docs | este ficheiro · matriz PF3D-0 |

---

*Docs-only. Sem código · testes · env · DB · migrations · flags activas.*
