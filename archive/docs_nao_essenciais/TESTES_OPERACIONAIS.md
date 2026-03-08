# Testes Operacionais — Web App

Documento de testes manuais para validar o fluxo operacional (disponibilidade, timeouts, dispatch, race condition).

---

## Pré-requisitos

- Backend a correr: `uvicorn app.main:app --reload --port 8000`
- Web App a correr: `npm run dev` (http://localhost:5173)
- Stripe webhook: `stripe listen --forward-to localhost:8000/webhooks/stripe`
- PostgreSQL com DB `ride_db`

---

## 1. Seed e Tokens

1. Abrir Web App
2. Dev Tools → **Seed** (cria passenger, admin, driver)
3. Verificar que tokens são carregados (role selector funciona)

---

## 2. Disponibilidade do Motorista

### 2.1 Motorista indisponível não vê trips

1. **Passenger:** Pedir viagem
2. **Admin:** Assign trip (ou deixar auto-dispatch fazer)
3. **Driver:** Ver viagem em "Viagens disponíveis"
4. **Driver:** Clicar **Accept**
5. **Driver:** Verificar que a viagem desaparece da lista available (está em "Viagem ativa")
6. **Driver:** Abrir nova aba ou outro browser, login como **outro driver** (se existir) ou verificar que o mesmo driver não vê mais trips em available
7. **Driver:** Completar viagem (Arriving → Start → Complete)
8. **Driver:** Verificar que volta a ver trips em available (quando houver)

### 2.2 Motorista indisponível não pode aceitar

1. Com um driver que já aceitou uma trip (em accepted/arriving/ongoing)
2. Tentar aceitar outra trip no mesmo contexto → não deve aparecer na lista (list_available_trips retorna [] quando is_available=False)

---

## 3. Dispatch Automático

### 3.1 Trip auto-assign quando há driver disponível

1. **Admin:** Garantir que há pelo menos um driver approved e is_available
2. **Passenger:** Pedir viagem
3. **Verificar:** Trip deve aparecer com status `assigned` (não `requested`)
4. **Driver:** Deve ver a trip em "Viagens disponíveis" imediatamente

### 3.2 Trip fica requested quando não há driver

1. Fazer reset (dev tools ou `/dev/reset`)
2. Seed apenas passenger e admin (sem driver)
3. **Passenger:** Pedir viagem
4. **Verificar:** Trip fica em `requested`
5. **Admin:** Assign manualmente para testar fluxo

---

## 4. Timeout Automático

### 4.1 Assigned → Requested (2 min)

1. **Passenger:** Pedir viagem (com auto-dispatch ou assign manual)
2. **Não aceitar** como driver
3. Esperar **2+ minutos**
4. **Admin:** Dev Tools → **Run timeouts**
5. **Verificar:** Trip volta a `requested`
6. **Driver:** Lista available deve estar vazia para essa trip

### 4.2 Accepted → Cancelled (10 min)

1. **Passenger:** Pedir viagem
2. **Admin:** Assign
3. **Driver:** Accept
4. **Não** clicar Arriving/Start
5. Esperar **10+ minutos**
6. **Admin:** Run timeouts
7. **Verificar:** Trip passa a `cancelled`
8. **Driver:** Deve voltar a estar disponível (is_available=True)

### 4.3 Ongoing → Failed (6 horas)

- Cenário difícil de testar manualmente (6h)
- Alternativa: reduzir `ONGOING_TIMEOUT_HOURS` temporariamente em `trip_timeouts.py` para testes
- Ou validar via system-health que trips ongoing > 4h são detectadas

---

## 5. Race Condition (Dois drivers aceitam mesma trip)

### 5.1 Teste manual (aproximado)

1. **Passenger:** Pedir viagem
2. **Admin:** Assign
3. Abrir **duas abas** com driver logado
4. Em ambas, carregar a lista de available trips
5. Clicar **Accept** em ambas **quase em simultâneo**
6. **Esperado:** Uma aceita com sucesso, a outra recebe 409 (Conflict) ou "Payment already exists"

### 5.2 Teste com script (opcional)

```bash
# Em paralelo, dois curls para accept na mesma trip
curl -X POST "http://localhost:8000/driver/trips/TRIP_ID/accept" \
  -H "Authorization: Bearer DRIVER_TOKEN" &
curl -X POST "http://localhost:8000/driver/trips/TRIP_ID/accept" \
  -H "Authorization: Bearer DRIVER_TOKEN" &
wait
# Apenas um deve retornar 200, o outro 409
```

---

## 6. Fluxo Completo (Regressão)

1. **Passenger:** Pedir viagem
2. **Verificar:** Auto-assign se driver disponível
3. **Driver:** Accept
4. **Driver:** Arriving → Start → Complete
5. **Verificar:** Trip completed, preço final, payment succeeded (via webhook)
6. **Driver:** Histórico mostra viagem
7. **Passenger:** Histórico mostra viagem
8. **Admin:** System-health sem inconsistências

---

## 7. System Health

1. **Admin:** GET `/admin/system-health`
2. **Verificar:** Sem `stuck_payments`, `stuck_trips`, `inconsistent_financial_state`
3. Após run-timeouts, system-health deve continuar consistente

---

## 8. Dev Tools — Run Timeouts

1. **Admin:** Dev Tools → **Run timeouts**
2. **Verificar:** Console ou network mostra resposta, ex.:
   ```json
   { "assigned_to_requested": 0, "accepted_to_cancelled": 0, "ongoing_to_failed": 0 }
   ```
3. Se houver trips em timeout, os contadores aumentam

---

## Critérios de Aceitação

- [ ] Dois drivers não conseguem aceitar a mesma trip
- [ ] Timeout reverte assigned corretamente (2 min)
- [ ] Driver indisponível não aparece como candidato
- [ ] Auto-dispatch atribui trip quando há driver
- [ ] Fluxo completo mantém coerência com payment
- [ ] Web app continua funcional
- [ ] System-health consistente
