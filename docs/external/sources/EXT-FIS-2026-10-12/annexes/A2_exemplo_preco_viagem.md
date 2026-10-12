# Anexo A2 — Exemplo didáctico de estrutura de preço (anonimizado)

**Dossier:** EXT-FIS-2026-10-12  
**Audiência:** Contabilista / TOC  
**Confidencialidade:** EXTERNAL-CONFIDENTIAL  

**EXEMPLO DIDÁCTICO / NÃO DOCUMENTO FISCAL**

Identificador fictício: **VIAGEM-EX-001** · Categoria **GO** · Sem dados reais de passageiro, motorista, pagamento ou parceiro.

Este anexo **não** resolve **Q-EXT-FIS-002**. Apresenta **duas variantes internas** (α e β) que coexistem na documentação e no produto; **nenhuma** é conclusão fiscal. A resposta do contabilista é necessária para fechar base, IVA, arredondamentos e líquido ao parceiro.

---

## 1. Premissas do exemplo (valores fictícios)

| Campo | Valor (EUR) | Nota |
|-------|-------------|------|
| Fare + Pet (sem portagens) | 9,50 | Montante ilustrativo; não desdobramos km/min neste anexo |
| Portagens | 2,00 | Integradas no preço cobrado ao passageiro |
| **Preço final (`final_price`)** | **11,50** | 9,50 + 2,00 |
| Taxa comercial comissão | 15% | Piloto |
| IVA (Portugal Continental) | 23% | **Sobre a comissão de intermediação**, conforme dossier — **não** sobre o preço total da viagem neste exemplo |

**Composição interna do 9,50 €:** apenas contextual (tarifário GO V1); o exemplo usa totais já fechados para focar base de comissão e IVA.

---

## 2. Variante α — formulação A1-D02 / DEC-FIS-002 (documentação interna)

**Definição interna:** comissão = `final_price × commission_percent` (fees Stripe fora da base; não entram neste cálculo).

### 2.1. Fórmulas (variante α)

| Passo | Fórmula |
|-------|---------|
| Base da comissão | `B_α = final_price` |
| Comissão 15% | `C_α = B_α × 15%` |
| IVA 23% s/ comissão | `IVA_α = C_α × 23%` |
| Total comissão + IVA | `T_α = C_α + IVA_α` |
| Líquido ilustrativo parceiro (hipótese A2) | `L_α = final_price − C_α − IVA_α` |

**Hipótese A2 (explicita neste anexo):** o parceiro receberia, num modelo puramente ilustrativo, o preço final **menos** comissão **menos** IVA da comissão. **Não** há decisão interna fechada que confirme que o acerto semanal deduz IVA desta forma — ver secção 5.

### 2.2. Cálculo numérico (variante α)

Valores intermédios antes de arredondamento:

| Passo | Cálculo exacto | Valor |
|-------|----------------|-------|
| Preço final | — | 11,50 € |
| Portagens (informativo) | — | 2,00 € |
| Base comissão `B_α` | 11,50 | **11,50 €** |
| Comissão 15% | 11,50 × 0,15 = 1,725 | **1,73 €** (arred.) |
| IVA 23% s/ comissão | 1,725 × 0,23 = 0,39675 → com 1,73: 1,73 × 0,23 = 0,3979 | **0,40 €** (arred.) |
| Total comissão + IVA | 1,73 + 0,40 | **2,13 €** |
| Líquido ilustrativo `L_α` | 11,50 − 1,73 − 0,40 | **9,37 €** |

---

## 3. Variante β — A1.4 CLOSED / runtime actual

**Definição interna (A1.4 + código):** base comissionável = `final_price − portagens`; comissão = base × 15% (Pet já incluído no fare; portagens excluídas).

### 3.1. Fórmulas (variante β)

| Passo | Fórmula |
|-------|---------|
| Base da comissão | `B_β = final_price − portagens` |
| Comissão 15% | `C_β = B_β × 15%` |
| IVA 23% s/ comissão | `IVA_β = C_β × 23%` |
| Total comissão + IVA | `T_β = C_β + IVA_β` |
| Líquido ilustrativo parceiro (hipótese A2) | `L_β = final_price − C_β − IVA_β` |

### 3.2. Cálculo numérico (variante β)

| Passo | Cálculo exacto | Valor |
|-------|----------------|-------|
| Preço final | — | 11,50 € |
| Portagens | — | 2,00 € |
| Base comissão `B_β` | 11,50 − 2,00 | **9,50 €** |
| Comissão 15% | 9,50 × 0,15 = 1,425 | **1,43 €** (arred.) |
| IVA 23% s/ comissão | 1,425 × 0,23 = 0,32775 → com 1,43: 1,43 × 0,23 = 0,3289 | **0,33 €** (arred.) |
| Total comissão + IVA | 1,43 + 0,33 | **1,76 €** |
| Líquido ilustrativo `L_β` | 11,50 − 1,43 − 0,33 | **9,74 €** |

---

## 4. Quadro comparativo (mesmo `final_price`)

| # | Conceito | Variante α | Variante β |
|---|----------|------------|------------|
| 1 | Preço final | 11,50 € | 11,50 € |
| 2 | Portagens | 2,00 € | 2,00 € |
| 3 | Base da comissão | 11,50 € | 9,50 € |
| 4 | Comissão 15% | 1,73 € | 1,43 € |
| 5 | IVA 23% s/ comissão | 0,40 € | 0,33 € |
| 6 | Total comissão + IVA | 2,13 € | 1,76 € |
| 7 | Líquido ilustrativo parceiro (hipótese A2) | 9,37 € | 9,74 € |

---

## 5. Regra de IVA usada neste anexo

- **Objecto de IVA no exemplo:** apenas a **comissão de intermediação** (15%), à taxa **23%** (Portugal Continental), conforme enquadramento do dossier.
- **Fórmula:** `IVA = comissão × 23%`, calculada **depois** de obter a comissão de cada variante.
- **Não** se calcula IVA sobre portagens nem sobre o preço total da viagem neste exemplo.
- O **tratamento contabilístico e documental do IVA** na relação entre plataforma e parceiro integra a consulta; a **taxa aplicável à comissão** neste modelo é **23%**.

---

## 6. Regra de líquido ao parceiro usada neste anexo

| Regra | Descrição |
|-------|-----------|
| **Hipótese A2 (este anexo)** | `líquido ilustrativo = preço final − comissão − IVA da comissão` |
| **Documentação acerto semanal (A1-D04)** | Descreve líquido operacional como Σ `final_price` − **15%** **sem** explicitar dedução de IVA nem exclusão de portagens na percentagem — **terceira formulação**, não harmonizada com α ou β |
| **Etiqueta** | Os valores `L_α` e `L_β` são **líquidos ilustrativos segundo a hipótese A2**, **não** “líquido definitivo” nem comprovativo de acerto |

---

## 7. Arredondamento

| Aspecto | Tratamento neste anexo |
|---------|-------------------------|
| Casas decimais | EUR, **2 decimais** |
| Método ilustrativo | **Por componente** (comissão e IVA arredondados separadamente), alinhado ao comportamento do runtime (`ROUND_HALF_UP` a 2 dp por montante) |
| Ordem | Comissão sobre base **exacta** (11,50 ou 9,50) → arredondar comissão → IVA sobre comissão (exacta ou já arredondada: ambas as linhas mostradas onde divergem) → arredondar IVA |
| Contabilidade | **Regra fiscal definitiva de arredondamento e ordem de cálculo a validar** com o contabilista; este anexo **não** fixa norma |

**Nota sobre IVA α:** 1,725 × 23% = 0,39675 € → 0,40 €; usando comissão já arredondada 1,73 × 23% = 0,3979 € → 0,40 € (mesmo resultado aqui).

**Nota sobre IVA β:** 1,425 × 23% = 0,32775 € → **0,33 €**; com comissão arredondada 1,43 × 23% = 0,3289 € → **0,33 €**.

---

## 8. Stripe — linha separada (ilustrativa)

| Item | Valor / nota |
|------|----------------|
| Rótulo | **Custo operacional da plataforma — ilustrativo** |
| Exemplo (ordem de grandeza piloto) | Sobre 11,50 € cobrados: fee tipo **1,5% + 0,25 €** ≈ **0,42 €** (referência económica interna; valor exacto depende do contrato Stripe) |
| Tratamento | **Não** entra na base da comissão · **Não** entra no IVA da comissão · **Não** deduzido do líquido parceiro neste exemplo · **Absorvida pela plataforma** no piloto (DEC-FIS-009) |
| Natureza | **Não** norma contabilística — apenas custo ops para contexto |

---

## 9. Estrutura de campos (referência `price_breakdown`, sem dados reais)

Campos típicos persistidos na viagem (nomes ilustrativos): categoria, versão tarifária, componentes fare, sobretaxa Pet, portagens, **preço final**, montantes de comissão calculados pelo sistema conforme **variante β** no runtime — **sem** substituir a pergunta fiscal sobre qual base contabilizar.

---

*Documento de apoio ao dossier EXT-FIS-2026-10-12. Q-EXT-FIS-002 permanece aberta. Estado dossier: REVIEW — não enviado.*
