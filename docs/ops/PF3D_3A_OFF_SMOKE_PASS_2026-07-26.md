# PF3D-3A/OFF — Vehicle Compliance Gates (flag OFF) — Smoke PASS (2026-07-26)

**Estado:** **PASS funcional** (gates desligados — comportamento pré-gate intacto)  
**`main` / `origin/main`:** ≥ `5f07c60` (merge [#470](https://github.com/frankbexxx/tvde/pull/470); tip pós-#467…#470)  
**Flag:** `ENABLE_VEHICLE_COMPLIANCE_GATES` — **ausente no Render** ≡ **false** (default código)  
**Render env:** **não alterado** neste smoke  
**Spec / matriz:** [`PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md`](./PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md)  
**Handoff:** [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md)

---

## 1. Objectivo

Validar que, com PF3D-3A em `main` e flag **OFF**:

- fluxo Pax → Driver → Partner (viagem completa) continua operacional
- matching / online / accept / start / complete **não** emitem erros `vehicle_compliance_*`
- ausência da env var no Render equivale a gates desligados

Isto **não** valida gates ON (PF3D-3A/ON ou smoke controlado futuro).

---

## 2. PRs na base deste smoke

| PR | Tema | Nota |
|----|------|------|
| [#467](https://github.com/frankbexxx/tvde/pull/467) | **PF3D-3A** | Gates atrás de `ENABLE_VEHICLE_COMPLIANCE_GATES` default `false` |
| [#468](https://github.com/frankbexxx/tvde/pull/468) | Redispatch + compliance filter | Consistência quando flag ON; OFF = no-op |
| [#469](https://github.com/frankbexxx/tvde/pull/469) | Partner force-online + trip activa | 409 `driver_has_active_trip` |
| [#470](https://github.com/frankbexxx/tvde/pull/470) | Force-online `FOR UPDATE` | Race vs accept |

**Env audit (pré-smoke):** não foi necessário alterar Render; ausência da flag ≡ OFF.

---

## 3. Smoke visual (2026-07-26) — PASS

| Check | Resultado |
|-------|-----------|
| Passenger login | PASS |
| Driver login | PASS |
| Partner login | PASS |
| Driver online | PASS |
| Passenger cria viagem | PASS |
| Matching cria oferta | PASS |
| Driver recebe oferta | PASS |
| Driver aceita | PASS |
| Partner vê viagem activa / accepted | PASS |
| Driver inicia viagem | PASS |
| Estado ongoing | PASS |
| Driver termina viagem | PASS |
| Partner vê completed | PASS |
| Passenger ecrã de avaliação | PASS |
| Sem `vehicle_compliance_*` / `no_active_vehicle` / `vehicle_documents_blocked` / `unknown_vehicle_compliance` | PASS |

### Não validado neste smoke (não blocker PF3D-3A/OFF)

| Item | Nota |
|------|------|
| Partner **force-online** / offline | Botão visível; **não** provado alteração de estado/resultado |
| Smoke dedicado #469 / #470 | Opcional, separado |
| Flag ON / gates activos | Fora de scope; ainda perigoso globalmente (DATA-1E) |

---

## 4. Conclusão

**PF3D-3A/OFF smoke = PASS funcional.**

Gates documentais estão na codebase mas **desligados**; o fluxo operacional completo (login → matching → accept → start → complete → avaliação) comportou-se como antes do wiring, sem erros de compliance.

O scroll / densidade do Partner Driver Detail **não** é falha deste smoke — fica como **UX debt** (secção 5).

---

## 5. UX debt — Partner Driver Detail / Frota (não blocker)

Registado durante o smoke; **Partner Ops UX**, não regressão PF3D-3A/OFF.

| Observação | Nota |
|------------|------|
| Painel demasiado vertical em mobile | Muito scroll para acções operacionais |
| Force-online / offline enterrado no fim | Acção crítica pouco acessível |
| Documentos, zonas, avisos, frota e acções perigosas | Empilhados no mesmo fluxo contínuo |

### Métrica futura (orientação)

- Driver e Partner: **scroll mínimo** em ecrãs operacionais  
- Acções críticas: sempre visíveis ou em secção dedicada  
- Cada bloco operacional: espaço próprio  

### Sugestão futura (não implementar neste fecho)

Separar detalhe do motorista por tabs / secções:

1. **Resumo**  
2. **Viagens**  
3. **Documentos**  
4. **Zonas**  
5. **Acções** — force-online/offline em bloco operacional visível  
6. «Remover da frota» sempre separado e no fundo  

ID sugerido (painel): **PF3B-UX-DRIVER-DETAIL** / sob **OPS-UX-POLISH**.

---

## 6. Fora de scope

- Activar `ENABLE_VEHICLE_COMPLIANCE_GATES` em env/prod  
- PF3D-3A/ON smoke · PF3D-3 global  
- FE mensagens de gate (PF3D-4)  
- Assign vehicle / reassign gates  
- Docs dummy · OCR · IMT · S3  
- Migrations · alterações Render · DB writes de smoke  

---

## 7. Próximos caminhos

| Opção | Tema |
|-------|------|
| **A** | Smoke dedicado Partner force-online (#469/#470) — opcional |
| **B** | Atribuição real de viaturas + docs reais (pré-requisito gates ON) |
| **C** | Smoke controlado PF3D-3A/**ON** (subset / flag só em env de teste — nunca prod global ainda) |
| **D** | Partner Ops UX — Driver Detail tabs / acções visíveis |
| **E** | PF3D-4 — mensagens FE quando gates existirem |

---

*Docs-only. Sem código · testes · FE · backend · migrations · workflows · env/secrets · DB.*
