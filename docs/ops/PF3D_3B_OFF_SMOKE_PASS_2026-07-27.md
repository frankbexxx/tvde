# PF3D-3B/OFF — Gate messages (flag OFF) — Smoke PASS (2026-07-27)

**Estado:** **PASS** — zero mudança operacional com gates desligadas  
**`main` / `origin/main`:** ≥ `e404bcd` (merge [#486](https://github.com/frankbexxx/tvde/pull/486))  
**Flag:** `ENABLE_VEHICLE_COMPLIANCE_GATES` — default código **`False`**; **sem** alteração de env nesta sessão  
**Render env:** **não alterado**  
**DIAG:** [`PF3D_3B_GATE_MESSAGES_DIAG_2026-07-27.md`](./PF3D_3B_GATE_MESSAGES_DIAG_2026-07-27.md)  
**Spec / matriz:** [`PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md`](./PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md)  
**Handoff:** [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md)

---

## 1. Contexto

[#486](https://github.com/frankbexxx/tvde/pull/486) entregou PF3D-3B mínimo:

- copy PT/EN para códigos de gate bloqueantes
- CTA Partner «Ver viaturas da frota» (só em erro de gate)
- logs leves `vehicle_compliance_gate_blocked`

Objectivo deste smoke: confirmar que, com gates **OFF**, a app continua operacional e que o #486 **não** mudou comportamento runtime.

Isto **não** valida gates ON.

---

## 2. Ambiente / build observado

| Item | Observado |
|------|-----------|
| `main` local | `e404bcd` (= `origin/main`) |
| FE | `v1.0.0 · e404bcd` (login) · bundle com copy/CTA PF3D-3B |
| API | `https://tvde-api-fd2z.onrender.com` |
| Health | `GET /health?diagnostic=1` → ok |
| Flag | Default código `False`; sem alteração de env nesta sessão |

### Prova runtime OFF

| Probe | Resultado |
|-------|-----------|
| Partner force-online **Marly** (`active_vehicle_id=null`) | **200** |
| Com flag ON | Esperado **409** `no_active_vehicle` |
| Conclusão | Gates **OFF** confirmadas em runtime |

---

## 3. Passos executados

1. Confirmar `main` + default da flag + FE deploy `e404bcd`
2. Driver API: login → go online **200**
3. Partner UI: detalhe `test_driver` → offline → online (Caso A continua OK)
4. Probe Marly force-online sem viatura → **200**
5. Trip API: create → accept **200** `accepted` → cancel cleanup
6. Driver UI: login → «À espera de viagens» / disponível

---

## 4. Resultados

| Superfície | Observado |
|------------|-----------|
| **Driver** | Online · «À espera de viagens» · sem erro PF3D · sem snake_case |
| **Partner** | Offline/online OK · **sem** CTA «Ver viaturas da frota» indevido · alerta PF3C Home «Ver viaturas» (docs) continua normal e **não** é erro de gate |
| **Accept** | Trip `08b33b2b…` → `accepted` · body sem códigos PF3D · cleanup cancel OK |
| **Logs** | Sem acesso directo ao Render log stream · nenhum 409 compliance em fluxo normal → `vehicle_compliance_gate_blocked` **não** disparou no caminho testado |

---

## 5. Critérios PASS

| Critério | Resultado |
|----------|-----------|
| Gates OFF | **PASS** |
| Driver online normal | **PASS** |
| Partner force-online/offline | **PASS** |
| Accept normal | **PASS** |
| Sem mensagem / snake_case PF3D | **PASS** |
| Sem log de bloqueio em fluxo normal | **PASS** (inferido por ausência de bloqueios) |

---

## 6. Conclusão

**PF3D-3B/OFF smoke = PASS.**

[#486](https://github.com/frankbexxx/tvde/pull/486) não alterou comportamento operacional com gates desligadas.

---

## 7. Out of scope

- Activar `ENABLE_VEHICLE_COMPLIANCE_GATES` / smoke ON
- Alterações env / DB / migrations / deploy manual
- Implementação B2 next-trip
- Alterações de código neste fecho docs

---

*Docs-only. Sem código · testes · FE/backend runtime · env · DB · migrations · workflows.*
