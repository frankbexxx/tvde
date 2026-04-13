# Projeto: Plataforma de Ride-Sharing (Concorrente Uber/Bolt)

## 1. Visão Geral

Este projeto visa construir uma plataforma completa de ride‑sharing para o mercado português, concorrente direta de Uber e Bolt, disponível em **iOS, Android e Web** . O foco é um **MVP operacional em 3 meses** , tecnicamente sólido, legalmente conforme e preparado para escalar.

- **Mercado inicial:** Portugal
- **Marca:** Própria
- **Modelo de negócio:** Comissão por contrato (15% inicial, 12,5% após período experimental)
- **Equipa:** 1 developer (Francisco) + IA (Cursor)

O objetivo do MVP não é copiar todas as funcionalidades da Uber, mas implementar **o ciclo completo de uma viagem paga** , de forma fiável.

---

## 2. Produtos / Aplicações

### 2.1 App Passageiro (iOS / Android / Web)

- Registo e login (telefone + OTP, email opcional)
- Mapa com localização atual
- Pedido de viagem (origem + destino)
- Estimativa de preço e ETA
- Acompanhamento da viagem em tempo real
- Pagamento digital
- Avaliação do motorista
- Histórico de viagens

### 2.2 App Motorista (iOS / Android)

- Registo e onboarding (documentos)
- Aprovação manual pelo Admin
- Online / Offline
- Receber, aceitar ou rejeitar pedidos
- Navegação até passageiro e destino
- Visualização de ganhos
- Histórico de viagens

### 2.3 Dashboard Admin (Web)

- Gestão de utilizadores (passageiros e motoristas)
- Aprovação de motoristas
- Visualização de viagens em tempo real
- Gestão de comissões por contrato
- Relatórios financeiros
- Resolução de conflitos

---

## 3. O que é o MVP (escopo fechado)

O MVP inclui **apenas** o necessário para operar e faturar:

- Pedido e atribuição de viagens
- Tracking em tempo real
- Pagamentos com split automático
- Comissão configurável
- Histórico mínimo
- Avaliações simples

Funcionalidades como promoções, surge pricing, múltiplos destinos, carteiras, frotas e parceiros ficam **fora do MVP** .

---

## 4. Stack Tecnológica (decisão final)

### Frontend

- **Mobile:** React Native + TypeScript
- **Web:** React (Vite ou Next.js)

### Backend

- **API:** Python + FastAPI
- **Base de dados:** PostgreSQL
- **Realtime:** WebSockets (FastAPI)

### Infraestrutura

- **Backend hosting:** Render ou Fly.io
- **DB hosting:** Render / Supabase (Postgres puro)
- **Auth:** JWT + OTP por SMS

### Integrações Externas

- **Mapas:** Google Maps ou Mapbox
- **Pagamentos:** Stripe + MB Way (Stripe Connect)
- **Notificações:** Firebase Cloud Messaging
- **SMS:** Twilio (OTP)

---

## 5. Modelo de Dados (simplificado)

### User

- id
- role (passenger | driver | admin)
- nome
- telefone
- estado

### Driver

- user_id
- estado (pending | approved | rejected)
- documentos
- percentagem_comissao

### Trip

- id
- passenger_id
- driver_id
- origem (lat, lng)
- destino (lat, lng)
- estado (requested | accepted | ongoing | completed | cancelled)
- preco_estimado
- preco_final

### Payment

- trip_id
- total
- comissao
- valor_motorista
- estado (pending | processing | succeeded | failed)
- stripe_payment_intent_id
- currency

---

## 6. Fluxo de uma Viagem (core do sistema)

1. Passageiro pede viagem
2. Backend calcula preço estimado
3. Pedido enviado a motoristas próximos
4. Motorista aceita → **PaymentIntent autorizado (Stripe) + Payment criado (status=processing)**
5. Viagem inicia
6. Viagem termina → **PaymentIntent capturado (Stripe)**
7. **Webhook Stripe confirma sucesso/falha → Payment.status atualizado**
8. Split automático (plataforma / motorista)
9. Avaliações

---

## 6.1. Modelo de Pagamento (MVP)

A plataforma utiliza **Stripe PaymentIntent com autorização manual** no momento da aceitação da viagem e **captura apenas após a conclusão**. Este modelo replica o funcionamento operacional de plataformas como Uber, garantindo proteção contra no-shows e disputas.

**Fluxo de Pagamento:**

1. **Accept Trip**: PaymentIntent criado com `capture_method="manual"` (autorização apenas)
2. **Complete Trip**: PaymentIntent capturado
3. **Webhook Stripe**: Única fonte de verdade para status final (`succeeded` ou `failed`)

**Segurança:**

- Payment e Trip são estados independentes
- Webhook obrigatório e validado por assinatura
- Não confiar no frontend para status de pagamento

---

## 7. Roadmap (3 meses)

### Mês 1 – Fundação

- Setup backend FastAPI
- Modelos de dados
- Auth e permissões
- Pedido de viagem (sem pagamento)

### Mês 2 – Core funcional

- Matching passageiro/motorista
- Tracking em tempo real
- App motorista funcional
- Pagamentos Stripe + split

### Mês 3 – Estabilização

- Dashboard admin
- Logs e auditoria
- Testes
- Deploy stores

---

## 8. Riscos e Mitigações

- **Escopo excessivo:** MVP fechado e documentado
- **Latência:** WebSockets + mapas eficientes
- **Custos APIs:** limites e monitorização
- **Legal/RGPD:** dados mínimos, consentimento explícito

---

## 9. Uso de IA (Cursor)

### Prompt inicial recomendado

"Estou a construir uma plataforma de ride‑sharing em Portugal, semelhante a Uber/Bolt. Stack: FastAPI + PostgreSQL + React Native. Preciso que cries o backend base com modelos, endpoints e WebSockets para gestão de viagens. Segue este project.md como fonte única de verdade."

### Prompts sequentes

- "Implementa o fluxo completo de uma viagem"
- "Adiciona pagamentos Stripe com split automático"
- "Cria testes para o matching de motoristas"

---

## 10. Princípio orientador

> Primeiro funcionar. Depois escalar. Depois diferenciar.

Este documento é a referência única do projeto e deve ser atualizado a cada decisão estrutural.
