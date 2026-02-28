# ROADMAP — Fase Atual (MVP Público Web)

## Estado Atual

- Backend funcional
- Stripe authorization + capture funcional
- Webhook como fonte de verdade
- Web Test Console operacional
- Tokens dev ativos
- State machine estável

---

## Fase 1 — Modelo Financeiro Real (Base Económica)

**Objetivo:** transformar o backend num sistema economicamente realista.

### 1. Pricing Engine

- `app/core/pricing.py`
- `BASE_FARE`, `PER_KM`, `PER_MIN`, `COMMISSION_RATE`
- `calculate_price(distance_km, duration_min)`
- `calculate_driver_payout(total)`

### 2. Integração no complete_trip

- Recalcular `final_price` no complete
- Comparar com `estimated_price`
- Se diferente: `update_payment_intent_amount`, atualizar `payment.total_amount`
- Capturar PaymentIntent
- Manter webhook como fonte de verdade

### 3. Dados de distância e duração

- Campos em Trip: `distance_km`, `duration_min` (nullable)
- Se não existirem: gerar valores mock coerentes (2–5 km, 5–15 min)

### 4. Comissão

- Armazenar `driver_payout` no Payment
- Não integrar Stripe Connect ainda
- Apenas cálculo interno

**Resultado Fase 1:** Backend financeiramente realista. Base para split futuro. Base para UI real.

---

## Fase 2 — Web App Responsiva (MVP Validável)

**Objetivo:** validar produto real com interface simples.

### 1. Novo projeto web-app

- Stack: React + Vite, TypeScript, Polling (5s), Tokens automáticos (dev)

### 2. Passenger Dashboard

- Pedir viagem, ver estado, ver preço, ver pagamento, histórico simples

### 3. Driver Dashboard

- Lista assigned, Accept / Arriving / Start / Complete
- Ver valor da corrida, ver comissão

**Resultado Fase 2:** Produto testável em telemóvel. Fluxo humano validável. Base para expansão futura.

---

## Princípios Arquiteturais

- Stripe é a fonte financeira externa
- Webhook é a fonte de verdade interna
- `Payment.status` só muda via webhook
- `complete_trip` nunca altera `payment.status` manualmente
- `update_payment_intent_amount` só pode ocorrer antes de capture

## Restrições Técnicas

- Não quebrar state machine existente
- Não alterar fluxo de authorization no `accept_trip`
- Não alterar webhook handler
- Manter idempotência e atomicidade
