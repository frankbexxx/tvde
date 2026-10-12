# Anexo A1 — Resumo tarifário (piloto V1)

**Dossier:** EXT-FIS-2026-10-12  
**Audiência:** Contabilista / TOC  
**Confidencialidade:** EXTERNAL-CONFIDENTIAL  
**Fontes internas (sem alteração de registos):** A1.4 CLOSED (2026-09-18) · `tariffs.py` V1 · decisões A1-D01, A1-D02, A1-D08, A1-D09, DEC-FIS-011

Este anexo resume **factos comerciais fechados** relevantes para a consulta fiscal. **Não** constitui orientação contabilística nem documento fiscal.

---

## Comissão de intermediação (piloto)

| Item | Valor / regra |
|------|----------------|
| Taxa nominal piloto | **15%** (fixa; acordada para fase piloto) |
| Limite legal máximo | **25%** (guarda técnica antes da captura; não confundir com taxa comercial) |
| Base exacta da comissão | **Em validação contabilística** — ver Anexo A2 e **Q-EXT-FIS-002** (duas formulações internas coexistem) |

---

## Portagens

| Item | Regra |
|------|--------|
| Comissão da plataforma sobre portagens | **0%** no modelo actual (A1.4) |
| Inclusão no preço | Portagens podem integrar o **preço final** cobrado ao passageiro |
| Base comissionável (runtime / A1.4) | Comissão calculada sobre montante **excluindo** portagens (Pet incluído na base fare) |

---

## Tarifário por categoria (V1)

Grelha comercial aceite em A1.4 (valores em EUR):

| Categoria | Base (arranque) | €/km | €/min | Mínimo viagem |
|-----------|-----------------|------|-------|---------------|
| **GO** | 1,50 | 0,60 | 0,12 | 4,50 |
| **Comfort** | 1,90 | 0,85 | 0,15 | 5,50 |
| **XL** | 3,00 | 1,05 | 0,15 | 6,50 |

**Fórmula de fare (runtime):** subtotal = base + km×€/km + min×€/min; fare = max(subtotal, mínimo); extras (Pet, portagens) somam ao total conforme regras abaixo.

**Versão tarifária:** V1 (snapshot persistido na viagem para cálculo no `complete`).

---

## Extras e funcionalidades V1

| Item | Estado / valor |
|------|----------------|
| **Pet** | Sobretaxa fixa **+1,50 €** quando aplicável |
| **Cancelamento** | Taxa comercial fixa **3,00 €** (valor registado; cobrança efectiva ao passageiro **adiada** até fluxo pós-B1 operacional — piloto pré-B1 regista sem cobrar) |
| **Surge (preço dinâmico)** | **OFF** na V1 |
| **Tempo de espera facturável** | **OFF** na V1 |
| **MB WAY** | Fora do piloto V1 (fase posterior) |

---

## Pagamentos — Stripe (piloto)

| Item | Regra |
|------|--------|
| Base da comissão vs fee Stripe | Fees Stripe **fora** da base da comissão de intermediação (DEC-FIS-002 / A1-D02) |
| Quem paga a fee Stripe | **Plataforma absorve** no piloto; passageiro paga apenas o **preço final** acordado (DEC-FIS-009 / A1-D09) |
| Repartição fee | **Não** descontar a fee Stripe ao parceiro TVDE nem ao motorista no modelo piloto |

---

## Liquidação ao parceiro (contexto; sem comprovativo)

| Item | Regra interna (processo) |
|------|---------------------------|
| Cadência | **Semanal**, dia previsto **segunda-feira** |
| Âmbito | Viagens **concluídas**; liquidação **manual** (sem Connect/split automático no piloto) |
| Beneficiário | Parceiro / frota TVDE |
| Fórmula operacional simplificada (A1-D04) | Líquido a liquidar descrito internamente como Σ `final_price` − comissão plataforma **15%** — **pode divergir** da base com portagens e do tratamento de IVA; **validação contabilística pendente** |

**Lacuna O5:** comprovativo formal do acerto (onde fica arquivado, quem valida) **não** incluído neste pacote v1.

---

## O que este anexo não cobre

- Emissão de factura / documento ao passageiro (Q-EXT-FIS-001)
- Apuramento contabilístico contribuição AMT 5% (Q-EXT-FIS-003)
- Tratamento contabilístico de refunds e chargebacks (Q-EXT-FIS-005; resumo operacional no Anexo A3)
- Tesouraria Stripe detalhada (consulta v2)

---

*Documento de apoio ao dossier EXT-FIS-2026-10-12. Estado dossier: REVIEW — não enviado.*
