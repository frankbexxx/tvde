# Registo de decisões — TVDE

| Campo | Valor |
|-------|--------|
| **id** | REG-DECISIONS |
| **title** | Índice de decisões internas |
| **type** | REGISTER |
| **created** | 2026-10-11 |
| **updated** | 2026-10-11 |
| **status** | ACTIVO |
| **owner** | Frank |

Índice **não substitui** os documentos fonte. Cada decisão mantém texto completo no path indicado.

**Governance:** [`../meta/DOCUMENT_GOVERNANCE.md`](../meta/DOCUMENT_GOVERNANCE.md)

---

## Governance documental

| ID | Data | Decisão | Estado | Owner | Documento fonte | Related IDs |
|----|------|---------|--------|-------|-----------------|-------------|
| GOV-DOC-001 | 2026-10-11 | Manter estrutura por domínios; não criar `docs/current/`; `registers/`, `external/`, `archive/` progressivos | DECIDIDO | Frank | [`DOCUMENT_GOVERNANCE.md`](../meta/DOCUMENT_GOVERNANCE.md) | — |
| GOV-DOC-002 | 2026-10-11 | `TODOdoDIA.md` = única fonte operacional diária | DECIDIDO | Frank | [`DOCUMENT_GOVERNANCE.md`](../meta/DOCUMENT_GOVERNANCE.md) · [`TODOdoDIA.md`](../../TODOdoDIA.md) | GOV-DOC-004 |
| GOV-DOC-003 | 2026-10-11 | `ROADMAP_FINAL_ENTREGA_TVDE_2026.md` = único PLAN mestre (sem rename nesta fase) | DECIDIDO | Frank | [`ROADMAP_FINAL_ENTREGA_TVDE_2026.md`](../ROADMAP_FINAL_ENTREGA_TVDE_2026.md) | — |
| GOV-DOC-004 | 2026-10-11 | `PROXIMA_SESSAO.md` deixa de ser canónico; handoff → TODO; arquivado 2B | DECIDIDO | Frank | [`PROXIMA_SESSAO.md`](../archive/plans/PROXIMA_SESSAO.md) | GOV-DOC-002 |
| GOV-DOC-005 | 2026-10-11 | `TVDE_STATUS_SETEMBRO_2026.md` = snapshot; arquivado 2B | DECIDIDO | Frank | [`TVDE_STATUS_SETEMBRO_2026.md`](../archive/plans/TVDE_STATUS_SETEMBRO_2026.md) | — |
| GOV-DOC-006 | 2026-10-11 | `STRIPE_LIVE_READINESS_2026-10-08.md` = AUDIT snapshot; vivo futuro sem data no nome | DECIDIDO | Frank | [`STRIPE_LIVE_READINESS_2026-10-08.md`](../architecture/STRIPE_LIVE_READINESS_2026-10-08.md) | — |
| GOV-DOC-007 | 2026-10-11 | Registos: DECISIONS, FINDINGS, EXTERNAL_CONSULTATIONS apenas; sem DOCUMENT_REGISTER | DECIDIDO | Frank | Este ficheiro · [`FINDINGS.md`](FINDINGS.md) · [`EXTERNAL_CONSULTATIONS.md`](EXTERNAL_CONSULTATIONS.md) | — |
| GOV-DOC-008 | 2026-10-11 | Não unificar `ops/` e `runbooks/` nesta fase | DECIDIDO | Frank | [`DOCUMENT_GOVERNANCE.md`](../meta/DOCUMENT_GOVERNANCE.md) | — |
| GOV-DOC-009 | 2026-10-11 | Externo: Git = rastreabilidade; PII preferencialmente fora; `external/` = Fase 4 | DECIDIDO | Frank | [`DOCUMENT_GOVERNANCE.md`](../meta/DOCUMENT_GOVERNANCE.md) | — |

---

## Produto, mobile, auth, pagamentos

| ID | Data | Decisão | Estado | Owner | Documento fonte | Related IDs |
|----|------|---------|--------|-------|-----------------|-------------|
| DEC-MOB-001 | 2026-09-25 | Piloto Android: **Capacitor** sobre React/Vite (sem rewrite native) | DECIDIDO | Francisco + Manel | [`TVDE_DECISOES_PENDENTES_M2_M3_2026-09-25.md`](../business/TVDE_DECISOES_PENDENTES_M2_M3_2026-09-25.md) §A1 | `S-MOB-01` |
| DEC-PROD-001 | 2026-09-26 | **Passenger** = capacidade base de qualquer `User` activo (sem `roles[]`) | DECIDIDO | Francisco | [`TVDE_DECISOES_PENDENTES…`](../business/TVDE_DECISOES_PENDENTES_M2_M3_2026-09-25.md) §A1 | [`USER_IDENTITIES.md`](../architecture/USER_IDENTITIES.md) |
| DEC-AUTH-001 | 2026-09-25 | OTP: backend + port `SmsSender`; Bird Messages MVP; estado PG; PROD off até smoke | DECIDIDO | Francisco | [`S-AUTH-01_OTP_SMS_DECISION.md`](../architecture/S-AUTH-01_OTP_SMS_DECISION.md) | `S-AUTH-01` · `L-SEC-12` CLOSED |
| DEC-PROD-002 | 2026-09-25 | Termos/privacidade: **Opção C** — registo + reaceitação versionada | DECIDIDO | Francisco | [`TVDE_DECISOES_PENDENTES…`](../business/TVDE_DECISOES_PENDENTES_M2_M3_2026-09-25.md) §A3 | `M2.11` · DEC-LEG-007 |
| DEC-PAY-001 | 2026-09-25 | **Stripe Live adiado** até imediatamente antes do piloto real | DECIDIDO | Francisco + Manel | [`TVDE_DECISOES_PENDENTES…`](../business/TVDE_DECISOES_PENDENTES_M2_M3_2026-09-25.md) §B1 | `S-PAY-01` · DEC-FIS-005 · DEC-FIS-006 |
| DEC-PROD-003 | 2026-09-25 | Activar **next-trip chaining** no runtime: **não agora** (pós-M2) | DECIDIDO | Francisco | [`TVDE_DECISOES_PENDENTES…`](../business/TVDE_DECISOES_PENDENTES_M2_M3_2026-09-25.md) §D5 | `S-B2-01` · DEC-PROD-004 |
| DEC-PROD-004 | 2026-08-04 | Next-trip **V1 Opção B**: 1 `ongoing` + max 1 `queued`; ETA pickup ≤12 min; PI só na promoção | DECIDIDO | Francisco | [`B2_PRODUCT_DECISIONS_2026-08-04.md`](../architecture/B2_PRODUCT_DECISIONS_2026-08-04.md) | `B2-*` · DEC-PROD-003 |
| DEC-PROD-005 | 2026-03-22 | Pricing **modelo C híbrido** (estimativa não vinculativa; final no `complete_trip`) | DECIDIDO | Equipa | [`PRICING_DECISION.md`](../PRICING_DECISION.md) · [`A1_MODELO…`](../business/A1_MODELO_ECONOMICO_SETEMBRO_2026.md) | DEC-FIS-011 · `ENABLE_CONFIRM_ON_ACCEPT` OFF |

---

## Negócio / operação VAMULÁ

| ID | Data | Decisão | Estado | Owner | Documento fonte | Related IDs |
|----|------|---------|--------|-------|-----------------|-------------|
| DEC-BIZ-001 | 2026-09-09 | Comissão plataforma piloto **15%** | DECIDIDO | Manel + Francisco | [`VAMULA_DECISOES_OPERACIONAIS_2026-09-09.md`](../business/VAMULA_DECISOES_OPERACIONAIS_2026-09-09.md) §3 | DEC-FIS-001 · `A1.4` |
| DEC-BIZ-002 | 2026-09-09 | Settlement Partner: **semanal / segunda / manual**; pagamentos via conta Manel | DECIDIDO | Manel + Francisco | [`VAMULA_DECISOES…`](../business/VAMULA_DECISOES_OPERACIONAIS_2026-09-09.md) §5 | DEC-FIS-004 |
| DEC-BIZ-003 | 2026-09-09 | **Sem telefone** público de apoio na fase inicial | DECIDIDO | Manel + Francisco | [`VAMULA_DECISOES…`](../business/VAMULA_DECISOES_OPERACIONAIS_2026-09-09.md) §6 | — |
| DEC-BIZ-004 | 2026-09-09 | Domínio **`vamula.pt`** (Ventos Férteis); sem variantes extra neste momento | DECIDIDO | Manel + Francisco | [`VAMULA_DECISOES…`](../business/VAMULA_DECISOES_OPERACIONAIS_2026-09-09.md) §7 | — |
| DEC-BIZ-005 | 2026-09-09 | Núcleo de **decisão operacional** inicial: Manel + Francisco | DECIDIDO | Manel + Francisco | [`VAMULA_DECISOES…`](../business/VAMULA_DECISOES_OPERACIONAIS_2026-09-09.md) §2 | — |
| DEC-BIZ-006 | 2026-09-09 | Apoio humano **09:00–17:00 seg–sex**; email/form (sem telefone) | DECIDIDO | Manel + Francisco | [`VAMULA_DECISOES…`](../business/VAMULA_DECISOES_OPERACIONAIS_2026-09-09.md) §6 | DEC-BIZ-003 |
| DEC-LEG-009 | 2026-09-24 | Operação **LRE/reclamações** fechada (checklist O-L25) | FECHADO | Manel + Francisco | [`VAMULA_DECISOES…`](../business/VAMULA_DECISOES_OPERACIONAIS_2026-09-09.md) §10 | `L-25` |

---

## Modelo económico (A1)

| ID | Data | Decisão | Estado | Owner | Documento fonte | Related IDs |
|----|------|---------|--------|-------|-----------------|-------------|
| DEC-FIS-001 | 2026-09-03 | Comissão piloto **15%**; 12%/12,5% só futuro condicionado | DECIDIDO | Manel + Francisco | [`A1_MODELO_ECONOMICO_SETEMBRO_2026.md`](../business/A1_MODELO_ECONOMICO_SETEMBRO_2026.md) · `A1-D01` | DEC-BIZ-001 |
| DEC-FIS-002 | 2026-09-03 | Base comissão = **preço final bruto**; fees Stripe **fora** da base | DECIDIDO | Francisco | [`A1_MODELO…`](../business/A1_MODELO_ECONOMICO_SETEMBRO_2026.md) · `A1-D02` | — |
| DEC-FIS-003 | 2026-09-03 | Beneficiário liquidação piloto = **Partner/Frota**; `driver_payout` referência | DECIDIDO | Francisco + Manel | [`A1_MODELO…`](../business/A1_MODELO_ECONOMICO_SETEMBRO_2026.md) · `A1-D03` | — |
| DEC-FIS-004 | 2026-09-03 | Liquidação **semanal / segunda / manual** ao Partner (viagens `completed`) | DECIDIDO | Francisco + Manel | [`A1_MODELO…`](../business/A1_MODELO_ECONOMICO_SETEMBRO_2026.md) · `A1-D04` | DEC-BIZ-002 |
| DEC-FIS-005 | 2026-09-03 | **Stripe Connect / split** não é requisito do piloto | DECIDIDO | Francisco | [`A1_MODELO…`](../business/A1_MODELO_ECONOMICO_SETEMBRO_2026.md) · `A1-D05` | DEC-PAY-001 |
| DEC-FIS-006 | 2026-09-03 | **Payouts automáticos** não são requisito do piloto | DECIDIDO | Francisco | [`A1_MODELO…`](../business/A1_MODELO_ECONOMICO_SETEMBRO_2026.md) · `A1-D06` | DEC-PAY-001 |
| DEC-FIS-007 | 2026-09-03 | Tarifário **Manel** Go/Comfort/XL; híbrido estimativa→final mantém-se | DECIDIDO | Francisco + Manel | [`A1_MODELO…`](../business/A1_MODELO_ECONOMICO_SETEMBRO_2026.md) · `A1-D07` | DEC-PROD-005 |
| DEC-FIS-008 | 2026-09-03 | Cancel fee **€3,00 fixos**; pré-B1 registar sem cobrar | DECIDIDO | Francisco | [`A1_MODELO…`](../business/A1_MODELO_ECONOMICO_SETEMBRO_2026.md) · `A1-D08` | — |
| DEC-FIS-009 | 2026-09-03 | Piloto: plataforma **absorve fee Stripe**; Pax paga só `final_price` | DECIDIDO | Francisco | [`A1_MODELO…`](../business/A1_MODELO_ECONOMICO_SETEMBRO_2026.md) · `A1-D09` | — |
| DEC-FIS-010 | 2026-09-03 | `MANEL_COSTS…` = estimativas planeamento; **não** orçamento aprovado | DECIDIDO | Francisco | [`A1_MODELO…`](../business/A1_MODELO_ECONOMICO_SETEMBRO_2026.md) · `A1-D10` | — |
| DEC-FIS-011 | 2026-09-18 | **A1.4 CLOSED**: tarifas V1 + 15% fixa; surge/wait OFF; margem mínima aceite | DECIDIDO | Francisco + Manel | [`A1_MODELO…`](../business/A1_MODELO_ECONOMICO_SETEMBRO_2026.md) §6h | DEC-BIZ-001 · DEC-FIS-001 |

---

## Legal / compliance produto (A3)

| ID | Data | Decisão | Estado | Owner | Documento fonte | Related IDs |
|----|------|---------|--------|-------|-----------------|-------------|
| DEC-LEG-001 | 2026-09-02 | Arquivar fontes legais-base TVDE; não inventar diplomas | DECIDIDO | Francisco | [`A3_REQUISITOS_TVDE_SETEMBRO_2026.md`](../legal/A3_REQUISITOS_TVDE_SETEMBRO_2026.md) · `A3-D01` | — |
| DEC-LEG-002 | 2026-09-02 | Partner = titular/licenciado; TVDE-APP = plataforma tecnológica | DECIDIDO | Francisco + Manel | [`A3_REQUISITOS…`](../legal/A3_REQUISITOS_TVDE_SETEMBRO_2026.md) · `A3-D02` | — |
| DEC-LEG-003 | 2026-09-04 | **Gates compliance viatura ON efectivo em M2** (flag OFF = impl. pendente) | DECIDIDO | Francisco | [`A3_REQUISITOS…`](../legal/A3_REQUISITOS_TVDE_SETEMBRO_2026.md) · `A3-D03-REV1` | `G-KYC-P0-04` |
| DEC-LEG-004 | 2026-09-04 | **10 h / 24 h** com registo + **enforcement efectivo M2** | DECIDIDO | Francisco | [`A3_REQUISITOS…`](../legal/A3_REQUISITOS_TVDE_SETEMBRO_2026.md) · `A3-D04-REV1` | FIND-LEG-HRS-01 |
| DEC-LEG-005 | 2026-09-02 | Partner/Frota = fonte verdade **operacional** docs (≠ validação IMT) | DECIDIDO | Francisco | [`A3_REQUISITOS…`](../legal/A3_REQUISITOS_TVDE_SETEMBRO_2026.md) · `A3-D05` | — |
| DEC-LEG-006 | 2026-09-02 | **Pedir validação jurídica externa** (parecer fino) | DECIDIDO | Francisco | [`A3_REQUISITOS…`](../legal/A3_REQUISITOS_TVDE_SETEMBRO_2026.md) · `A3-D06` | — |
| DEC-LEG-007 | 2026-09-02 | Termos + Privacidade **bloqueantes M2** | DECIDIDO | Francisco | [`A3_REQUISITOS…`](../legal/A3_REQUISITOS_TVDE_SETEMBRO_2026.md) · `A3-D07` | DEC-PROD-002 |
| DEC-LEG-008 | 2026-09-02 | Recibos/faturação **após** A1/A2 + contabilista | DECIDIDO | Francisco | [`A3_REQUISITOS…`](../legal/A3_REQUISITOS_TVDE_SETEMBRO_2026.md) · `A3-D08` | FIND-LEG-FIS-01 |
| DEC-LEG-010 | 2026-09-05 | Licença **gestor plataforma** IMT **354/2026** documentada (≠ API IMT) | FECHADO | Francisco | [`TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md`](../legal/TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md) · `L-26` | [`VAMULA_VENTOS…`](../legal/VAMULA_VENTOS_FERTEIS_REGISTO_OFICIAL_2026.md) |

---

## Resumo (2026-10-11)

| Métrica | Valor |
|---------|------:|
| **Total indexadas** | **44** |
| **DECIDIDO** | **42** |
| **FECHADO** | **2** (`DEC-LEG-009`, `DEC-LEG-010`) |
| **PENDENTE EXTERNO** | **0** *(execuções externas rastreadas em [`EXTERNAL_CONSULTATIONS.md`](EXTERNAL_CONSULTATIONS.md) / quadro M2)* |
| **VALIDADO EXTERNO** | **0** |
| **OBSOLETO** | **0** |

_Pricing legacy: [`PRICING_DECISION.md`](../PRICING_DECISION.md) banner LEGACY; decisão **DEC-PROD-005** permanece válida via A1._
