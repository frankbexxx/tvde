# Modelo de preços e comissões — hipóteses Manel/IA · 2026-08

**Tipo:** hipótese / estudo preliminar (**não** tarifário aprovado)  
**Origem:** DOCX Manel/IA — [`sources/quais-os-custos-operacao-app-depois-construida.docx`](sources/quais-os-custos-operacao-app-depois-construida.docx)  
**Estado:** para modelação económica em **Setembro** · precisa validação com preços reais, fiscalidade, contabilidade e margem operacional  
**Biblioteca:** **BUSINESS-MANEL-001**

---

## Nota clara

- **Não** é tarifário aprovado para lançamento.
- Comparações Uber/Bolt usam referências públicas citadas no fonte; preços reais variam (dinâmica, cidade, hora, categoria).
- Simulações de rendimento do motorista **não** são garantias.

---

## Comissão

### Base sugerida

- **15%** de comissão base (cenário preferido no fonte para arranque).

Exemplo do fonte (comissão fixa 15%):

| Viagem (passageiro) | Motorista | Plataforma |
|---------------------|-----------|------------|
| 5 € | 4,25 € | 0,75 € |
| 8 € | 6,80 € | 1,20 € |
| 10 € | 8,50 € | 1,50 € |
| 15 € | 12,75 € | 2,25 € |
| 20 € | 17,00 € | 3,00 € |
| 30 € | 25,50 € | 4,50 € |
| 50 € | 42,50 € | 7,50 € |

Mensagem do fonte: numa viagem de 20 €, motorista fica com **17 €** vs **15 €** se a comissão fosse 25%.

### Comissão variável por volume (hipótese)

| Volume mensal (viagens) | Comissão |
|-------------------------|----------|
| 0–100 | **18%** |
| 101–250 | **16%** |
| 251–400 | **14%** |
| 401+ | **12%** |

Intenção: retenção (“quanto mais trabalho, menos comissão”) sem oferecer 12% a todos no dia 1.

Exemplo do fonte: 300 viagens × ticket 15 € → volume 4.500 € → comissão 14% = 630 € → motorista 3.870 €; vs 25% (1.125 € comissão / 3.375 € motorista) → diferença ilustrativa **+495 €/mês** (simulação, não garantia).

### Comparação conceptual com ~25%

- Fonte cita Bolt **25%** em Portugal e Uber taxa de serviço que **pode chegar a 25%**.
- Objectivo hipotético: passageiro um pouco mais barato **e** motorista a receber mais — à custa de menor receita bruta da plataforma (trade-off a validar no simulador).

### Comissões especiais (hipótese)

| Segmento | Comissão sugerida no fonte |
|----------|----------------------------|
| Viagem normal | 15% |
| Aeroporto | 12% (noutra passagem: 12–15%) |
| Empresas | 10–12% |
| Gorjetas | **0%** |
| Portagens | **0%** |

Cancelamentos (hipótese): **3–5 €**, conforme tempo/distância.

---

## Preço ao passageiro

- Alvo: aproximadamente **5–10% abaixo** de Uber/Bolt **quando a economia da viagem permitir** (não 15–20% permanentes — considerado perigoso no fonte).

Exemplos meramente ilustrativos no fonte:

| Tipo | Uber/Bolt* | Vamo Lá* |
|------|------------|----------|
| Curta | 7,00 € | 6,50 € |
| Média | 12,00 € | 11,00 € |
| Longa | 20,00 € | 18,50 € |
| Aeroporto | 30,00 € | 27,50 € |
| Aeroporto longa | 45,00 € | 41,00 € |

\*Ilustrativos; preço real varia.

Ideia adicional: **preço garantido** (ex. Lisboa → Aeroporto com valor fixo mostrado) como vantagem vs dinâmica inesperada.

---

## Categorias propostas (primeira versão a testar)

Valores = proposta inicial de modelação no fonte — **não** lançar sem confronto com preços reais por zona/hora.

### Vamo Lá Go

| Campo | Valor |
|-------|-------|
| Base | 1,50 € |
| €/km | 0,60 € |
| €/min | 0,12 € |
| Mínimo | **4,50 €** |

### Vamo Lá Comfort

| Campo | Valor |
|-------|-------|
| Base | 2,00 € |
| €/km | 0,75 € |
| €/min | 0,15 € |
| Mínimo | **6,00 €** |

### Vamo Lá XL

| Campo | Valor |
|-------|-------|
| Base | 2,50 € |
| €/km | 0,90 € |
| €/min | 0,18 € |
| Mínimo | **8,00 €** |

**Mínimos:** o fonte insiste que viagens muito curtas (ex. 2 km / 8 min) não podem cair para ~2,50 € e continuar economicamente interessantes.

---

## Tarifa dinâmica limitada (hipótese)

| Estado | Multiplicador |
|--------|---------------|
| Normal | **1,00×** |
| Procura elevada | **1,15×** |
| Procura muito elevada | **1,30×** |
| Evento excecional | **1,50×** (máximo no fonte) |

Mostrar claramente ao cliente o estado e o preço (confiança).

---

## Aeroporto, empresas, gorjetas, portagens, cancelamentos

| Tema | Hipótese no fonte |
|------|-------------------|
| Aeroporto | Comissão reduzida; foco inicial (ticket alto) |
| Empresas (Corporate) | 10–12%; ou preço + 8%; ou mensalidade + comissão reduzida; faturação/relatórios/centros de custo |
| Gorjetas | 0% comissão |
| Portagens | 0% comissão |
| Cancelamentos | 3–5 € conforme situação |

---

## Métrica obsessiva sugerida

Não só a % de comissão — **margem líquida por viagem** (receita plataforma − pagamento − fraude − suporte − promoções − tecnologia − impostos/ops aplicáveis).  
Exemplo hipotético no fonte: viagem 15 € → 15% = 2,25 € → após custos unitários ilustrativos sobram **~0,80–1,20 €** líquidos/viagem (hipótese de modelação).

---

## Validação em Setembro

- Confrontar com preços reais Uber/Bolt por zona/hora.
- Validar com contabilista / IVA / PSP.
- Não publicar campanha nem prometer rendimentos com base nestes números.

Ver também: [`MANEL_GO_TO_MARKET_AND_SIMULATOR_2026-08.md`](MANEL_GO_TO_MARKET_AND_SIMULATOR_2026-08.md).
