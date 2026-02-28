# Validação Humana em Campo — TVDE

**Objetivo:** Testar fricção cognitiva, não código. O sistema técnico está sólido. Agora validamos se o cérebro humano colabora com ele.

---

## Princípio

> UX não é estética. É redução de incerteza.

Não perguntes "está bom?". Pergunta: **"Em algum momento ficaste inseguro sobre o que estava a acontecer?"**

As pessoas não sabem explicar UX, mas sabem descrever insegurança.

---

## Preparação — Deploy no Render

A app corre em produção no Render. Segue o guia **PREPARACAO_RENDER.md** para:

1. Criar PostgreSQL
2. Deploy do backend (tvde-api)
3. Configurar Stripe webhook
4. Deploy do frontend (tvde-app)
5. Executar Seed

Quando terminares, tens:
- **URL da app:** `https://tvde-app.onrender.com` (ou o teu)
- **URL do backend:** `https://tvde-api.onrender.com`
- Tudo acessível por qualquer dispositivo com internet

---

## Requisitos para o Teste

- **Dois dispositivos reais** (telemóveis)
- **Um passageiro, um motorista**
- **Rede móvel** — dados móveis, não Wi‑Fi perfeito
- **Sem consola, sem atalhos** — a app deve parecer produção
- **Painel Dev colapsado** — os testadores não devem ver Seed, Assign, etc. (ou esconde-o antes do teste)

---

## Checklist Antes de Ir para Campo

- [ ] Render: backend, frontend e PostgreSQL a correr
- [ ] Stripe webhook configurado e ativo
- [ ] Seed executado (utilizadores de teste criados)
- [ ] Fluxo completo testado localmente no Render (passageiro + motorista)
- [ ] URLs guardados — partilha o link da app com os testadores
- [ ] Log de observação impresso ou em tablet

**Nota:** No Render Free Tier, o backend adormece após ~15 min sem tráfego. O primeiro request pode demorar 30–60 s. Avisa os testadores.

---

## FASE A — Teste Humano Ampliado

### Regras

- **Nada de auto-trip**
- **Nada de assign manual**
- **Só fluxo orgânico** — passageiro cria viagem, motorista aceita (ou espera auto-dispatch)

---

## Cenário 1 — Fluxo Limpo

**Sequência:**
1. Passageiro abre a app no telemóvel e cria viagem
2. Motorista abre a app no outro telemóvel e aceita (ou a viagem é auto-assigned)
3. Cheguei → Iniciar viagem → Concluir viagem
4. Stripe webhook ativo (payment atualiza)

**Observa em silêncio:**

| Pergunta mental | Nota |
|-----------------|------|
| O passageiro percebe quando a viagem foi aceite? | |
| O motorista entende claramente qual é a ação seguinte? | |
| Existe hesitação entre estados? | |
| Há momentos de "e agora?" | |
| Alguém tenta clicar duas vezes? | |

**Se houver duplo clique:** não é erro do utilizador. É ausência de feedback visual suficiente. Humano não gosta de esperar sem confirmação.

---

## Cenário 2 — Fricção de Rede

Durante o fluxo:

- Desliga dados do motorista por 10 segundos
- Faz refresh no browser
- Alterna entre apps (ex. ver mensagens e voltar)

**Pergunta silenciosa:** O sistema mantém coerência psicológica? O utilizador sente controlo ou ansiedade?

---

## Cenário 3 — Stripe Imperfeito

**Objetivo:** Testar o que acontece quando o payment fica "processing" (webhook não recebeu).

**Como simular no Render:**
1. No [Stripe Dashboard](https://dashboard.stripe.com) → Webhooks, edita o endpoint
2. Remove temporariamente o URL (ou desativa o endpoint)
3. Completa a viagem na app
4. O payment fica "processing" no backend
5. Observa: o passageiro percebe? Ou assume que pagou e acabou?
6. Reativa o webhook no Stripe

Aqui estamos a testar **confiança**, não código.

---

## Log de Observação

Regista em 4 colunas:

| # | Confusão | Hesitação | Cliques repetidos | Dúvida verbal |
|---|----------|-----------|-------------------|---------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| … | | | | |

**Exemplos de registo:**
- "Passageiro olhou para o ecrã 3s antes de perceber que motorista aceitou"
- "Motorista clicou 2x em ACEITAR"
- "Entre Cheguei e Iniciar: 'O que faço agora?'"
- "Complete: passageiro não olhou para o preço final"

---

## Hipóteses de Trabalho (a validar)

*Teoria, não verdade absoluta. O teste pode confirmar ou refutar.*

1. **Momento do Accept** — emocionalmente crítico (passageiro à espera, motorista a decidir)
2. **Momento do Complete** — psicologicamente delicado (fim da viagem, preço definitivo)
3. **Preço antes do fim** — ausência de preço definitivo até ao complete pode gerar micro-tensão

---

## Após o Teste

**Não ajustes nada ainda.**

Volta com:
- Onde houve **fricção**
- Onde houve **dúvida**
- Onde houve **silêncio desconfortável**

É aqui que produto nasce.

> Sistema sólido é engenharia.  
> Sistema intuitivo é evolução.  
> A evolução acontece quando confrontamos teoria com comportamento humano real.

---

## Perguntas Pós-Teste (opcional)

Se fizeres entrevista breve após o fluxo:

1. "Em algum momento ficaste inseguro sobre o que estava a acontecer?"
2. "Houve algum momento em que não sabias o que fazer a seguir?"
3. "O preço fez sentido? Em que momento ficaste tranquilo com o valor?"

Evita: "Gostaste?", "Está bom?", "Funcionou?"

---

## Resumo — O que testamos

| Dimensão | O que observamos |
|----------|------------------|
| **Clareza de estado** | O utilizador sabe em que ponto está? |
| **Feedback visual** | Há confirmação suficiente após cada ação? |
| **Tempo de resposta percebido** | Espera gera ansiedade ou é aceitável? |
| **Confiança no preço** | O valor transmite segurança ou dúvida? |
