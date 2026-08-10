# Custos de operação da app (após construção) — hipóteses Manel/IA · 2026-08

**Tipo:** hipótese / estudo preliminar (não orçamento aprovado)  
**Origem:** DOCX Manel/IA compilado pelo Francisco — [`sources/quais-os-custos-operacao-app-depois-construida.docx`](sources/quais-os-custos-operacao-app-depois-construida.docx)  
**Estado:** números **não** validados · para discussão e simulador em **Setembro**  
**Biblioteca:** [`SETEMBRO_2026_TODO_LIBRARY.md`](../product/SETEMBRO_2026_TODO_LIBRARY.md) · item **BUSINESS-MANEL-001**

---

## Nota de propósito

- Isto **não** é decisão final nem orçamento contratual.
- Distinguir custo de **desenvolvimento** (já feito / a fazer) de custo de **operação** depois da app construída.
- Os valores abaixo são **hipóteses** do documento-fonte para validação com financeiro/PSP/cloud.

**Não inclui** (explicitamente no fonte): marketing, salários, contabilista, apoio ao cliente, seguros, despesas legais, aquisição de motoristas, etc.

---

## Custos mensais por rubrica (tecnologia)

Valores do DOCX — intervalos aproximados.

| Rubrica | Fase inicial (~até 1.000 utilizadores) | Quando começar a crescer |
|---------|----------------------------------------|---------------------------|
| Servidores / cloud / base de dados | 100–300 € | 300–1.500 €+ |
| Mapas e geolocalização | 50–300 € | 300–2.000 €+ |
| SMS, notificações, e-mail | 20–100 € | 100–500 €+ |
| Sistema de pagamentos | variável por transação | variável |
| Monitorização, backups e segurança | 30–100 € | 100–300 € |
| Manutenção técnica | 500–1.500 € | 1.000–3.000 €+ |
| Apple / Google | baixo custo fixo | baixo custo fixo |
| **Total aproximado (tabela)** | **700–2.500 €/mês** | **2.000–7.000 €/mês+** |

Referência no fonte: manutenção de apps frequentemente estimada em **15–25% do custo de desenvolvimento por ano**; apps de mobilidade podem ultrapassar isso (mapas, GPS tempo real, pagamentos, backend).

---

## Três níveis operacionais (tecnologia + manutenção)

| Fase | Escala | Hipótese mensal (tech + manutenção) |
|------|--------|-------------------------------------|
| Arranque | 0–~1.000 utilizadores | ~**1.000–2.500 €/mês** |
| Crescimento | ~1.000–10.000 utilizadores | ~**2.500–6.000 €/mês** |
| Escala / bastante movimento | elevado número de viagens | pode passar **6.000–10.000 €/mês+** (depende de viagens, GPS, APIs mapas, pagamentos) |

Recomendação do fonte para startup: **não** montar estrutura de 5.000–10.000 €/mês no dia 1; preferir começar ~**1.000–1.500 €/mês** e escalar com utilizadores.

---

## O que os custos técnicos não cobrem

Mesmo com backend/mapas/pagamentos sob controlo, o documento insiste: **os custos técnicos podem não ser o maior custo da operação** quando existem passageiros, motoristas, GPS, rotas, pedidos, pagamentos, notificações, avaliações, suporte e painel admin — além de marketing, pessoas, legal, seguros, etc. (fora deste modelo).

---

## Validação em Setembro (sem implementar agora)

- Confrontar intervalos com facturas reais (cloud, mapas, SMS, Apple/Google).
- Separar custo **fixo** vs **variável por viagem** (pagamentos).
- Alimentar o simulador ([`MANEL_GO_TO_MARKET_AND_SIMULATOR_2026-08.md`](MANEL_GO_TO_MARKET_AND_SIMULATOR_2026-08.md)).

**Não fazer agora:** fechar budget · contratar infra “máxima” · tratar estes € como garantidos.
