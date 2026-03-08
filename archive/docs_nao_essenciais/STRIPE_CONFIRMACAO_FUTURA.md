# Fluxo de Confirmação Stripe — Documento de Transição Futura

Documento de referência para quando implementar confirmação real no frontend (SCA, 3DS).  
**Não implementar agora.** Apenas desenhar o fluxo para evitar improvisação.

---

## Modo Atual (MVP)

```
accept_trip:
  → create PaymentIntent (confirm=False)
  → PI status: requires_confirmation
  → complete_trip: update amount → confirm (backend pm_card_visa em dev) → capture
```

- Confirmação acontece no backend no `complete_trip`.
- Em dev: `pm_card_visa` injetado no confirm.
- Em produção: requer PaymentMethod do frontend (ainda não existe).

---

## Modo Futuro (Confirmação no Accept)

### Fluxo esperado

```
accept_trip:
  → create PaymentIntent (confirm=False)
  → retornar client_secret na resposta (ENABLE_CONFIRM_ON_ACCEPT=true)
  → frontend:
      stripe.confirmCardPayment(client_secret)
      → PI passa para requires_capture (ou requires_action se 3DS)
  → backend:
      bloquear arriving/start até PI em requires_capture
```

### Passos detalhados

| Etapa | Responsável | Ação |
|-------|-------------|------|
| 1 | Backend | `accept_trip` cria PI, retorna `payment_intent_client_secret` |
| 2 | Frontend | Stripe Elements + `stripe.confirmCardPayment(client_secret)` |
| 3 | Stripe | Se 3DS: `requires_action` → redirect/modal → `requires_capture` |
| 4 | Backend | Antes de `mark_trip_arriving` e `start_trip`: validar PI em `requires_capture` |
| 5 | Backend | `complete_trip`: apenas `capture` (sem update/confirm) |

### Pontos críticos a tratar

1. **Bloqueio sistémico: qualquer transição além de `accepted`**
   - Regra: bloquear `mark_trip_arriving` e `start_trip` enquanto PI não estiver em `requires_capture`.
   - Se PI em `requires_confirmation` ou `requires_action` → rejeitar ambas as transições.
   - Caso contrário: motorista pode avançar para arriving/start sem autorização real → incoerência.
   - A validação não é só em `start_trip`; é em **qualquer** transição que saia de `accepted`.

2. **`requires_action` (3DS)**
   - Frontend deve lidar com redirect ou modal Stripe.
   - Após sucesso, PI passa a `requires_capture`.
   - Webhook `payment_intent.requires_action` — não alterar `payment.status` (manter processing).

3. **Utilizador abandona confirmação**
   - Trip fica em `accepted` com PI em `requires_confirmation`.
   - PaymentIntent expira (~24h).
   - **Risco:** motorista fica bloqueado à espera de confirmação que nunca vem.
   - Opções necessárias:
     - Timeout automático de trip accepted sem confirmação (ex.: 10 min).
     - Ou permitir que o motorista cancele e a viagem volte a ficar disponível.
   - Sem isto: trips "zombie" e motoristas presos.

4. **`client_secret` nunca no detalhe**
   - Só na resposta imediata do `accept_trip`.
   - Endpoints de detalhe (`GET /trips/{id}`) não expõem `client_secret`.
   - Já está correto: `TripDetailResponse` não tem `payment_intent_client_secret`.

---

## Impacto no Pricing (crítico)

O verdadeiro impacto arquitetural não é 3DS. É **quando o preço passa a ser definitivo**.

### Modo Atual

- Preço calculado no `complete_trip` (distance/duration conhecidos ou mock).
- `update_payment_intent_amount` → `confirm` → `capture`.
- Stripe permite alterar amount enquanto PI está em `requires_confirmation`.

### Modo Futuro — choque estrutural

- Stripe **não permite** alterar amount quando PI já está em `requires_capture`.
- No modo futuro, `complete_trip` faz apenas `capture` — sem update.
- **Consequência:** o preço final precisa estar definido **antes** da confirmação.

### Implicação

| Momento | Modo Atual | Modo Futuro |
|---------|------------|-------------|
| accept | Amount placeholder (50 cêntimos) | Amount **definitivo ou estimado** |
| complete | Calcula preço real, update, confirm, capture | Apenas capture (amount já fixo) |

### Estratégias possíveis

**A) Cobrança apenas no final (modelo atual melhorado)**  
- Mantém cálculo no complete.  
- Confirmação no accept seria apenas "hold" com valor estimado alto.  
- Complexidade: captura parcial ou reautorização da diferença.

**B) Autorização real antes da viagem**  
- Preço estimado no accept (ex.: distância/duração estimadas).  
- Autorizar esse valor.  
- No complete: capturar até ao valor autorizado (Stripe permite partial capture).

**C) Autorização estimada + ajuste final**  
- Autorizar valor máximo (ex.: 2× estimativa).  
- No complete: capturar valor real (até ao máximo).  
- Ou: reautorizar diferença se exceder (mais complexo).

**Referência:** Uber usa autorização inicial estimada e captura valor final até limite autorizado (ou reautoriza diferença).

### Decisão pendente

Antes de implementar confirmação no accept, é necessário:

1. Definir qual filosofia financeira seguir (A, B ou C).
2. Ajustar pricing engine e fluxo de accept em conformidade.
3. Sem isto, a implementação será improvisada e criará dívida estrutural.

---

## Preparação já feita

- `ENABLE_CONFIRM_ON_ACCEPT` em config (default False).
- `accept_trip` retorna `(trip, client_secret)` quando flag ativa.
- `TripStatusResponse.payment_intent_client_secret` opcional.
- Nenhuma alteração no `complete_trip` atual.

---

## Recomendação estratégica

**Não ativar confirmação no accept até:**

- Ter pricing final definido antes da viagem.
- Ter decidido o modelo de captura (A, B ou C).
- Ter tratado timeout/abandono de trips accepted.

**Ordem sugerida:**

1. Validar UX real da Web App.
2. Validar fluxo humano (passenger ↔ driver).
3. Validar estabilidade geral.
4. Só depois: definir filosofia financeira e ativar confirmação.

---

## Ordem de implementação (quando decidido)

1. Definir estratégia de pricing (A, B ou C).
2. Ajustar `accept_trip` para calcular/estimar amount antes de criar PI.
3. Ativar `ENABLE_CONFIRM_ON_ACCEPT=true`.
4. Frontend: integrar Stripe Elements no fluxo do driver após accept.
5. Backend: bloquear `mark_trip_arriving` e `start_trip` até PI em `requires_capture`.
6. Backend: simplificar `complete_trip` para apenas capture.
7. Tratar edge cases: abandono (timeout/cancel), 3DS, expiração.
