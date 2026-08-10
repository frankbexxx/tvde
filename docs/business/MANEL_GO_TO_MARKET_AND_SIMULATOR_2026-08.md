# Go-to-market e simulador económico — hipóteses Manel/IA · 2026-08

**Tipo:** hipótese / estudo preliminar · **simulador ainda não construído**  
**Origem:** DOCX Manel/IA — [`sources/quais-os-custos-operacao-app-depois-construida.docx`](sources/quais-os-custos-operacao-app-depois-construida.docx)  
**Estado:** briefing para trabalho em **Setembro**  
**Biblioteca:** **BUSINESS-MANEL-001**

---

## Objectivo do simulador (Setembro)

Construir um modelo (folha / ferramenta) que responda, com cenários:

> Quanto precisamos para lançar e operar com margem positiva, sendo mais baratos para o passageiro e mais atractivos para o motorista — sem entrar em prejuízo na reação Uber/Bolt (horizonte 24–36 meses no fonte)?

**Não fazer agora:** implementar o simulador em código de produto · publicar campanha · fechar investimento.

---

## Variáveis a incluir

Do documento-fonte (lista a consolidar no modelo):

| Variável | Notas |
|----------|-------|
| Viagens / mês | Escala 1.000 → 500.000 (e pontos intermédios) |
| Ticket médio | Sensível: 8 € vs 20 € muda a economia unitária |
| Comissão | Grelha 10–20% (+ variável por volume) |
| Custo Stripe / SIBS / Adyen | Ex.: fonte cita Stripe PT 1,5% + 0,25 € (cartões EEE / MB WAY listados) — **a validar** |
| IVA | Fiscalidade PT |
| Promoções / bónus motoristas | Custo variável |
| Suporte | €/viagem ou fixo |
| Tecnologia | Alinhar a [`MANEL_COSTS_OPERATION_MODEL_2026-08.md`](MANEL_COSTS_OPERATION_MODEL_2026-08.md) |
| Marketing / aquisição | Fora do modelo tech puro |
| Salários | Custos corporativos |
| Seguros | Ops |
| Margem por viagem | Métrica central |
| Ponto de equilíbrio | Viagens/mês e investimento |
| Churn / EBITDA / necessidade de investimento | Horizonte 36 meses no fonte |

---

## Cenários

| Cenário | Uso |
|---------|-----|
| **Conservador** | Procura lenta, ticket baixo, comissão prudente |
| **Base** | Hipótese de trabalho (ex. ~15% comissão, ticket ~12–15 €) |
| **Agressivo** | Volume alto, preço agressivo, risco de margem |

---

## Exemplos já no fonte (ilustrativos — não previsão)

### Por viagem (~10 € passageiro Vamo Lá a 9,50 €)

| | Uber/Bolt* | Vamo Lá* |
|--|------------|----------|
| Preço passageiro | 10,00 € | 9,50 € |
| Comissão | 25% | 15% |
| Plataforma | 2,50 € | ~1,43 € |
| Motorista | 7,50 € | ~8,08 € |

\*Ilustrativo no fonte.

### 1.000 viagens/mês · ticket médio 12 € · volume 12.000 €

| | @25% | Vamo Lá @15% |
|--|------|--------------|
| Plataforma | 3.000 € | 1.800 € |
| Motoristas | 9.000 € | 10.200 € |

Trade-off explícito: plataforma abdica de receita bruta para pagar melhor ao motorista → **conseguimos operar a 15%?**

### Economia unitária hipotética (ticket 12 € · comissão 15%)

Receita plataforma **1,80 €/viagem**, depois descontos ilustrativos no fonte (pagamento ~0,43 · fraude ~0,05 · suporte ~0,15 · tech ~0,10 · promoções ~0,20) → resultado aproximado **~0,87 €/viagem** (hipótese, não previsão).

Tabela de volumes no fonte (ticket 12 € · 15% · após ~0,93 €/viagem de custos hipotéticos): 1k / 5k / 10k / 25k / 50k / 100k viagens — ver DOCX para linhas completas.

---

## Foco inicial de mercado sugerido

| Prioridade | Segmento | Ticket típico (fonte) |
|------------|----------|------------------------|
| 1 | **Aeroporto** | 25–40 € |
| 2 | **Empresas** | 15–30 € |
| 3 | **Interurbanas** | 25–60 € |
| 4 | **Passageiro frequente** | 10–20 € |

**Evitar depender cedo** de viagens muito curtas **4–6 €** — a taxa fixa do pagamento pesa muito na margem.

---

## Sweet spot proposto no fonte (a testar)

| Actor | Hipótese |
|-------|----------|
| Motorista | 15% inicial; pode baixar a 12% com volume |
| Passageiro | ~5% abaixo Uber/Bolt quando possível |
| Empresas | 10–12% |
| Aeroporto | 12–15% |
| Gorjetas / portagens | 0% comissão |
| Cancelamento | 3–5 € conforme situação |

Detalhe tarifário: [`MANEL_PRICING_COMMISSION_MODEL_2026-08.md`](MANEL_PRICING_COMMISSION_MODEL_2026-08.md).

---

## Campanha (rascunho — **não publicar**)

Texto do EXTRA no DOCX — só arquivo de intenção criativa:

> És motorista TVDE?  
> Queres ficar com mais dinheiro por cada viagem? ✅  
> Queres pagar apenas 15% de comissão? ✅  
> Queres trabalhar com uma plataforma feita em Portugal? ✅  
> Queres que os impostos da plataforma sejam pagos em Portugal? ✅  
> Queres fazer parte de uma plataforma que valoriza o teu trabalho? ✅  
> 🇵🇹 Então, VAMO LÁ!  
> VAMULA — mais para quem conduz.

**Não fazer agora:** publicar · prometer 15% fixo · usar como compromisso comercial.

---

## Próximos passos Setembro

1. Folha de simulador 36 meses (Conservador / Base / Agressivo).  
2. Substituir custos hipotéticos €/viagem por custos reais (PSP, cloud, suporte).  
3. Validar com Manel + Francisco + contabilista/financeiro.  
4. Só depois: decisões de tarifário / campanha.
