# A1 — Levantamento do modelo económico (Setembro 2026)

**Tipo:** levantamento factual — **não** é tarifário aprovado nem acta de validação  
**Data:** 2026-09-03 · **Actualizado:** 2026-09-11 *(A2.5 tarifário V1)*  
**IDs:** `S-BIZ-01` · `BUSINESS-MANEL-001` · roadmap **A1**  
**Estado A1 global:** **PARCIAL** — A1.1 DONE · **A1-D01…D10 DONE** · **A1.2 = READY FOR ECONOMIC MODELLING** *(não ACCOUNTING FINAL)* · **A1.3 = READY FOR PRICING INPUT** · A1.4 aberto · **A2.5 = IMPLEMENTED** *(código)*  
**Regra:** valores sem fonte = **não inventados**. Hipóteses Manel ≠ decisão (exceto **A1-D01…D10** registados).

---

## 1. Pacote de fontes (A1.1)

| Doc | Natureza | Uso |
|-----|----------|-----|
| [`MANEL_PRICING_COMMISSION_MODEL_2026-08.md`](MANEL_PRICING_COMMISSION_MODEL_2026-08.md) | Hipótese / estudo | Comissão, tarifas por categoria, cancel 3–5 € |
| [`MANEL_COSTS_OPERATION_MODEL_2026-08.md`](MANEL_COSTS_OPERATION_MODEL_2026-08.md) | Hipótese | Custos tech mensais por fase |
| [`MANEL_GO_TO_MARKET_AND_SIMULATOR_2026-08.md`](MANEL_GO_TO_MARKET_AND_SIMULATOR_2026-08.md) | Hipótese | Margem/viagem · GTM · brief simulador 36m (**não construído**) |
| [`PRICING_DECISION.md`](../PRICING_DECISION.md) | **Decisão fechada** | Modelo híbrido estimativa → preço final |
| [`MANEL_INPUTS_TODOS_2026-08-07.md`](../product/MANEL_INPUTS_TODOS_2026-08-07.md) | Backlog perguntas | Q1 comissão · Q3 payout · Q10 líquido |
| [`ROADMAP_FINAL_ENTREGA_TVDE_2026.md`](../ROADMAP_FINAL_ENTREGA_TVDE_2026.md) | Canónico | A1 validar · A2 fechar % · B1/B3/B4 camadas |
| Código | `config.py` · `pricing.py` · `trips.py` · `payments.py` | Comportamento runtime |

*Docs antigos (`PROJECT.md` 15%→12,5%, auditorias Maio): **não** baseline — ver **A1-D01** (12%/12,5% só futuro condicionado).*

---

## 2. Matriz do modelo económico

| Tema | Estado actual | Valor/regra | Fonte | Implementado? | Decisão necessária? |
|------|---------------|-------------|-------|---------------|---------------------|
| Modelo preço (estimativa → final) | **FECHADO** | Estimativa não vinculativa; preço final em `complete_trip` = valor de captura | `PRICING_DECISION.md` | Sim (BE + copy UX) | Não |
| Fórmula fare runtime | **FECHADO** *(A2.5)* | `raw = base + km×€/km + min×€/min`; `fare_subtotal = max(raw, minimum)`; + Pet + tolls | `tariffs.py` · `pricing.py` · **A2.5** | Sim (GO/Comfort/XL) | A1.4 acta formal |
| Comissão runtime | **FECHADO** *(%)** / **FECHADO** *(fórmula)* | `commissionable = final_price − tolls_amount`; `commission = commissionable × %` · piloto **15%** (**A1-D01**); Pet **incluido**; portagens **0%** | `trips.py` · **A1-D01** · A2.5 | Sim | Tiers futuros = não baseline |
| Base da comissão | **FECHADO** | Sobre **fare + Pet** (não tolls); fees Stripe **fora** da base (**A1-D02**) | `trips.py` · **A1-D02** · A2.5 | Sim | Não |
| % comissão piloto | **FECHADO** | **15%** acordado Francisco/Manel; 12% / 12,5% = **só futuro** (rentabilidade elevada e/ou acordos específicos) | **A1-D01** 2026-09-03 | Seed alinhado | Não (baseline) |
| Share Partner / frota | **FECHADO** *(beneficiário piloto)* | Liquidação piloto ao **Partner/Frota**; `driver_payout` = referência contabilística (**sem** payout directo ao Driver nesta fase) | **A1-D03** 2026-09-03 | Parcial (só calc. Driver) | Cadência = **A1-D04** |
| Driver líquido (display) | **PARCIAL** | UI mostra `driver_payout` / `commission_amount`; sem portagens/gorjetas/promo na fórmula | `DriverDashboard` · Q10 | Parcial | Fórmula completa = A1-D08 / E1 |
| Fees Stripe (valor) | **FECHADO** *(V1 cartão EEE)* | **1,5% + €0,25**/pagamento (cartões EEE standard, Stripe PT); V1 = **cartão**; MB WAY = **fase 2** | Stripe pricing PT 2026-09-11 · §6c | Não (custo ops) | Mix premium/UK/intl a medir em live |
| Quem absorve Stripe fee | **FECHADO** | Piloto: **plataforma absorve**; Pax paga só `final_price`; sem surcharge; **não** descontar a Driver nem a Partner; fee = custo da margem plataforma (**A1-D09**) | **A1-D09** 2026-09-03 | Não (custo ops) | Rever se 15% insuficiente após B1 |
| Contribuição AMT (CRS) | **FECHADO** *(regra económica)* · **NÃO no runtime** | **CRS = 5% × taxa de intermediação sem IVA**; com 15% → **0,75% da base** dos 15%; **não** implementar `0,75%×final_price` no código até fechar IVA/base | Lei 45/2018 · §6d · 2026-09-11 | **Não** | Contabilista: IVA prestação · NC/refunds · IRC · arredondamentos AMT |
| IVA / recibos / emissor | **DEPENDENTE EXTERNO** | A3-D08: após A1/A2 + contabilista; não escolher emissor agora | `A3_REQUISITOS` · A3-D08 | Não | Contabilista (fora A1-D económicos) |
| Settlement Pax (cobrança) | **PARCIAL** *(hardening DONE)* | Auth accept placeholder **€0,50** → update+confirm+capture no complete; mismatch amount/currency **fail-closed**; confirm-on-accept **OFF** em live; mock → `succeeded`; live → webhook | `trips.py` · PR **#578** (`9871877`) · `PRICING_DECISION` | Sim (mock+guards); live = B1 | B1 go-live (não A1) |
| Connect / split automático | **FECHADO** *(requisito piloto)* | **Não** é requisito do piloto; manter D03/D04 manual semanal; B3 **fora** do crítico M2 nesta fase; Connect só depois se operação o exigir | **A1-D05** 2026-09-03 | Não | Pós-piloto / condicional |
| Payouts automáticos | **FECHADO** *(requisito piloto)* | **Não** são requisito do piloto; manter D03–D05; **B4 fora** do crítico M2 nesta fase; só depois se automatizar liquidação ao Partner | **A1-D06** 2026-09-03 | Não | Pós-piloto / condicional |
| Liquidação manual no piloto | **FECHADO** | **Semanal** · **segunda-feira** · ao Partner; só `completed`; líquido = Σ`final_price` − 15%; `driver_payout` só referência; **manual** até B3/B4; conta pagamentos: Manel (acta 09/09/2026) | **A1-D04** + [`VAMULA_DECISOES…`](VAMULA_DECISOES_OPERACIONAIS_2026-09-09.md) | Processo humano | Relatório mínimo §6a |
| Custos fixos/variáveis | **FECHADO** *(A1.2 modelagem)* · **≠ ACCOUNTING FINAL** | Rubricas técnicas confirmadas §6c; `MANEL_COSTS…` continua **não** orçamento (**A1-D10**). TBD: SMS · email · stores · chargebacks · suporte · legal/seguros · overage mapas | **A1-D10** · §6c 2026-09-11 | Não | Contabilidade formal depois |
| Margem plataforma | **FECHADO** *(A1.3 modelagem)* · **≠ tarifário** | Margem variável §6f + rateio fixos USD §6g; **READY FOR PRICING INPUT**; sem GO/Comfort/XL | §6f–§6g 2026-09-11 | Não | A1.4 + A2.5 |
| Arredondamento | **FECHADO** *(código)* | Fare `round(2)`; money `Decimal` **ROUND_HALF_UP** 0,01; Stripe cents `round(price×100)` min 50 | `pricing.py` · `payments.py` · `trips.py` | Sim | Não |
| Cancelamento — fee | **FECHADO** *(A1-D08 + runtime)* | **Cancellation fee V1 = €3,00 fixos** (`CANCELLATION_FEE_EUR`). Independente de estimate/categoria/Pet/tolls. Piloto pré-B1: **registar**, **não cobrar** (PI cancelado). | **A1-D08** · `pricing.py` | Sim (valor) | Captura real pós-B1 |
| Preço mínimo / categorias | **FECHADO** *(A2.5 IMPLEMENTED)* | V1: GO `x` 1,50/0,60/0,12/mín.4,50 · Comfort 1,90/0,85/0,15/mín.5,50 · XL 3,00/1,05/0,15/mín.6,50 · snapshot em `price_breakdown` | `tariffs.py` · **A2.5** | Sim | A1.4 acta |
| Simulador económico 36m | **ABERTO** | Brief existe; **simulador não construído** | GTM | Não | Ferramenta após validação números |
| Mock/demo vs real | **FECHADO** *(política actual)* | Piloto: `STRIPE_MOCK=true` típico; payouts reais **não**; comissão calculada na mesma | ENV_SINGLE_REALITY · demo docs | Sim (mock) | Go-live = B1 |
| Pacote 3 docs business no repo | **FECHADO** | Os 3 ficheiros `MANEL_*` existem e estão referenciados no roadmap | Roadmap A1 · `docs/business/` | N/A (docs) | Não (A1.1) |

### Contagens (matriz)

| Classificação | Nº *(após A1.2 fecho modelagem 2026-09-11)* |
|---------------|------------------------|
| **FECHADO** | **18** *(incl. A2.5 tarifário · Stripe V1 · A1.2/A1.3)* |
| **PARCIAL** | **1** *(settlement live)* |
| **ABERTO** | **1** (simulador 36m) |
| **DEPENDENTE EXTERNO** | **1** (IVA/recibos) |

---

## 3. Factos vs decisões (síntese)

### Facto actual (código / política técnica)

- Fare runtime **A2.5:** GO / Comfort / XL em `app.core.tariffs` (+ mínimo); snapshot rates em `price_breakdown`.  
- `BASE_FARE` / `PRICE_PER_*` em settings = **deprecated** (ignorados pelo motor).  
- Comissão: **15%** sobre `final_price − tolls_amount` (Pet incluído; tolls 0% — tolls ainda sempre 0).  
- Híbrido estimativa/final **implementado** (`PRICING_DECISION`).  
- Cancel fee V1: **€3,00 fixos** registados no cancel pós-accept; PI cancelado (sem cobrança até B1).  
- Payment hardening **#578** merged.

### Decisão já tomada

- Modelo **C — Híbrido** (estimativa ≠ preço final).  
- `ENABLE_CONFIRM_ON_ACCEPT` **OFF** neste modelo.  
- Piloto **pode** usar liquidação manual em vez de B3/B4 automáticos *(opção roadmap; não é ainda acta “é assim no nosso piloto”)*.  
- A3-D08: IVA/recibos **depois** A1/A2 + contabilista.  
- **A1-D01:** comissão piloto = **15%** (acordado Manel); 12%/12,5% só futuro condicionado.  
- **A1-D02:** base = **preço final bruto**; fees Stripe fora da base.  
- **A1-D03:** beneficiário liquidação piloto = **Partner/Frota**; plataforma liquida ao Partner; `driver_payout` = referência (sem payout directo ao Driver nesta fase); Partner gere relação financeira com Drivers.  
- **A1-D04:** liquidação **semanal / segunda-feira / manual** ao Partner; só viagens `completed`; líquido = Σ`final_price` − 15%; relatório mínimo (ver acta); conta pagamentos reais: Manel (confirmado 09/09/2026).  
- **A1-D05:** Connect/split **não** é requisito do piloto; B3 fora do crítico M2 nesta fase; D03/D04 mantêm-se.  
- **A1-D06:** payouts automáticos **não** são requisito do piloto; B4 fora do crítico M2 nesta fase.  
- **A1-D07:** piloto usa **grelha comercial Manel** (Go/Comfort/XL); defaults código deixam de ser baseline; híbrido estimativa→final **mantém-se**; implementação técnica pendente (aguarda mapeamento categorias Manel).  
- **A1-D08:** fee cancelamento = **3,00 € fixos**; legado 20%/1,50 deixa de ser baseline; piloto pré-B1 = registar sem cobrar; captura real quando B1 operacional.  
- **A1-D09:** piloto — **plataforma absorve** fee Stripe; Pax só `final_price`; sem surcharge; sem desconto a Driver/Partner; fee = custo operacional da margem; rever se 15% insuficiente após B1 live.  
- **A1-D10:** valores `MANEL_COSTS…` = **estimativas de planeamento** apenas; **não** orçamento aprovado; **não** usar 1–2,5 k€/mês como baseline oficial sem validação rubrica a rubrica. Método A1.2 = fixos vs variáveis (ver §6c).  
- **A1.2 (2026-09-11):** estado **READY FOR ECONOMIC MODELLING** — **não** ACCOUNTING FINAL.  
- **CRS/AMT (2026-09-11):** regra económica fechada §6d; **não** no runtime.  
- **Pagamentos V1:** cartão · Stripe EEE **1,5%+€0,25** · plataforma absorve · MB WAY **fase 2**.

### Ainda em aberto (económico)

- Acta A1.4 · input tarifário A2.5 · TBD ops (SMS, email, stores, chargebacks, suporte, legal, Hostinger).

---

## 4. Respostas às verificações pedidas

| Pergunta | Achado |
|----------|--------|
| Comissão nominal actual | **Piloto = 15%** (**A1-D01**). Runtime: `driver.commission_percent` (seed tipicamente 15). |
| 15% / 12% / outro | **15%** = baseline piloto. **12% / 12,5%** = possibilidades **futuras** apenas (rentabilidade elevada e/ou acordos específicos) — **não** baseline. |
| Base da comissão | **Bruto** `final_price` (**A1-D02**); fees Stripe não alteram a base. |
| Quem suporta Stripe fee | **Plataforma** no piloto (**A1-D09**); V1 cartão EEE = **1,5% + €0,25**. |
| Driver recebe líquido calculado? | **Sim** no modelo de dados/UI (`driver_payout`); **não** há transferência automática. |
| Partner tem share próprio? | **Beneficiário piloto = Partner/Frota** (**A1-D03**); sem split automático no código. |
| Plataforma recebe e liquida? | Cobrança Pax na plataforma; liquidação piloto ao **Partner** (A1-D03); `driver_payout` só referência. |
| Settlement manual aceite no piloto? | **Sim** — **semanal / segunda-feira / manual** ao Partner (**A1-D04** + acta 09/09/2026). |
| Connect necessário no piloto? | **Não** (**A1-D05**). |
| Payouts automáticos no piloto? | **Não** (**A1-D06**). |
| Preço mínimo? | **Sim** na grelha Manel (**A1-D07**); código ainda **sem** mínimo. |
| Arredondamentos? | **Sim** — 2 casas / HALF_UP. |
| Cancelamentos geram fee? | **Regra comercial = 3,00 € fixos (A1-D08)**. Código ainda legado; pré-B1: registar sem cobrar. |
| Simulador? | Brief GTM; **não existe** ferramenta. |
| Hardcoded divergente? | Código legado vs grelha Manel (**A1-D07** a implementar); ver §5. |

---

## 5. Divergências código ↔ docs

| Tema | Código | Docs / hipóteses | Nota |
|------|--------|------------------|------|
| €/min / tarifa | Código legado **0,15** (única) | Manel Go **0,12** · Comfort **0,15** · XL **0,18** | **A1-D07** = Manel é baseline; código a alinhar |
| Mínimo viagem | Nenhum | Go **4,50** / Comfort **6** / XL **8** | **A1-D07** — a implementar |
| Comissão pós-trial / tiers | Seed **15** · **A1-D01 = 15% piloto** | Manel tiers **12%** · `PROJECT.md` **12,5%** | **STALE como baseline** — só futuro condicionado (A1-D01) |
| Cancel fee | **€3,00 fixos** (`CANCELLATION_FEE_EUR`) | **A1-D08 = 3,00 € fixos** | Runtime alinhado; cobrança real pós-B1 |
| Categorias / surge | Uma tarifa | Go/Comfort/XL + multiplicadores | Só docs |
| Connect | Ausente | PROJECT menciona intenção | Aspiracional |

---

## 6. DECISÕES A1

### 6a. Acta — **DONE**

| ID | Decisão | Estado |
|----|--------|--------|
| **A1-D01** | Comissão inicial/piloto = **15%**, acordada com Manel. **12%** ou **12,5%** ficam **apenas** como possibilidades futuras se (a) operação a 15% demonstrar rentabilidade elevada e/ou (b) existirem acordos comerciais específicos. **Não** tratar 12%/12,5% como baseline actual. | **DONE** 2026-09-03 |
| **A1-D02** | Comissão calculada sobre o **preço final bruto** da viagem: `commission_amount = final_price × commission_percent`. Fees Stripe **não** alteram a base; fees de pagamento tratadas separadamente no modelo económico. | **DONE** 2026-09-03 |
| **A1-D03** | Beneficiário da liquidação no piloto = **Partner/Frota**. A plataforma liquida ao Partner/Frota. O Driver mantém `driver_payout` como valor **contabilístico/de referência** — **não** implica payout directo ao Driver nesta fase. O Partner trata da relação financeira posterior com os Drivers. Impactos: A2.4 · B3/B4 · copy Partner · liquidação manual piloto. | **DONE** 2026-09-03 |
| **A1-D04** | Cadência = **semanal** ao Partner/Frota · dia previsto = **segunda-feira** (confirmado 09/09/2026). Só viagens `completed`. Líquido a liquidar = Σ`final_price` − comissão plataforma **15%**. `driver_payout` só referência no relatório; **sem** payout directo ao Driver. Processo **manual** enquanto B3/B4 não existirem. Conta de pagamentos reais: **Manel**. Relatório mínimo: viagens concluídas · `final_price` · `commission_amount` · líquido Partner · `driver_payout` quando útil à reconciliação interna. | **DONE** 2026-09-03 · dia da semana **confirmado** 2026-09-09 |
| **A1-D05** | Stripe Connect / split automático **não** é requisito do piloto. Manter A1-D03/D04 (Partner · manual · semanal). **B3 fora** do caminho crítico do Marco 2 nesta fase. Connect só mais tarde se a operação real o exigir, houver vantagem operacional clara, ou for necessário automatizar split/liquidação. | **DONE** 2026-09-03 |
| **A1-D06** | Payouts automáticos **não** são requisito do piloto. Manter D03–D05 (Partner · manual · semanal · sem Connect). **B4 fora** do caminho crítico do Marco 2 nesta fase. Payouts automáticos só mais tarde se a operação exigir automatização da liquidação ao Partner. | **DONE** 2026-09-03 |
| **A1-D07** | Piloto usa a **grelha comercial Manel** (Go / Comfort / XL + mínimos). Defaults actuais do código **deixam de ser** a baseline comercial. Princípio: alinhar no produto o quanto antes as decisões essenciais; não manter defaults antigos só para evitar trabalho técnico. Modelo híbrido estimativa → preço final (**PRICING_DECISION**) **mantém-se**. Implementação de código = tarefa seguinte (fora desta acta); mapeamento categorias Manel↔código pendente de resposta Manel. | **DONE** 2026-09-03 |
| **A1-D08** | Fee de cancelamento = **3,00 € fixos**. Deixa de ser baseline comercial `max(1,50 €, 20% × estimativa)`. Regra comercial fixa e previsível. **Piloto pré-B1:** calcular e registar a fee; **não** cobrar efectivamente ao passageiro; **não** activar captura real só por esta decisão. Quando B1 estiver operacional, a cobrança real pode ser activada no fluxo adequado. | **DONE** 2026-09-03 |
| **A1-D09** | No piloto, a **plataforma absorve** a fee Stripe. Passageiro paga apenas `final_price` (sem surcharge/linha extra). **Não** descontar a fee ao Driver nem ao Partner. Fee de processamento = custo da margem da plataforma. Mantém-se comissão **15%** sobre bruto; fees Stripe tratadas separadamente como custo operacional. Se a margem a 15% se revelar insuficiente após B1 live, esta decisão pode ser revista. | **DONE** 2026-09-03 |
| **A1-D10** | Valores em `MANEL_COSTS…` são **apenas estimativas de planeamento**. **Não** constituem orçamento aprovado. **Não** usar 1–2,5 k€/mês como baseline oficial sem validação **rubrica a rubrica**. Método A1.2 aprovado: separar custos **fixos mensais** vs **variáveis**; fora do modelo técnico inicial: salários, marketing, contabilista, legal, seguros, suporte humano, aquisição de drivers (P&L completo depois). Stripe (D09) = custo variável da plataforma; valor exacto depende de B1/live. | **DONE** 2026-09-03 |

*Nota código:* D01–D10 = actas económicas/comerciais — **sem** alteração de código/Stripe/pricing nestas actas.

### 6b. Decisões A1-D — lista fechada

Nenhuma A1-D pendente. Trabalho restante = **A1.4** (acta) · input tarifário A2.5.

**A1.2:** **READY FOR ECONOMIC MODELLING** (2026-09-11) — **não** ACCOUNTING FINAL.  
**A1.3:** **READY FOR PRICING INPUT** (2026-09-11) — **não** A1.4 CLOSED.

**Fora de A1-D:** IVA/emissor recibos (`DEPENDENTE CONTABILISTA` · A3-D08); questões jurídicas; mobile; branding; activação técnica Stripe live (B1).

### Nota legal 2026-09-04 (AMT) — actualizada 2026-09-11

A1 considera a **contribuição AMT (CRS)** como custo/regra operacional. Detalhe económico fechado em **§6d**. **Não** altera **A1-D01** (comissão piloto **15%**). Ver [`A3_REQUISITOS`](../legal/A3_REQUISITOS_TVDE_SETEMBRO_2026.md) §8e.

### 6c. A1.2 — Modelo de custos técnicos

**Estado:** **READY FOR ECONOMIC MODELLING** (2026-09-11)  
**Não é:** ACCOUNTING FINAL  
**Objectivo:** rubricas técnicas confirmáveis para modelagem — **não** inventar preços.  
**Fora do modelo técnico inicial / TBD (não bloqueiam A1.3 inicial):** SMS OTP · email profissional/transaccional · stores mobile · chargebacks/fraude reais · suporte humano · seguros/contabilista/legal · overage mapas.

#### Custos fixos técnicos confirmados

| Rubrica | Tipo | Valor | Estado |
|---------|------|------:|--------|
| Render prod API (`tvde-api`) | Fixo | **$7,00/mês** | ✅ Confirmado |
| Render prod DB (`tvde-db`) | Fixo | **$6,30/mês** | ✅ Confirmado |
| Render prod frontend (`tvde-app`) | Fixo | **$0,00/mês** | ✅ Confirmado |
| Render staging (API+DB+app) | Fixo | **$17,50/mês** | ✅ Confirmado |
| **Total Render** | Fixo | **$30,80/mês** | ✅ *(prod $13,30 + staging $17,50)* |
| MapTiler | Fixo potencial | Free **não** serve operação comercial; **Flex $30/mês** USD + overage (**s/ IVA**) | ✅ Confirmado (política comercial) |
| Cloudflare DNS / Pages | Fixo | **$0** baseline | ✅ Confirmado |
| cron-job.org | Fixo | **€0** baseline | ✅ Confirmado |
| Sentry Developer | Fixo | **$0** baseline enquanto suficiente | ✅ Confirmado |
| **Hostinger Premium** (hosting + DNS + email) | Fixo | **TBD — contrato real a inserir** | ⏳ Sem valor lançado no repo (não inventar) |

*Nota MapTiler:* custo actual de utilização pode ser $0 em Free, mas **produção comercial TVDE exige Flex (≥ $30/mês)** — usar **$30** como baseline de modelagem de mapas, não $0.

#### Pagamentos (V1)

| Item | Regra | Estado |
|------|-------|--------|
| Método V1 | **Cartão** | ✅ |
| Stripe EEE standard | **1,5% + €0,25** / pagamento | ✅ fonte oficial Stripe PT 2026-09-11 |
| Absorção fee | **Plataforma** (**A1-D09**) | ✅ |
| MB WAY | Stripe **suporta**; **não** entra no V1; **fase 2** (incompatível com manual capture + lifecycle `final_price`) | ✅ decisão produto |
| Connect / payouts | Fora do piloto (**A1-D05/D06**) | ✅ |

#### Payment hardening (registo)

| Item | Valor |
|------|-------|
| PR | [#578](https://github.com/frankbexxx/tvde/pull/578) **MERGED** |
| `main` | `9871877` |
| Placeholder €0,50 | Protegido (fail-closed se `requires_capture` com amount ≠ final) |
| Amount/currency mismatch | Fail-closed em complete · webhook · reconcile |
| Confirm-on-accept | Desactivado em **prod** e **staging live** |
| MB WAY | Fase 2 (fora deste hardening) |

#### Custos ainda abertos (TBD)

| Rubrica | Notas |
|---------|-------|
| Hostinger Premium | Plano / custo total / período / mensal equivalente / IVA / promo vs renovação — **TBD** no repo |
| SMS OTP | Fornecedor não escolhido |
| Email profissional / transaccional | Não definido |
| Stores mobile | Fora do crítico actual |
| Chargebacks / fraude reais | Risco variável; fee dispute Stripe tipicamente €20 (EEE) |
| Suporte humano | Fora do modelo técnico inicial |
| Seguros / contabilista / legal | P&L completo depois |
| Overage mapas (MapTiler Flex+) | Se volume > quotas Flex |

Estes **não** impedem análise económica inicial (A1.3).

#### Sumário A1.2 (modelagem)

| Categoria | Total / regra | Notas |
|-----------|---------------|-------|
| Fixos Render | **$30,80/mês** | Inclui staging |
| Mapas (comercial) | **$30/mês** Flex baseline | + IVA se aplicável; + overage TBD |
| Cloudflare + cron + Sentry | **€0 / $0** baseline | Upgrade se limites |
| Variável por viagem (V1) | Stripe **1,5%+€0,25** + CRS §6d | Absorvidos na margem plataforma |
| Estado | **READY FOR ECONOMIC MODELLING** | ≠ ACCOUNTING FINAL |

### 6d. AMT / CRS — regra económica (2026-09-11)

**Regra confirmada:**

```text
CRS = 5% × taxa de intermediação sem IVA
```

Com comissão VAMULÁ **15%** sobre a base de comissão (piloto: `final_price` bruto, **A1-D01/D02**):

```text
CRS = 0,75% da base sobre a qual os 15% são calculados
```

| Item | Valor |
|------|-------|
| Periodicidade | **Mensal** |
| Regime | **Autoliquidação** |
| Pagamento | Até **final do mês seguinte** |

**IMPORTANTE — runtime:** **não** implementar ainda `0,75% × final_price` no código. Preservar distinção **preço / base / IVA**. Até o contabilista fechar a base IVA da prestação, o modelo económico usa a regra acima **só em documentação/simulação**.

**Pendentes contabilista:**

- tratamento contabilístico / IRC  
- notas de crédito / refunds  
- confirmação concreta do **IVA da prestação**  
- arredondamentos / instruções AMT  

### 6e. *(reservado — ver §6c Payment hardening)*

### 6f. A1.3 — Margem variável por ticket (fechado 2026-09-11)

**Âmbito:** margem **variável** por viagem — **sem** decidir GO/Comfort/XL · **sem** alterar pricing/código. Rateio de fixos → **§6g**.

**Fórmulas (modelagem):**

| Componente | Fórmula |
|------------|---------|
| Comissão VAMULÁ | `0,15 × final_price` |
| CRS | `0,05 × comissão` (= `0,0075 × final_price` **só na simulação**) |
| Stripe (EEE standard) | `0,015 × final_price + 0,25` |
| Margem variável | `comissão − CRS − Stripe` |
| Margem efectiva % (só variável) | `margem variável / final_price` |

| `final_price` | Comissão 15% | CRS 5%×com. | Stripe 1,5%+€0,25 | Margem variável | Margem % |
|-------------:|-------------:|-------------:|------------------:|----------------:|---------:|
| €4,00 | €0,60 | €0,030 | €0,310 | €0,260 | **6,50%** |
| €5,00 | €0,75 | €0,038 | €0,325 | €0,388 | **7,75%** |
| €7,50 | €1,125 | €0,056 | €0,363 | €0,706 | **9,42%** |
| €10,00 | €1,50 | €0,075 | €0,400 | €1,025 | **10,25%** |
| €15,00 | €2,25 | €0,113 | €0,475 | €1,663 | **11,08%** |
| €20,00 | €3,00 | €0,150 | €0,550 | €2,300 | **11,50%** |
| €30,00 | €4,50 | €0,225 | €0,700 | €3,575 | **11,92%** |
| €50,00 | €7,50 | €0,375 | €1,000 | €6,125 | **12,25%** |
| €100,00 | €15,00 | €0,750 | €1,750 | €12,500 | **12,50%** |

*Arredondamentos: centavos intermédios quando útil; % a 2 casas. Não é regra AMT/contabilidade.*

### 6g. A1.3 — Rateio de custos fixos por volume (**READY FOR PRICING INPUT** · 2026-09-11)

#### Fixos mensais usados nesta modelagem

| Rubrica | Moeda | Valor / mês | Notas |
|---------|-------|------------:|-------|
| Render (prod + staging) | USD | **30,80** | Factura confirmada A1.2 |
| MapTiler Flex (comercial) | USD | **30,00** | Baseline comercial; IVA/overage à parte |
| Cloudflare / cron / Sentry | — | **0** | Baseline A1.2 |
| **Subtotal fixos técnicos conhecidos** | **USD** | **60,80** | **Exclui Hostinger** |
| Hostinger Premium | — | **TBD** | Contrato real **não** lançado no repo |

**Câmbio:** subtotais em **USD** mantidos separados. **Não** há taxa EUR/USD oficial no repo nem factura EUR destes fornecedores.  
Para combinar com margens em **EUR**, usa-se apenas a hipótese ilustrativa:

> **H1 (ilustrativa):** `1 USD ≈ 1 EUR` — **só** ordem de grandeza; **não** é taxa contabilística.

Qualquer tabela “após fixos” abaixo está marcada **H1**.

#### Custo fixo por viagem (USD; excl. Hostinger)

| Viagens/mês | Fixo / viagem (USD) | Peso em ticket €5 *(H1)* | Peso €10 *(H1)* | Peso €20 *(H1)* |
|------------:|--------------------:|-------------------------:|---------------:|---------------:|
| 500 | **$0,122** | 2,43% | 1,22% | 0,61% |
| 1.000 | **$0,061** | 1,22% | 0,61% | 0,30% |
| 2.500 | **$0,024** | 0,49% | 0,24% | 0,12% |
| 5.000 | **$0,012** | 0,24% | 0,12% | 0,06% |
| 10.000 | **$0,006** | 0,12% | 0,06% | 0,03% |

*Com Hostinger TBD: o fixo/viagem sobe quando o valor mensal for inserido; até lá usar coluna “excl. Hostinger”.*

#### Margem por ticket com fixos rateados (H1)

Fórmulas: margem variável (§6f) − fixo/viagem ($60,80 / N sob H1).

**500 viagens/mês** (fixo/viagem ≈ $0,122 ≈ €0,122 H1)

| Ticket | Var. | Após fixos | Margem % |
|-------:|-----:|-----------:|---------:|
| €5 | €0,388 | €0,266 | **5,32%** |
| €10 | €1,025 | €0,903 | **9,03%** |
| €20 | €2,300 | €2,178 | **10,89%** |
| €30 | €3,575 | €3,453 | **11,51%** |
| €50 | €6,125 | €6,003 | **12,01%** |

**1.000 viagens/mês** (≈ €0,061 H1)

| Ticket | Var. | Após fixos | Margem % |
|-------:|-----:|-----------:|---------:|
| €5 | €0,388 | €0,327 | **6,53%** |
| €10 | €1,025 | €0,964 | **9,64%** |
| €20 | €2,300 | €2,239 | **11,20%** |
| €30 | €3,575 | €3,514 | **11,71%** |
| €50 | €6,125 | €6,064 | **12,13%** |

**2.500 viagens/mês** (≈ €0,024 H1)

| Ticket | Var. | Após fixos | Margem % |
|-------:|-----:|-----------:|---------:|
| €5 | €0,388 | €0,363 | **7,26%** |
| €10 | €1,025 | €1,001 | **10,01%** |
| €20 | €2,300 | €2,276 | **11,38%** |
| €30 | €3,575 | €3,551 | **11,84%** |
| €50 | €6,125 | €6,101 | **12,20%** |

**5.000 viagens/mês** (≈ €0,012 H1)

| Ticket | Var. | Após fixos | Margem % |
|-------:|-----:|-----------:|---------:|
| €5 | €0,388 | €0,375 | **7,51%** |
| €10 | €1,025 | €1,013 | **10,13%** |
| €20 | €2,300 | €2,288 | **11,44%** |
| €30 | €3,575 | €3,563 | **11,88%** |
| €50 | €6,125 | €6,113 | **12,23%** |

**10.000 viagens/mês** (≈ €0,006 H1)

| Ticket | Var. | Após fixos | Margem % |
|-------:|-----:|-----------:|---------:|
| €5 | €0,388 | €0,381 | **7,63%** |
| €10 | €1,025 | €1,019 | **10,19%** |
| €20 | €2,300 | €2,294 | **11,47%** |
| €30 | €3,575 | €3,569 | **11,90%** |
| €50 | €6,125 | €6,119 | **12,24%** |

#### Break-even técnico dos custos fixos conhecidos

**Não** é break-even empresarial total (exclui Hostinger TBD, SMS, suporte, chargebacks, legal, salários, marketing, …).

```text
N_be = ceil( fixos_USD_conhecidos / margem_variável_por_viagem )
```

Sob **H1** (`$60,80` ≈ €60,80):

| Ticket médio | Margem variável / viagem | **N_be** (viagens/mês, ceil) |
|-------------:|-------------------------:|-----------------------------:|
| €7,50 | €0,706 | **87** |
| €10,00 | €1,025 | **60** |
| €15,00 | €1,663 | **37** |
| €20,00 | €2,300 | **27** |

#### Impacto Hostinger

- **Estado:** `TBD — contrato real a inserir` (plano Premium · custo total · período · mensal equivalente · IVA · promo vs renovação).  
- Enquanto TBD: todas as tabelas §6g são **piso inferior** dos fixos (só Render+MapTiler).  
- Quando existir valor mensal H: somar a `$60,80` e recalcular fixo/viagem e N_be.

#### Conclusões A1.3 (para input de pricing — sem GO/Comfort/XL)

1. **Volume vs fixos:** a partir de ~**1.000–2.500** viagens/mês, o fixo conhecido por viagem cai abaixo de ~**€0,06–€0,02** (H1) e deixa de ser o driver da margem; a **estrutura variável** (Stripe €0,25 + %) domina.  
2. **Tickets pressionados:** **€5** (e €4/€7,50) — margem variável já baixa pelo €0,25 Stripe; fixos à escala piloto (500/mês) ainda tiram ~1–2 pp.  
3. **€5 / €7,50:** economicamente **aceitáveis** como tickets baixos se o mix médio for ≥€10 e o volume ≥~1k; **não** ideais como ticket médio exclusivo a 500/mês (margem efectiva ~5–8% H1 após fixos).  
4. **€10 / €20 típicos:** após fixos, ~**9–10%** (€10) e ~**11–11,5%** (€20) na maioria dos cenários ≥1k — estáveis.  
5. **Comissão 15%:** **não** há razão económica forte *só* destes fixos técnicos para rever a % — o stress está no **ticket curto + fee Stripe fixa**, não na carga Render/MapTiler. Revisão de 15% só se B1 live + Hostinger + TBD (SMS/suporte) mostrarem margem insuficiente.  
6. **Não** decide tarifário nem categorias.

**Estado A1.3:** **READY FOR PRICING INPUT** — **não** A1.4 CLOSED.

---

## 7. Próximo passo

1. Inserir **Hostinger Premium** real (quando contrato disponível) e recalcular §6g.  
2. **A2.5 / tarifário** com estes inputs — **sem** fechar A1.4 ainda se quiserem acta formal depois.  
3. Acta **A1.4** (aceite Francisco+Manel).  
4. Contabilista: IVA base CRS · NC/refunds · IRC · câmbio factura.  
5. Código (tarefas separadas): grelha Manel · cancel 3 € · CRS **não** no runtime até IVA.

---

**Frase:** A1-D01…D10 DONE; A1.2 **READY FOR ECONOMIC MODELLING**; A1.3 **READY FOR PRICING INPUT**; **A2.5 IMPLEMENTED** (GO/Comfort/XL + mínimos); A1.4 aberto; A1 global **PARCIAL**.
