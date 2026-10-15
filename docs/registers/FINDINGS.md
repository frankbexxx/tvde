# Registo de findings — TVDE

| Campo | Valor |
|-------|--------|
| **id** | REG-FINDINGS |
| **title** | Índice de findings abertos e fechados |
| **type** | REGISTER |
| **created** | 2026-10-11 |
| **updated** | 2026-10-15 |
| **status** | ACTIVO |
| **owner** | Frank |

Índice rastreável. Detalhe permanece nos documentos AUDIT / architecture / legal.

**Governance:** [`../meta/DOCUMENT_GOVERNANCE.md`](../meta/DOCUMENT_GOVERNANCE.md)

---

## Pagamentos / Stripe Live

| ID | Data | Finding | Estado | Domínio | Severidade | Documento fonte | Related decision | Evidence |
|----|------|---------|--------|---------|------------|-----------------|------------------|----------|
| STRIPE-LIVE-01 | 2026-10-08 | **3DS UX:** `complete_trip` → 409 `payment_requires_action`; web-app sem fluxo 3DS da viagem, retry pós-SCA, nem copy humana (mensagem técnica) | ABERTO | PAY | P1 | [`STRIPE_LIVE_READINESS_2026-10-08.md`](../architecture/STRIPE_LIVE_READINESS_2026-10-08.md) §2 · [`PILOT_STRIPE_STAGING_CHECKLIST.md`](../runbooks/PILOT_STRIPE_STAGING_CHECKLIST.md) §B | DEC-PAY-001 | Código: `trips.py` · testes · **staging B v1** 2026-10-15 trip `660feccc-…` PI `pi_3UQpjJ…` |
| STRIPE-LIVE-02 | 2026-10-08 | Refunds: webhook `charge.refunded`/`refund.*` não tratados; `Payment.status`/UI desalinhados | ABERTO | PAY | P1 | [`STRIPE_LIVE_READINESS…`](../architecture/STRIPE_LIVE_READINESS_2026-10-08.md) §2 | DEC-PAY-001 | `webhooks/stripe.py` · [`PILOT_STRIPE_REFUND.md`](../runbooks/PILOT_STRIPE_REFUND.md) |
| STRIPE-LIVE-03 | 2026-10-08 | Smokes Stripe **TEST** em STAGING: **A PASS** · **B PASS v1** 2026-10-15; **C–J NOT RUN** | PARCIAL | PAY | P2 | [`PILOT_STRIPE_STAGING_CHECKLIST.md`](../runbooks/PILOT_STRIPE_STAGING_CHECKLIST.md) | DEC-PAY-001 | A #750 · B 3220 · checklist |
| UX-PAY-COPY | 2026-10-15 | Copy «A confirmar pagamento…» antes do complete; V1 confirma PI só no complete | ABERTO | UX | P2 | [`PILOT_STRIPE_STAGING_CHECKLIST.md`](../runbooks/PILOT_STRIPE_STAGING_CHECKLIST.md) §A findings | — | Smoke A manual staging |
| MAPTILER-403 | 2026-10-15 | `api.maptiler.com` 403 no console; mapa via fallback | ABERTO | FE | P3 | [`PILOT_STRIPE_STAGING_CHECKLIST.md`](../runbooks/PILOT_STRIPE_STAGING_CHECKLIST.md) §A findings | — | Console staging; não blocker B1-A |
| SESSION-PRIVATE | 2026-10-15 | Duas janelas privadas do mesmo browser partilham sessão pax/driver | ABERTO | OPS | P3 | [`PILOT_STRIPE_STAGING_CHECKLIST.md`](../runbooks/PILOT_STRIPE_STAGING_CHECKLIST.md) §Regras operacionais | — | Regra: browsers separados nos smokes |

---

## Lei 59/2026 / compliance técnico (M2)

Fonte agregada: [`TVDE_59_2026_TECHNICAL_FINDINGS.md`](../architecture/TVDE_59_2026_TECHNICAL_FINDINGS.md) · matriz [`TVDE_LEGAL_IMPACT_MATRIX…`](../legal/TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md)

| ID | Data | Finding | Estado | Domínio | Severidade | Documento fonte | Related decision | Evidence |
|----|------|---------|--------|---------|------------|-----------------|------------------|----------|
| FIND-LEG-IMT-01 | 2026-10-08 | Integração IMT **operador** ausente | ABERTO | COMP | P0 | [`TVDE_59_2026_TECHNICAL_FINDINGS.md`](../architecture/TVDE_59_2026_TECHNICAL_FINDINGS.md) §2 | — | Repo: sem cliente/API IMT operador |
| FIND-LEG-IMT-02 | 2026-10-08 | Integração IMT **motorista** ausente | ABERTO | COMP | P0 | [`TVDE_59_2026…`](../architecture/TVDE_59_2026_TECHNICAL_FINDINGS.md) §2 | — | Repo: sem validação IMT motorista |
| FIND-LEG-IMT-03 | 2026-10-08 | Integração IMT **veículo** ausente | ABERTO | COMP | P0 | [`TVDE_59_2026…`](../architecture/TVDE_59_2026_TECHNICAL_FINDINGS.md) §2 | DEC-LEG-003 | Repo: gates docs ≠ IMT |
| FIND-LEG-GATE-01 | 2026-10-08 | Gate/bloqueio **operador** (licença frota TVDE) ausente | ABERTO | COMP | P1 | [`TVDE_59_2026…`](../architecture/TVDE_59_2026_TECHNICAL_FINDINGS.md) §2 | DEC-LEG-003 | Config/runtime sem gate operador |
| FIND-LEG-DRV-01 | 2026-10-08 | Bloqueio motorista/veículo **parcial** (admin approve; ≠ IMT) | ABERTO | COMP | P1 | [`TVDE_59_2026…`](../architecture/TVDE_59_2026_TECHNICAL_FINDINGS.md) §2 | DEC-LEG-005 | PF3D · approve admin |
| FIND-LEG-HRS-01 | 2026-10-08 | **Enforcement** 10 h/24 h OFF (`ENABLE_DRIVING_HOURS_ENFORCEMENT=false`) | ABERTO | COMP | P1 | [`TVDE_59_2026…`](../architecture/TVDE_59_2026_TECHNICAL_FINDINGS.md) §2 | DEC-LEG-004 | `config.py` · compliance ON |
| FIND-LEG-HRS-02 | 2026-10-08 | **Cross-platform** driving hours ausente | ABERTO | COMP | P2 | [`TVDE_59_2026…`](../architecture/TVDE_59_2026_TECHNICAL_FINDINGS.md) §2 | — | Sem agregação multi-plataforma |
| FIND-LEG-FIS-01 | 2026-10-08 | **Factura electrónica** ausente | ABERTO | FIS | P1 | [`TVDE_59_2026…`](../architecture/TVDE_59_2026_TECHNICAL_FINDINGS.md) §2 | DEC-LEG-008 | Stripe ≠ factura legal |
| FIND-LEG-AMT-01 | 2026-10-08 | **Reporting AMT** ausente | ABERTO | FIS | P1 | [`TVDE_59_2026…`](../architecture/TVDE_59_2026_TECHNICAL_FINDINGS.md) §2 | — | Sem export/comunicação AMT |
| FIND-LEG-AMT-02 | 2026-10-08 | Apuramento contribuição **AMT 5%** ausente no runtime | ABERTO | FIS | P2 | [`TVDE_59_2026…`](../architecture/TVDE_59_2026_TECHNICAL_FINDINGS.md) §2 | DEC-FIS-001 | A1 §6d regra económica only |
| FIND-LEG-CTR-01 | 2026-10-08 | Contratos adesão / **versionamento** in-app ausente | ABERTO | LEG | P2 | [`TVDE_59_2026…`](../architecture/TVDE_59_2026_TECHNICAL_FINDINGS.md) §2 | DEC-PROD-002 | M2.11 parcial vs contratos adesão |
| FIND-LEG-RET-01 | 2026-10-08 | Retenção/evidência **2 anos** actividade: **parcial** | ABERTO | COMP | P2 | [`TVDE_59_2026…`](../architecture/TVDE_59_2026_TECHNICAL_FINDINGS.md) §2 | — | Complaints 2y · audit 730d |
| FIND-LEG-SOS-01 | 2026-10-08 | **Emergência/SOS**: foundation OK; **validação externa** pendente | PENDENTE EXTERNO | COMP | N/D | [`TVDE_59_2026…`](../architecture/TVDE_59_2026_TECHNICAL_FINDINGS.md) §2 | DEC-LEG-006 | `/emergency` · `L-19…L-22` matriz |

_Severidade P0/P1 em IMT/enforcement inferida de «antes de operação TVDE real» (§4 fonte); não substitui parecer._

---

## Matriz legal — gaps M2 ainda abertos (parcial global)

| ID | Data | Finding | Estado | Domínio | Severidade | Documento fonte | Related decision | Evidence |
|----|------|---------|--------|---------|------------|-----------------|------------------|----------|
| FIND-LEG-L13 | 2026-09-04 | **L-13** comissão ≤25%: guard OK; base **sem IVA** por validar | ABERTO | FIS | N/D | [`TVDE_LEGAL_IMPACT_MATRIX…`](../legal/TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md) · `L-13` | DEC-FIS-001 | `accept_trip` / `complete_trip` guards |
| FIND-LEG-L14 | 2026-09-04 | **L-14** fórmula preço: UI parcial; confirmação pré-POST/factura fora | ABERTO | UX | N/D | [`TVDE_LEGAL_IMPACT_MATRIX…`](../legal/TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md) · `L-14` | — | `PriceFormulaBreakdown` |
| FIND-LEG-L15 | 2026-09-04 | **L-15** taxa intermediação visível: parcial (factura L-16 fora) | ABERTO | UX | N/D | [`TVDE_LEGAL_IMPACT_MATRIX…`](../legal/TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md) · `L-15` | DEC-FIS-001 | Snapshot 15% viagem |

---

## Segurança runtime

| ID | Data | Finding | Estado | Domínio | Severidade | Documento fonte | Related decision | Evidence |
|----|------|---------|--------|---------|------------|-----------------|------------------|----------|
| S-MAP-P1 | 2026-09-16 | MapLibre GHSA upgrade bloqueado (ecossistema `react-map-gl`) | ABERTO | FE | P1 | [`P1_RUNTIME_SECURITY_REVIEW_2026-09.md`](../archive/audits/P1_RUNTIME_SECURITY_REVIEW_2026-09.md) | — | GHSA · deps mapa |

---

## UX Outubro 2026

| ID | Data | Finding | Estado | Domínio | Severidade | Documento fonte | Related decision | Evidence |
|----|------|---------|--------|---------|------------|-----------------|------------------|----------|
| UX-2026-10 | 2026-10 | **77** findings UX humanos (master); execução via plano final | ABERTO | UX | N/D | [`05_MASTER_FINDINGS.md`](../audits/ux/2026-10/05_MASTER_FINDINGS.md) · [`11_FINAL_EXECUTION_PLAN.md`](../audits/ux/2026-10/11_FINAL_EXECUTION_PLAN.md) | — | IDs UX-PAX/DRV/PTN/ADM |

_Detalhe atómico permanece no master UX; Fase 3B pode desagregar IDs prioritários._

---

## Resumo (2026-10-15)

| Métrica | Valor |
|---------|------:|
| **Total entradas** | **24** |
| **ABERTO** | **22** |
| **PARCIAL** | **1** (`STRIPE-LIVE-03`) |
| **PENDENTE EXTERNO** | **1** (`FIND-LEG-SOS-01`) |
| **MITIGADO / ACEITE RISCO / FECHADO** | **0** *(histórico técnico menor permanece em audits/archive)* |

| Severidade | Contagem |
|------------|------:|
| **P0** | 3 |
| **P1** | 7 |
| **P2** | 6 |
| **P3** | 2 |
| **N/D** | 5 |

---

## Gaps de classificação (decisão humana)

| Item | Motivo |
|------|--------|
| `S-COMP-03` (docs pessoais bloqueiam go-online?) | **Pendente** no quadro M2 — não é finding indexado até decisão |
| `S-HYG-01` (GPS simulado PROD) | Pendente decisão — não classificado como finding |
| `S-DRV-01` / `S-DRV-03` | Produto Driver pós-M2 — fora do registo aberto |
| Severidade exacta **L-13/L-14/L-15** | Matriz indica gap legal/processo; sem escala P0–P3 explícita → **N/D** |
| Findings UX individuais (UX-PAX-001…) | Agregados em **UX-2026-10**; desagregação opcional Fase 3B |
