# Inputs Manel — TODOs produto (pagamentos + app Motorista) · 2026-08-07

**Tipo:** backlog de produto a partir de inputs externos  
**Estado:** **captura / organização** — **não** implementação · **não** compromisso técnico fechado  
**Tip `main` (docs):** `2fc5155` (actualizar após pull)  
**Handoff:** [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md) · painel [`TODOdoDIA.md`](../../TODOdoDIA.md)

Relacionado (já no repo, não substituído por este ficheiro):

- [`MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md`](MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md)
- [`DRIVER_HOME_TOP3_MANEL.md`](DRIVER_HOME_TOP3_MANEL.md) · [`DRIVER_MENU_SPEC.md`](DRIVER_MENU_SPEC.md)
- [`O_STRIPE_1_RUNBOOK.md`](../ops/O_STRIPE_1_RUNBOOK.md) · PF3D / docs frota (gates OFF)

---

## 1. Nota de origem

| | |
|--|--|
| **Fonte** | Inputs do **Manel Perez** / parceiro: (1) panorama plataformas de pagamento; (2) texto de arquitectura de pagamentos; (3) PDF *«Funcionalidades relativas a App Motorista»* |
| **Natureza** | Ideias, expectativas de mercado e requisitos **desejados** — **não** são specs fechadas nem decisões de implementação |
| **Validação necessária** | Produto · financeira · jurídica (quando tocar KYC, suspensão, dados, payouts, telefone temporário, documentos) |
| **Regras neste doc** | Exemplos de taxas/comissões = **a verificar** · não inventar decisões · não activar Stripe live / B2 / PF3D só porque estão listados |
| **Uso** | Priorizar conversas com Manel/Francisco · gerar specs curtas **só** quando um item for escolhido para build |

---

## 2. Pagamentos — plataformas (input)

| Plataforma / tema | Nota (input) | Prioridade sugerida | Estado no TVDE (contexto) |
|-------------------|--------------|---------------------|---------------------------|
| **Stripe Connect** | Opção **MVP provável** (marketplace, PaymentIntent, split, payouts) | **P1** | Mock / test local existem; **live bloqueado** (`O-STRIPE-LIVE`) |
| **SIBS / MB WAY / Multibanco** | Tema **Portugal** — relevância local forte | **P2** (obrigatoriedade = pergunta ao Manel) | Não tratado como MVP fechado neste doc |
| **Adyen** | Alternativa enterprise / escala | **P3** | Futuro |
| **Checkout.com** | Alternativa | **P3** | Futuro |
| **Mangopay** | Marketplace / wallets (avaliar vs Connect) | **P3** | Futuro |
| **PayPal** | Método / marca familiar | **P3** | Futuro |
| **Worldpay** | Escala / adquirente | **P3** | Futuro |
| **Viva.com** | Regional / PT-GR | **P3** | Futuro |

**Taxas / comissões:** quaisquer % citados nos materiais (ex. 15 / 12 / 20) ficam **a verificar** com Manel + modelo financeiro — **não** são verdade final neste doc.

---

## 3. Arquitectura de pagamentos (capacidades desejadas)

Cada linha = capacidade a discutir / especificar mais tarde. Prioridade = ordem de conversa, não compromisso de sprint.

| ID | Capacidade | P | Notas |
|----|------------|---|--------|
| **PAY-AUTH** | Payment Intent · autorização / captura diferida | P1 | Alinha com fluxo trip (auth cedo, capture no complete) — detalhe a fechar com Stripe Connect |
| **PAY-SPLIT** | Split comissão plataforma / montante motorista (ou partner) | P1 | % e beneficiário = **a verificar** |
| **PAY-KYC** | Onboarding / KYC contas pagáveis (motorista ou partner) | P1 | Jurídico + quem é merchant of record |
| **PAY-PAYOUT** | Payouts (cadência diária / semanal / manual) | P2 | Pergunta ao Manel |
| **PAY-CANCEL** | Cancelamentos e política de cobrança / no-show | P1 | Regras produto + copy |
| **PAY-REFUND** | Reembolsos (parciais / totais) | P2 | Ops + backoffice |
| **PAY-TIP** | Gorjetas | P2 | Pós-piloto típico |
| **PAY-PROMO** | Promoções / códigos | P2–P3 | Ver também EXTRA Manel maio (promo codes) |
| **PAY-WALLET** | Wallet / saldo | P3 | Escala |
| **PAY-FRAUD** | Fraude / risk scoring / 3DS | P2 | Depende do PSP |
| **PAY-INVOICE** | Facturação / recibos | P2 | Fiscal PT — validar |
| **PAY-BO** | Backoffice reconciliação / excepções | P1–P2 | Admin já tem ferramentas parciais (mock close, etc.) |

**Fora agora:** activar Stripe live · mudar Render envs · implementar Connect nesta sessão.

---

## 4. App Motorista — funcionalidades (PDF)

| ID | Item (input PDF) | P | Nota de contexto TVDE |
|----|------------------|---|------------------------|
| **DRV-NAV** | Escolha Waze / Google Maps · nav recolha e destino | P0 | Em grande parte já existe (Opção B manual) — **alinhar** com Manel / gaps |
| **DRV-GPS** | GPS próprio simples (mapa / fallback) | P1 | Clarificar: navegação completa vs mapa/posição (pergunta) |
| **DRV-MENU** | Menu: foto / nome / rating / cancelamentos | P0–P1 | Menu existe; fechar campos em falta vs PDF |
| **DRV-EARN** | Rendimentos | P1 | Superfície vs modelo payout |
| **DRV-HIST** | Historial + reportar ocorrência | P1 | Historial parcial; reporte = novo/clarificar |
| **DRV-CAMP** | Campanhas | P3 | Crescimento |
| **DRV-DOCS** | Documentos com datas / avisos / suspensão | P1–P2 | Cruza PF3D / Partner docs · **suspensão automática = legal** |
| **DRV-VEH** | Veículos do parceiro | P1 | Frota Partner já em evolução |
| **DRV-PRIV** | Privacidade | P1 | Textos + consentimentos |
| **DRV-SET** | Definições da app | P0–P1 | Preferências nav, etc. |
| **DRV-DEST2** | Destino 2 vezes/dia | P2 | Obrigatório no piloto? (pergunta) |
| **DRV-CAT** | Categorias X / XL / Pet / Comfort / Black / Elétrico / Van (ligáveis) | P1–P2 | Preferências motorista existem em parte — **lista MVP exacta = pergunta** |
| **DRV-INBOX** | Inbox / mensagens | P2 | |
| **DRV-PHONE** | Telefone temporário / mascarado | P2 | Legal/produto vs nice-to-have (pergunta) |
| **DRV-TRIP** | Informação completa da viagem + **preço líquido motorista** | P0 | Alto valor demo/piloto — clarificar fórmula |

---

## 5. Classificação P0 / P1 / P2 / P3 (resumo)

| Prioridade | Significado | Exemplos deste input |
|------------|-------------|----------------------|
| **P0** | Útil para **demo / piloto próximo** (Manel 2 / smoke) | Nav Waze/Maps alinhada · info viagem + líquido motorista · menu básico coerente |
| **P1** | **Pós-férias / pré-piloto** comercial | Stripe Connect path · split/KYC · rendimentos · docs avisos · veículos · historial/reporte · privacidade |
| **P2** | Maturidade operacional | MB WAY/SIBS · payouts cadência · reembolsos · gorjetas · fraude · facturação · inbox · destino 2×/dia · telefone temp · suspensão (se legal OK) |
| **P3** | Futuro / escala | Adyen/Mangopay/Checkout/… · wallet · campanhas avançadas · nav GPS própria completa |

**Não** abrir implementação em férias salvo polish FE/docs leve acordado. B2 / Stripe live / PF3D ON continuam **fora** até decisão explícita.

---

## 6. Perguntas ao Manel (fechar antes de spec/build)

| # | Pergunta |
|---|----------|
| Q1 | Comissão real da plataforma: há valor alvo (ex. 15% / 12% / 20%) ou é só exemplo? |
| Q2 | **MB WAY** (SIBS) é **obrigatório** no MVP Portugal ou pode ficar em fase 2? |
| Q3 | Cadência de **payouts**: diário / semanal / outro? Quem recebe (motorista vs partner)? |
| Q4 | **Documentos**: quem valida (Partner / Admin / automático)? |
| Q5 | **Suspensão automática** por documento caducado — pode ser aplicada legalmente neste modelo? |
| Q6 | **Categorias** exactas do MVP (subconjunto de X/XL/Pet/Comfort/Black/Elétrico/Van)? |
| Q7 | **Telefone temporário**: requisito legal/produto ou nice-to-have? |
| Q8 | **Destino 2×/dia**: obrigatório para o piloto? |
| Q9 | **GPS próprio**: navegação turn-by-turn completa ou só mapa / fallback de posição? |
| Q10 | **Preço líquido motorista**: o que entra/sai da fórmula (comissões, portagens, gorjetas)? |

---

## 7. Próximos passos sugeridos (sem código)

1. Revisar este ficheiro com Francisco + Manel (fechar Q1–Q10 prioritários).  
2. Escolher **1–2 itens P0** para Manel 2 se ainda houver gap vs guião actual.  
3. Pós-férias: spec curta só para o primeiro P1 escolhido (provável: Connect path **ou** líquido motorista + rendimentos).  
4. Manter [`MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md`](MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md) para itens EXTRA/legal já capturados.

---

**Frase:** Inputs do Manel capturados como backlog priorizado. Nada disto activa Stripe live, B2 ou PF3D. Taxas e obrigações = **a verificar**.
