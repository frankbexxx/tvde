# PF3C — Vehicle Document Alerts — Smoke PASS (2026-07-24)

**Estado:** **PASS funcional** (visibilidade/alertas — não compliance gates)  
**`main` / `origin/main`:** ≥ `bd2664c` (merge [#456](https://github.com/frankbexxx/tvde/pull/456))  
**Working tree:** limpa (fecho docs)  
**Pré-condição:** PF3A/3B **PASS** · OPS-UX-1 **PASS**  
**Spec cadeia:** [`PARTNER_FLEET_3_VEHICLE_DOCUMENTS.md`](./PARTNER_FLEET_3_VEHICLE_DOCUMENTS.md)  
**Handoff:** [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md)

---

## 1. Objectivo PF3C

Alertas e visibilidade documental das viaturas Partner (P0):

- documentos **em falta**, **expirados**, **a expirar**, **pendentes**, **rejeitados**
- caminhos directos Home → Viaturas e badges na lista
- **sem** compliance gates · **sem** bloquear matching/viagens

---

## 2. PRs incluídas

| PR | Slice | Nota |
|----|--------|------|
| [#452](https://github.com/frankbexxx/tvde/pull/452) | **PF3C-1** | Helpers FE `summarizeVehicleDocuments` / `worst_status` (+ pin `ruff==0.15.22`) |
| [#453](https://github.com/frankbexxx/tvde/pull/453) | **PF3C-2A** | Backend `document_summary` em `PartnerVehicleItem` · batch na lista |
| [#454](https://github.com/frankbexxx/tvde/pull/454) | **PF3C-2B** | Badges documentais na lista Viaturas |
| [#455](https://github.com/frankbexxx/tvde/pull/455) | **PF3C-2B-FIX** | Pluralização: `1 doc` / `N docs` (PT/EN) |
| [#456](https://github.com/frankbexxx/tvde/pull/456) | **PF3C-3** | Home — alerta agregado + CTA «Ver viaturas» |

**CI:** verde nas PRs relevantes (backend-ci · web-app · web-e2e conforme aplicável).

---

## 3. Arquitectura de dados

| Camada | Comportamento |
|--------|----------------|
| **API** | `GET /partner/vehicles` inclui `document_summary` por viatura |
| **Backend** | Batch load docs (`vehicle_id IN (…)`) — evita N+1 |
| **Lista Viaturas** | Consome `document_summary` — sem fetch docs por row |
| **Home** | Soft-load `fetchPartnerVehicles()` (1 request); falha → `[]`, Home não quebra |
| **Painel Documentos** | Continua **lazy** ao abrir (CRUD/upload intacto) |

### Shape `document_summary`

`total_required` · `present_count` · `missing_count` · `expired_count` · `expiring_soon_count` · `pending_review_count` · `rejected_count` · `valid_count` · `worst_status`

### Estados cobertos

`valid` · `missing` · `expired` · `expired_pending` · `expiring_soon` · `pending_review` · `rejected`

**Prioridade Home (1 alerta agregado):** rejected → expired/expired_pending → missing → expiring_soon → pending_review

---

## 4. Smoke visual (2026-07-24) — PASS

### Partner Home

| Check | Resultado |
|-------|-----------|
| Alerta «Documentos de viaturas» | PASS |
| Texto ex. «2 viaturas com documentos em falta» | PASS |
| CTA «Ver viaturas» | PASS |
| KPIs / cartão viagem activa / demais alertas | PASS |

### Frota → Viaturas

| Check | Resultado |
|-------|-----------|
| CTA abre ecrã Viaturas | PASS |
| Badges documentais nas rows | PASS |
| Plural: «1 doc em falta» · «4 docs em falta» | PASS |

### Painel Documentos

| Check | Resultado |
|-------|-----------|
| Lazy (só ao abrir) | PASS |
| Slots válidos / em falta / «Expira em breve» | PASS |
| Criar / remover / actualizar | PASS |

---

## 5. Conclusão

**PF3C = PASS funcional.**

Partner vê problemas documentais na Home (agregado) e na lista Viaturas (badges), com CTA para Viaturas, sem gates nem bloqueio operacional.

Isto **não** é UX final/polida — polish e PF3D ficam como dívida futura.

---

## 6. Fora de scope (registado)

- Compliance gates / bloquear matching ou viagens  
- Admin approval · OCR · IMT · S3  
- Redesign painel Documentos · redesign mobile total  
- Passenger / Driver · Stripe/payments · DB cleanup  
- Upgrade Ruff 0.16 (chore separado)

---

## 7. Polish futuro (não blocker)

1. Alertas operacionais ocupam muito espaço em mobile  
2. Viaturas / Documentos continuam densos em scroll  
3. Lista simples → detalhe por viatura/documento (PF3B-UX-FOLLOWUP)  
4. Admin — alertas documentais equivalentes  
5. **PF3D** — compliance gates (quando produto pedir)

---

## 8. Próximos caminhos possíveis

| Opção | Tema |
|-------|------|
| **A** | **PF3D** — compliance gates documentais |
| **B** | **Admin OPS-UX** / visibilidade docs viatura Admin |
| **C** | **Polish mobile Partner** — Home, Viaturas, Documentos |
| **D** | **Smoke alargado** Pax+Driver+Partner+Admin |
| **E** | **CHORE-LINT-1** — avaliar Ruff 0.16 + autofix controlado |

---

## 9. Fora deste fecho documental

Docs-only. Sem alterações runtime · testes · migrations · workflows · env/secrets · DB.
