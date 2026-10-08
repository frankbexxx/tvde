# Lei 59/2026 — Findings técnicos (produto/repo)

**Tipo:** factos confirmados no código e documentação operacional do repo  
**Data:** 2026-10-08  
**Não é:** parecer jurídico · matriz legal completa · roadmap de implementação  

**Referências (detalhe noutros sítios):**  
[`A3_REQUISITOS_TVDE_SETEMBRO_2026.md`](../legal/A3_REQUISITOS_TVDE_SETEMBRO_2026.md) · [`TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md`](../legal/TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md) · [`VAMULA_VENTOS_FERTEIS_REGISTO_OFICIAL_2026.md`](../legal/VAMULA_VENTOS_FERTEIS_REGISTO_OFICIAL_2026.md) · [`ROADMAP_FINAL_ENTREGA_TVDE_2026.md`](../ROADMAP_FINAL_ENTREGA_TVDE_2026.md)

---

## 1. Fechado (técnico / operacional no repo)

| Área | Evidência resumida |
|------|-------------------|
| Licença **gestor da plataforma** IMT | Registo documental L-26 / M2-L0 — Ventos Férteis · licença **354/2026** |
| Reclamações / LRE / RAL | API `/complaints` · site `/reclamacoes/` · retenção 2 anos (L-12/L-25 fechados na matriz) |
| Base técnica **viagens** | Ciclo pedir → matching → executar → concluir/cancelar; roles; partner tenant |
| **Preço e breakdown** | `price_breakdown` · UI `PriceFormulaBreakdown` (activa + histórico) |
| **Taxa intermediação 15%** visível | Snapshot na viagem + UI passageiro; guard 0–25% no backend |
| **Pagamentos Stripe** (técnico) | PI, wallet, webhooks, mock/live por env; reconcile admin |
| **Histórico** viagem / pagamento passageiro | Histórico + detalhe com estado pagamento (sem factura legal) |
| Foundation **auditoria** | `audit_events` · admin audit-trail · trilhos reclamação/emergência |
| Foundation **driving-hours** | Segmentos · WARN/RECORD ON · rolling 24h (`ENABLE_DRIVING_HOURS_COMPLIANCE`) |
| Foundation **SOS / emergência** | `/emergency` · SOS PAX/DRV · `tel:112` · snapshot · share/clipboard |

---

## 2. Gaps técnicos confirmados

| Gap | Estado no repo |
|-----|----------------|
| Integração IMT **operador** | **AUSENTE** |
| Integração IMT **motorista** | **AUSENTE** |
| Integração IMT **veículo** | **AUSENTE** |
| Gate / bloqueio **operador** (licença TVDE frota) | **AUSENTE** |
| Bloqueio **motorista / veículo** | **PARCIAL** (approve admin · docs viatura com gates env; ≠ IMT) |
| **Enforcement** 10 h / 24 h | **OFF** (`ENABLE_DRIVING_HOURS_ENFORCEMENT=false`) |
| **Cross-platform** hours | **AUSENTE** |
| **Factura electrónica** | **AUSENTE** |
| **Reporting AMT** | **AUSENTE** |
| Apuramento contribuição **AMT 5%** | **AUSENTE** |
| Contratos adesão / **versionamento** na app | **AUSENTE** |
| Retenção / evidência **2 anos** (actividade) | **PARCIAL** (complaints 2y · trip histórico · audit 730d) |
| **Emergência** | **PARCIAL** — foundation implementada; **validação externa pendente** |

**Nota:** `ENABLE_VEHICLE_COMPLIANCE_GATES` — default código `false`; PROD documentado com `true` para **documentos de viatura** (G-KYC-P0-04). Isto **não** substitui R02–R04 IMT.

---

## 3. Princípios (não assumir)

- Piloto fechado **≠** isenção automática face à lei.
- Upload documental **≠** validação IMT.
- Aprovação admin **≠** validação oficial.
- SOS existente **≠** conformidade jurídica automaticamente provada.
- Recibo / cobrança Stripe **≠** factura electrónica legal.
- **M1 técnico** permanece fechado; estes gaps pertencem ao caminho **M2 / operação TVDE real**.

---

## 4. Impacto por fase

### Antes de qualquer operação TVDE real

- IMT + bloqueios operador/motorista/veículo (ou processo alternativo **validado externamente**).
- 10 h / 24 h conforme **decisão jurídica** (enforcement actualmente OFF).
- Motoristas, veículos e operador **reais e válidos** (ops + docs).
- Emergência **validada** (advogado) face à foundation actual.

### Antes de Stripe Live

- Webhook / smoke Live · reconciliação · refund manual (runbooks `docs/runbooks/PILOT_*`).
- Factura ao passageiro · fiscal comissão / IVA · AMT (contabilista).

### Pode esperar

- OTP SMS ([`S-AUTH-01_OTP_SMS_DECISION.md`](S-AUTH-01_OTP_SMS_DECISION.md)).
- Connect / payout automático.
- Automação avançada de suporte.
- Funcionalidades pós-piloto (export AMT automatizado, cross-platform hours, etc.).

---

## 5. Estado

**Estado:** base técnica M1 pronta; conformidade M2 ainda depende de integração IMT, enforcement, fiscal/facturação e validações externas.
