# PARTNER-FLEET-3B — Smoke final (2026-07-22)

**Estado:** **PASS**  
**`main`:** ≥ `387c491` (merge [#441](https://github.com/frankbexxx/tvde/pull/441); inclui [#440](https://github.com/frankbexxx/tvde/pull/440)).  
**Runbook:** [`PARTNER_FLEET_3_VEHICLE_DOCUMENTS.md`](./PARTNER_FLEET_3_VEHICLE_DOCUMENTS.md)  
**Pré-condição:** PARTNER-FLEET-2 **PASS** · PF3A backend docs **PASS** [#432](https://github.com/frankbexxx/tvde/pull/432).

---

## Cadeia de PRs (PF3B + smoke fixes)

| PR | Slice | Nota |
|----|--------|------|
| [#432](https://github.com/frankbexxx/tvde/pull/432) | PF3A backend | `vehicle_documents` · Partner API · upload local |
| [#435](https://github.com/frankbexxx/tvde/pull/435) | PF3B UI | Painel Documentos Frota → Viaturas · 4 tipos P0 |
| [#440](https://github.com/frankbexxx/tvde/pull/440) | PF3B-SMOKE-FIX-1 | >5 MB · PDF/JPG/PNG · `invalid_file_type` · expired priority |
| [#441](https://github.com/frankbexxx/tvde/pull/441) | PF3B-SMOKE-FIX-2 | Expiry por data UTC — hoje não é expirado |

---

## Checklist observado (smoke final)

| # | Passo | Resultado |
|---|--------|-----------|
| 1 | Documento validade **ontem** → **Expirado** | PASS |
| 2 | Documento validade **hoje** → **não** Expirado | PASS |
| 3 | Documento validade **futura** → **não** Expirado | PASS |
| 4 | Ficheiro **>5 MB** bloqueado antes do request | PASS |
| 5 | TXT / DOCX / tipo inválido bloqueado antes do request | PASS |
| 6 | PDF / JPG / PNG pequeno — upload OK | PASS |
| 7 | Download OK | PASS |
| 8 | Remover documento → volta a **Em falta** | PASS |

---

## Fora de scope (confirmado)

| Item | Estado |
|------|--------|
| Alertas agregados / PF3C | Fora de scope |
| Compliance gates / PF3D | Fora de scope |
| Admin approval | Fora de scope |
| Driver docs / `inspecao_viatura` | Fora de scope |
| Matching · Stripe / payments | Fora de scope |
| Passenger / Driver / NAV | Sem alteração neste slice |
| Migrations · DB cleanup · env / secrets | Fora de scope |

---

## Dívida UX / follow-up (não blockers)

| ID | Observação |
|----|------------|
| **UX-density** | Painel funcional mas visualmente denso |
| **UX-errors-scope** | Mensagens de erro no topo do painel podem parecer aplicar-se a todos os documentos |
| **UX-nav** | Futuro: lista top-down · detalhe por documento em patamar/aba/sub-ecrã · erros junto ao form · evitar múltiplos forms no mesmo scroll |

Não bloqueiam o **PASS** funcional de PF3B.

---

## Próximos naturais

1. PF3C — Alertas de caducidade (lista / agregados)  
2. PF3D — Compliance gates / bloqueios  
3. (Opcional) Redesign UX do painel Documentos (dívida acima)  

---

## Conclusão

**PARTNER-FLEET-3B = PASS funcional.**

Documentos da viatura na UI Partner validados em smoke real após #440 e #441 em `main` ≥ `387c491`.
