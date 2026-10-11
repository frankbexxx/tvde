# DRAFT — Blueprint dossier contabilista (não final)

| Campo | Valor |
|-------|--------|
| **Dossier ID** | `EXT-FIS-DRAFT` *(substituir por EXT-FIS-YYYY-MM-DD no envio)* |
| **Estado** | **BLUEPRINT / DRAFT** — não enviar |
| **Confidencialidade** | EXTERNAL-CONFIDENTIAL |
| **Template base** | [`EXTERNAL_DOSSIER_TEMPLATE.md`](EXTERNAL_DOSSIER_TEMPLATE.md) |

> **Aviso:** Nota fiscal de ~1 página (§C3 M2) a redigir a partir do modelo comercial **A1.4** — sem inventar conclusões.

---

## Q-EXT incluídas (PRONTO ENVIO)

| Ordem sugerida | ID | Tema | Prioridade |
|----------------|-----|------|------------|
| 1 | Q-EXT-FIS-004 | Acerto manual semanal Partner | P0 |
| 2 | Q-EXT-FIS-002 | Comissão 15% + base sem IVA | P1 |
| 3 | Q-EXT-FIS-001 | Factura / documento ao passageiro | P1 |
| 4 | Q-EXT-FIS-003 | Contribuição AMT 5% | P1 |
| 5 | Q-EXT-FIS-006 | Portagens fora da comissão | P1 |
| 6 | Q-EXT-FIS-005 | Refunds / chargebacks | P1 |

**Fase seguinte (PREPARAR no registo):** Q-EXT-FIS-007 (arquivo mensal), Q-EXT-FIS-008 (tesouraria Stripe) — podem compor **segundo** envio ou anexo ao dossier v2.

**AMT procedimental (não contabilista):** Q-EXT-AMT-001 / 002 — dossier separado ou referência cruzada.

---

## Documentos internos — fontes

| Documento | Uso no dossier |
|-----------|----------------|
| [`A1_MODELO_ECONOMICO_SETEMBRO_2026.md`](../../business/A1_MODELO_ECONOMICO_SETEMBRO_2026.md) | A1.4, A1-D01…D10, §6c–§6d CRS/AMT económico |
| [`VAMULA_DECISOES_OPERACIONAIS_2026-09-09.md`](../../business/VAMULA_DECISOES_OPERACIONAIS_2026-09-09.md) | Comissão 15%, settlement manual |
| [`DECISIONS.md`](../../registers/DECISIONS.md) | DEC-FIS-001…011, DEC-BIZ-001/002, DEC-PAY-001, DEC-LEG-008 |
| [`FINDINGS.md`](../../registers/FINDINGS.md) | FIND-LEG-L13, FIND-LEG-FIS-01, FIND-LEG-AMT-02, STRIPE-LIVE-02 |
| [`TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md`](../../legal/TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md) | L-13, L-16, L-18 |
| [`STRIPE_LIVE_READINESS_2026-10-08.md`](../../architecture/STRIPE_LIVE_READINESS_2026-10-08.md) | Contexto refunds (finding 02) — **não** pedir fix técnico ao contabilista |
| [`PRICING_DECISION.md`](../../PRICING_DECISION.md) | Modelo híbrido (referência) |
| [`TVDE_DECISOES_EXTERNAS_PENDENTES.md`](../../business/TVDE_DECISOES_EXTERNAS_PENDENTES.md) | F1–F6 |

---

## Anexos candidatos

| ID | Candidato | Notas |
|----|-----------|-------|
| A1 | Tabela resumo A1.4 (tarifas + 15%) | Extrair do doc interno; **sem** IBAN |
| A2 | Exemplo **anonimizado** `price_breakdown` | Estrutura campos, viagem fictícia |
| A3 | Runbook refund | [`PILOT_STRIPE_REFUND.md`](../../runbooks/PILOT_STRIPE_REFUND.md) — processo ops |

---

## Dependências abertas

| Dependência | Impacto |
|-------------|---------|
| **O5** comprovativo acerto manual | Detalhe FIS-004 |
| Resposta **advogado** L-13/L-16 | Pode condicionar FIS-002/FIS-001 |
| **Stripe Live** (DEC-PAY-001) | Timing facturação real vs mock |
| Q-EXT-FIS-007/008 | Dossier v2 |

---

## Secções 6–9

Preencher via [`EXTERNAL_DOSSIER_TEMPLATE.md`](EXTERNAL_DOSSIER_TEMPLATE.md). Perguntas = [`EXTERNAL_CONSULTATIONS.md`](../../registers/EXTERNAL_CONSULTATIONS.md).

**Registo de envio:** vazio até manifesto [`outbox/`](../outbox/).
