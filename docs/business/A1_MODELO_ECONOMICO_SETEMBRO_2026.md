# A1 — Levantamento do modelo económico (Setembro 2026)

**Tipo:** levantamento factual — **não** é tarifário aprovado nem acta de validação  
**Data:** 2026-09-03  
**IDs:** `S-BIZ-01` · `BUSINESS-MANEL-001` · roadmap **A1**  
**Estado A1 global:** **PARCIAL** — A1.1 DONE · **A1-D01…D10 DONE** · **A1.2 EM CURSO** · A1.3–A1.4 abertos  
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
| Fórmula fare runtime | **PARCIAL** *(alinhar a D07)* | Fórmula `base + km×€/km + min×€/min` (+ **mínimo** a implementar); defaults código **1,50/0,60/0,15** = **legado** — baseline comercial = grelha Manel (**A1-D07**) | `pricing.py` · Manel pricing · **A1-D07** | Sim (1 tarifa) | Implementação técnica pendente |
| Comissão runtime | **PARCIAL** *(%)** / **FECHADO** *(fórmula)* | `commission_amount = final_price × (commission_percent/100)` · piloto **15%** (**A1-D01**) · seed tipicamente 15 | `trips.py` · **A1-D01** | Sim | % piloto = **DONE**; tiers futuros = não baseline |
| Base da comissão | **FECHADO** | Sobre **preço final bruto**; fees Stripe **não** entram na base (**A1-D02**) | `trips.py` · **A1-D02** | Sim | Não |
| % comissão piloto | **FECHADO** | **15%** acordado Francisco/Manel; 12% / 12,5% = **só futuro** (rentabilidade elevada e/ou acordos específicos) | **A1-D01** 2026-09-03 | Seed alinhado | Não (baseline) |
| Share Partner / frota | **FECHADO** *(beneficiário piloto)* | Liquidação piloto ao **Partner/Frota**; `driver_payout` = referência contabilística (**sem** payout directo ao Driver nesta fase) | **A1-D03** 2026-09-03 | Parcial (só calc. Driver) | Cadência = **A1-D04** |
| Driver líquido (display) | **PARCIAL** | UI mostra `driver_payout` / `commission_amount`; sem portagens/gorjetas/promo na fórmula | `DriverDashboard` · Q10 | Parcial | Fórmula completa = A1-D08 / E1 |
| Fees Stripe (valor) | **PARCIAL** | Exemplos docs (~1,5%+0,25 € / faixas audit) — **a validar**; **não** modelados no settlement | GTM · audit | Não | Valor = externo (validar pós-B1) |
| Quem absorve Stripe fee | **FECHADO** | Piloto: **plataforma absorve**; Pax paga só `final_price`; sem surcharge; **não** descontar a Driver nem a Partner; fee = custo da margem plataforma (**A1-D09**) | **A1-D09** 2026-09-03 | Não (custo ops) | Rever se 15% insuficiente após B1 |
| IVA / recibos / emissor | **DEPENDENTE EXTERNO** | A3-D08: após A1/A2 + contabilista; não escolher emissor agora | `A3_REQUISITOS` · A3-D08 | Não | Contabilista (fora A1-D económicos) |
| Settlement Pax (cobrança) | **PARCIAL** | Auth no accept (placeholder baixo) → update+capture no complete; mock → `succeeded`; live → webhook | `trips.py` · O-STRIPE-1 | Sim (mock); live = B1 | B1 go-live (não A1) |
| Connect / split automático | **FECHADO** *(requisito piloto)* | **Não** é requisito do piloto; manter D03/D04 manual semanal; B3 **fora** do crítico M2 nesta fase; Connect só depois se operação o exigir | **A1-D05** 2026-09-03 | Não | Pós-piloto / condicional |
| Payouts automáticos | **FECHADO** *(requisito piloto)* | **Não** são requisito do piloto; manter D03–D05; **B4 fora** do crítico M2 nesta fase; só depois se automatizar liquidação ao Partner | **A1-D06** 2026-09-03 | Não | Pós-piloto / condicional |
| Liquidação manual no piloto | **FECHADO** *(cadência)* | **Semanal** ao Partner; só `completed`; líquido = Σ`final_price` − 15%; `driver_payout` só referência; dia da semana **não** fixado; manual até B3/B4 | **A1-D04** 2026-09-03 | Processo humano | Relatório mínimo §6a |
| Custos fixos/variáveis | **PARCIAL** *(A1.2 EM CURSO)* | `MANEL_COSTS…` = **só estimativas de planeamento** (**A1-D10**); **não** orçamento; **não** baseline 1–2,5 k€/mês sem validação rubrica a rubrica. Método A1.2: separar **fixos mensais** vs **variáveis** (usage/tx). Fora do modelo técnico inicial: salários, marketing, contabilista, legal, seguros, suporte humano, aquisição drivers. | **A1-D10** · `MANEL_COSTS…` | Não | Rubricas + facturas reais |
| Margem plataforma | **PARCIAL** | Exemplos ilustrativos (~0,80–1,20 €/viagem @15%); sem motor de margem | Manel pricing · GTM | Não | Após A1.2–A1.3 |
| Arredondamento | **FECHADO** *(código)* | Fare `round(2)`; money `Decimal` **ROUND_HALF_UP** 0,01; Stripe cents `round(price×100)` min 50 | `pricing.py` · `payments.py` · `trips.py` | Sim | Não |
| Cancelamento — fee | **FECHADO** *(regra comercial)* | Fee = **3,00 € fixos** (**A1-D08**). Legado código `max(1,50, 20%×estimativa)` deixa de ser baseline. Piloto pré-B1: **registar** fee, **não cobrar**. Cobrança real quando B1 operacional. | **A1-D08** 2026-09-03 | Parcial (ainda fórmula legada no código) | Alinhar código + captura pós-B1 |
| Preço mínimo / categorias | **FECHADO** *(decisão comercial)* | Piloto = grelha Manel **Go / Comfort / XL** (com mínimos); defaults código **deixam de ser** baseline comercial | **A1-D07** · `MANEL_PRICING…` § categorias | Não (ainda 1 tarifa s/ mínimo) | Código a alinhar |
| Simulador económico 36m | **ABERTO** | Brief existe; **simulador não construído** | GTM | Não | Ferramenta após validação números |
| Mock/demo vs real | **FECHADO** *(política actual)* | Piloto: `STRIPE_MOCK=true` típico; payouts reais **não**; comissão calculada na mesma | ENV_SINGLE_REALITY · demo docs | Sim (mock) | Go-live = B1 |
| Pacote 3 docs business no repo | **FECHADO** | Os 3 ficheiros `MANEL_*` existem e estão referenciados no roadmap | Roadmap A1 · `docs/business/` | N/A (docs) | Não (A1.1) |

### Contagens (matriz)

| Classificação | Nº *(após A1-D01/D02)* |
|---------------|------------------------|
| **FECHADO** | **15** |
| **PARCIAL** | **5** *(incl. A1.2 custos)* |
| **ABERTO** | **1** (simulador 36m) |
| **DEPENDENTE EXTERNO** | **1** (IVA/recibos) |

---

## 3. Factos vs decisões (síntese)

### Facto actual (código / política técnica)

- Fare runtime ainda: **1,50 + 0,60/km + 0,15/min** (legado até alinhamento A1-D07).  
- **Baseline comercial piloto (A1-D07):** grelha Manel Go/Comfort/XL — **código ainda não alinhado**.
- Comissão por motorista na BD; criação Admin/seed usa **15%**.
- Split: plataforma `commission_amount`, motorista `driver_payout` sobre **final_price**.
- Híbrido estimativa/final **implementado** e **decidido** (`PRICING_DECISION`).
- Cancel fee: runtime ainda legado simulado; **baseline comercial = 3,00 € fixos (A1-D08)** — código a alinhar; cobrança real só pós-B1.
- Stripe Connect / payouts / share Partner: **ausentes**.
- Mock ON = política piloto documentada.

### Decisão já tomada

- Modelo **C — Híbrido** (estimativa ≠ preço final).  
- `ENABLE_CONFIRM_ON_ACCEPT` **OFF** neste modelo.  
- Piloto **pode** usar liquidação manual em vez de B3/B4 automáticos *(opção roadmap; não é ainda acta “é assim no nosso piloto”)*.  
- A3-D08: IVA/recibos **depois** A1/A2 + contabilista.  
- **A1-D01:** comissão piloto = **15%** (acordado Manel); 12%/12,5% só futuro condicionado.  
- **A1-D02:** base = **preço final bruto**; fees Stripe fora da base.  
- **A1-D03:** beneficiário liquidação piloto = **Partner/Frota**; plataforma liquida ao Partner; `driver_payout` = referência (sem payout directo ao Driver nesta fase); Partner gere relação financeira com Drivers.  
- **A1-D04:** liquidação **semanal** manual ao Partner; só viagens `completed`; líquido = Σ`final_price` − 15%; relatório mínimo (ver acta); dia da semana **não** fixado.  
- **A1-D05:** Connect/split **não** é requisito do piloto; B3 fora do crítico M2 nesta fase; D03/D04 mantêm-se.  
- **A1-D06:** payouts automáticos **não** são requisito do piloto; B4 fora do crítico M2 nesta fase.  
- **A1-D07:** piloto usa **grelha comercial Manel** (Go/Comfort/XL); defaults código deixam de ser baseline; híbrido estimativa→final **mantém-se**; implementação técnica pendente (aguarda mapeamento categorias Manel).  
- **A1-D08:** fee cancelamento = **3,00 € fixos**; legado 20%/1,50 deixa de ser baseline; piloto pré-B1 = registar sem cobrar; captura real quando B1 operacional.  
- **A1-D09:** piloto — **plataforma absorve** fee Stripe; Pax só `final_price`; sem surcharge; sem desconto a Driver/Partner; fee = custo operacional da margem; rever se 15% insuficiente após B1 live.  
- **A1-D10:** valores `MANEL_COSTS…` = **estimativas de planeamento** apenas; **não** orçamento aprovado; **não** usar 1–2,5 k€/mês como baseline oficial sem validação rubrica a rubrica. Método A1.2 = fixos vs variáveis (ver §6c).

### Ainda em aberto (económico)

- Preencher / confirmar rubricas A1.2 (valores reais) · depois A1.3 (margem/GTM) · acta A1.4.

---

## 4. Respostas às verificações pedidas

| Pergunta | Achado |
|----------|--------|
| Comissão nominal actual | **Piloto = 15%** (**A1-D01**). Runtime: `driver.commission_percent` (seed tipicamente 15). |
| 15% / 12% / outro | **15%** = baseline piloto. **12% / 12,5%** = possibilidades **futuras** apenas (rentabilidade elevada e/ou acordos específicos) — **não** baseline. |
| Base da comissão | **Bruto** `final_price` (**A1-D02**); fees Stripe não alteram a base. |
| Quem suporta Stripe fee | **Plataforma** no piloto (**A1-D09**); valor exacto da fee ainda a validar. |
| Driver recebe líquido calculado? | **Sim** no modelo de dados/UI (`driver_payout`); **não** há transferência automática. |
| Partner tem share próprio? | **Beneficiário piloto = Partner/Frota** (**A1-D03**); sem split automático no código. |
| Plataforma recebe e liquida? | Cobrança Pax na plataforma; liquidação piloto ao **Partner** (A1-D03); `driver_payout` só referência. |
| Settlement manual aceite no piloto? | **Sim** — semanal ao Partner (**A1-D04**); dia da semana TBD. |
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
| Cancel fee | Código legado 20%/min 1,50 | **A1-D08 = 3,00 € fixos** | Baseline comercial DONE; código a alinhar; cobrança pós-B1 |
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
| **A1-D04** | Cadência = **semanal** ao Partner/Frota. Só viagens `completed`. Líquido a liquidar = Σ`final_price` − comissão plataforma **15%**. `driver_payout` só referência no relatório; **sem** payout directo ao Driver. Processo **manual** enquanto B3/B4 não existirem. **Dia da semana não fixado** (só cadência semanal). Relatório mínimo: viagens concluídas · `final_price` · `commission_amount` · líquido Partner · `driver_payout` quando útil à reconciliação interna. | **DONE** 2026-09-03 |
| **A1-D05** | Stripe Connect / split automático **não** é requisito do piloto. Manter A1-D03/D04 (Partner · manual · semanal). **B3 fora** do caminho crítico do Marco 2 nesta fase. Connect só mais tarde se a operação real o exigir, houver vantagem operacional clara, ou for necessário automatizar split/liquidação. | **DONE** 2026-09-03 |
| **A1-D06** | Payouts automáticos **não** são requisito do piloto. Manter D03–D05 (Partner · manual · semanal · sem Connect). **B4 fora** do caminho crítico do Marco 2 nesta fase. Payouts automáticos só mais tarde se a operação exigir automatização da liquidação ao Partner. | **DONE** 2026-09-03 |
| **A1-D07** | Piloto usa a **grelha comercial Manel** (Go / Comfort / XL + mínimos). Defaults actuais do código **deixam de ser** a baseline comercial. Princípio: alinhar no produto o quanto antes as decisões essenciais; não manter defaults antigos só para evitar trabalho técnico. Modelo híbrido estimativa → preço final (**PRICING_DECISION**) **mantém-se**. Implementação de código = tarefa seguinte (fora desta acta); mapeamento categorias Manel↔código pendente de resposta Manel. | **DONE** 2026-09-03 |
| **A1-D08** | Fee de cancelamento = **3,00 € fixos**. Deixa de ser baseline comercial `max(1,50 €, 20% × estimativa)`. Regra comercial fixa e previsível. **Piloto pré-B1:** calcular e registar a fee; **não** cobrar efectivamente ao passageiro; **não** activar captura real só por esta decisão. Quando B1 estiver operacional, a cobrança real pode ser activada no fluxo adequado. | **DONE** 2026-09-03 |
| **A1-D09** | No piloto, a **plataforma absorve** a fee Stripe. Passageiro paga apenas `final_price` (sem surcharge/linha extra). **Não** descontar a fee ao Driver nem ao Partner. Fee de processamento = custo da margem da plataforma. Mantém-se comissão **15%** sobre bruto; fees Stripe tratadas separadamente como custo operacional. Se a margem a 15% se revelar insuficiente após B1 live, esta decisão pode ser revista. | **DONE** 2026-09-03 |
| **A1-D10** | Valores em `MANEL_COSTS…` são **apenas estimativas de planeamento**. **Não** constituem orçamento aprovado. **Não** usar 1–2,5 k€/mês como baseline oficial sem validação **rubrica a rubrica**. Método A1.2 aprovado: separar custos **fixos mensais** vs **variáveis**; fora do modelo técnico inicial: salários, marketing, contabilista, legal, seguros, suporte humano, aquisição de drivers (P&L completo depois). Stripe (D09) = custo variável da plataforma; valor exacto depende de B1/live. | **DONE** 2026-09-03 |

*Nota código:* D01–D10 = actas económicas/comerciais — **sem** alteração de código/Stripe/pricing nestas actas.

### 6b. Decisões A1-D — lista fechada

Nenhuma A1-D pendente. Trabalho restante = **A1.2** (preencher valores) · **A1.3** · **A1.4**.

**Fora de A1-D:** IVA/emissor recibos (`DEPENDENTE CONTABILISTA` · A3-D08); questões jurídicas; mobile; branding; activação técnica Stripe live (B1).

### 6c. A1.2 — Modelo de custos técnicos (**EM CURSO** · dados parcialmente confirmados · 2026-09-03)

**Objectivo:** modelo de custos técnicos com rubricas confirmáveis — **não** inventar preços.  
**Regra de preenchimento:** só valores reais (facturação/config). Sem valor real → `A CONFIRMAR`.  
**Fora do modelo técnico inicial:** salários · marketing · contabilista · legal · seguros · suporte humano · aquisição de drivers (P&L completo depois).

#### Custos confirmados — Render (Agosto 2026, factura real)

| Rubrica | Tipo | Valor actual | Estado |
|---------|------|-------------:|--------|
| `tvde-api` (Web Service prod) | Fixo | **$7,00/mês** | ✅ Confirmado |
| `tvde-db` (PostgreSQL prod) | Fixo | **$6,30/mês** | ✅ Confirmado |
| `tvde-app` (Static Site prod) | Fixo | **$0,00/mês** | ✅ Confirmado |
| `tvde-staging-api` | Fixo | **$7,00/mês** | ✅ Confirmado |
| `tvde-staging-db` | Fixo | **$10,50/mês** | ✅ Confirmado (staging > prod — optimização posterior) |
| `tvde-staging-app` | Fixo | **$0,00/mês** | ✅ Confirmado |
| **Total produção** | Fixo | **$13,30/mês** | ✅ |
| **Total staging** | Fixo | **$17,50/mês** | ✅ |
| **Total Render actual** | Fixo | **$30,80/mês** | ✅ |

*Nota: staging actualmente mais caro que produção — registar como ponto de optimização; não alterar Render agora.*

#### Custos confirmados — outros

| Rubrica | Tipo | Valor actual | Estado |
|---------|------|-------------:|--------|
| MapTiler (tiles + geocoding) | Variável potencial | **$0,00/mês** (plano Free; utilização baixa) | ✅ Confirmado — custo futuro só se upgrade/overage |
| Stripe / PSP (prod) | Variável | **€0,00 actual** (teste/restricted; `STRIPE_MOCK=true`) | ✅ Confirmado actual — fee futura: **1,5% + €0,25/tx** (EEE baseline; UK 2,5% + €0,25); absorvida plataforma (**A1-D09**); validar em B1 live |
| SMS / OTP | Variável | **€0,00 actual** (fornecedor não escolhido) | ⏳ A CONFIRMAR — custo futuro pendente escolha fornecedor |

#### Custos ainda A CONFIRMAR

| Rubrica | Tipo | Notas |
|---------|------|-------|
| Monitorização / uptime externo | Fixo/Opt | Além dos logs Render; só se SLA exigir |
| E-mail transaccional | Variável | Fornecedor e custo não definidos |
| Push notifications | Variável | Não implementadas em prod |
| Apple / Google stores | Fixo | Mobile fora do crítico actual |
| Backups extra / retenção alargada | Fixo/Opt | Render free tier = 7 dias; custo plano superior A CONFIRMAR |

#### Sumário A1.2

| Categoria | Total confirmado | Notas |
|-----------|-----------------|-------|
| Fixos mensais confirmados (prod) | **~$13,30/mês** | Render prod |
| Fixos mensais confirmados (staging) | **~$17,50/mês** | Render staging |
| Variáveis actuais confirmadas | **$0** | MapTiler + Stripe (pré-live) |
| Variáveis futuras conhecidas | Stripe **1,5% + €0,25/tx** (EEE) | Pós-B1 live; absorvido plataforma |
| A CONFIRMAR | SMS · e-mail · push · stores · monitorização | Ver tabela acima |
---

## 7. Próximo passo

1. **A1.2 EM CURSO:** confirmar valores reais por rubrica (dashboard Render / MapTiler / Stripe pricing live).  
2. A1.3 (margem/GTM) após rubricas mínimas confirmadas.  
3. Acta A1.4.  
4. Código (tarefas separadas): grelha Manel (D07, após categorias Manel) · fee 3,00 € (D08, sem captura até B1).

---

**Frase:** A1-D01…D10 DONE; A1.2 **EM CURSO** (fixo vs variável; sem baseline 1–2,5 k€); A1 global **PARCIAL** até fechar valores + A1.3–A1.4.
