# TVDE — Logs e Testes: Síntese e Detalhe

Documento de referência para logs estruturados, testes automatizados e observabilidade.

---

## 1. VISÃO GERAL

| Componente | O que faz | Onde |
|------------|-----------|------|
| **log_event** | Regista evento sempre (formato legível) | `app/utils/logging.py` |
| **log_debug_event** | Regista só quando `DEBUG_RUNTIME_LOGS=True` | `app/utils/logging.py` |
| **Buffer em memória** | Últimos 50 eventos por `trip_id` | `app/utils/logging.py` |
| **Endpoint debug** | `GET /debug/trip/{trip_id}/logs` | `app/api/routers/debug_routes.py` |

---

## 2. CONFIGURAÇÃO

### 2.1 Variáveis de ambiente (`.env`)

```env
# Ativar logs detalhados (offers_sent resumo, offer_accepted, driver_location_updated)
DEBUG_RUNTIME_LOGS=True

# Pré-requisitos para testes
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/ride_db
# + JWT_SECRET_KEY, OTP_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
```

### 2.2 Pré-requisitos para testes

- PostgreSQL a correr: `.\scripts\1_start_db.ps1` ou `docker start ride_postgres`
- `backend/.env` com variáveis obrigatórias
- Ambiente virtual: `.\venv\Scripts\activate`

---

## 3. EVENTOS REGISTADOS

### 3.1 Sempre (log_event)

| Evento | Prefixo | Campos | Quando |
|--------|---------|--------|--------|
| `trip_created` | [TRIP] | trip_id, passenger_id, created_at | Após criar trip |
| `trip_accepted` | [TRIP] | trip_id, driver_id | Driver aceita (assign ou offer) |
| `trip_state_change` | [TRIP] | trip_id, from, to | Qualquer transição de estado |
| `stale_location_filtered` | [DISPATCH] | trip_id, driver_id, age_seconds | Localização ignorada por stale |
| `NO_READY_DRIVERS_AT_DISPATCH` | [DISPATCH] | trip_id, drivers_with_loc_count, stale_excluded | Sem drivers disponíveis |
| `dispatch_retry_attempt` | [DISPATCH] | trip_id, attempt | Retry de dispatch |
| `dispatch_retry_success` | [DISPATCH] | trip_id, attempt, offer_count | Retry bem-sucedido |
| `dispatch_retry_failed` | [DISPATCH] | trip_id, attempts | Retry falhou |
| `trip_auto_dispatched` | [DISPATCH] | trip_id, driver_id | Auto-dispatch em BETA |
| `driver_location_update` | [DRIVER] | driver_id, lat, lng | Sempre que driver envia localização |
| `driver_location_first_send` | [DRIVER] | driver_id, lat, lng | Primeira vez que driver envia |
| `driver_location_requested` | [DRIVER] | trip_id, user_id | Quando passenger/driver pede localização |

### 3.2 Só com DEBUG_RUNTIME_LOGS=True (log_debug_event)

| Evento | Prefixo | Campos | Quando |
|--------|---------|--------|--------|
| `offers_sent` | [DISPATCH] | trip_id, count, min_km, max_km | Resumo de ofertas (DEBUG) |
| `offer_accepted` | [DRIVER] | trip_id, driver_id, offer_id | Driver aceita oferta |
| `driver_location_updated` | [DRIVER] | trip_id, driver_id, lat, lng | Localização quando driver tem trip ativa |

### 3.3 Formato no console

```
[TRIP] trip_created | trip_id=... | passenger_id=... | created_at=...
[DISPATCH] offers_sent | trip_id=... | count=5 | min_km=0.0 | max_km=5.64
[DRIVER] offer_accepted | trip_id=... | driver_id=... | offer_id=...
[TRIP] state_changed | trip_id=... | requested → assigned
```

---

## 4. DUPLICAÇÕES E REDUNDÂNCIAS

| Situação | Descrição | Decisão |
|----------|-----------|---------|
| `trip_accepted` + `trip_state_change` | Ambos são emitidos em `accept_trip` / `accept_offer` | Mantido: um é semântico, outro é transição |
| `offer_accepted` vs `trip_accepted` | `offer_accepted` é só em accept_offer; `trip_accepted` em ambos | `offer_accepted` é debug-only; `trip_accepted` sempre |
| `driver_location_update` vs `driver_location_updated` | Um sempre; outro só quando trip ativa | `driver_location_updated` adiciona trip_id; complementares |
| `logger.info` vs `log_event` | Alguns sítios usam `logger.info` com `extra={}` | `logger.info` para debugging; `log_event` para fluxo |

---

## 5. O QUE NÃO TEMOS (GAPS)

| Gap | Impacto | Sugestão |
|-----|---------|----------|
| Logs sem trip_id | `driver_location_update`, `driver_location_first_send` | Adicionar trip_id quando driver tem trip ativa |
| Tempo até assignment | Não calculado automaticamente | Usar timestamps em `trip_created` e `trip_state_change` (assigned) |
| Tempo até aceite | Não calculado | Usar timestamps em `trip_state_change` (assigned → accepted) |
| Tempo até início | Não calculado | Usar timestamps em `trip_state_change` (arriving → ongoing) |
| Logs de cancelamento | Não há evento específico | `trip_state_change` cobre (X → cancelled) |
| Logs de rating | Não há | Baixa prioridade |

---

## 6. TESTES AUTOMATIZADOS

### 6.1 Resumo por ficheiro

| Ficheiro | Testes | O que testa |
|----------|--------|-------------|
| `test_admin_operational.py` | 5 | 401 sem auth em endpoints admin |
| `test_driver_availability.py` | 3 | Online/offline, elegibilidade para dispatch |
| `test_driver_location.py` | 4 | POST localização válida/inválida |
| `test_driver_tracking.py` | 4 | GET localização do driver (passenger, driver, 403, 404) |
| `test_geo_stability.py` | 4 | Stale location, first send, dispatch com fresh |
| `test_matching.py` | 3 | Sem drivers, 1 driver, múltiplos (mais próximo) |
| `test_multi_offer_dispatch.py` | 4 | Criação de ofertas, first accept wins, reject, offer expirada |
| `test_offer_timeout.py` | 2 | Expiração de oferta, redispatch |
| `test_cancellation_rules.py` | 3 | Cancel antes/depois, fee, penalty driver |
| `test_rating_system.py` | 4 | Rating passenger, driver, avg atualizado |
| `test_trip_state_guardrails.py` | 2 | Complete inválido (409), fluxo válido |
| `test_websocket_updates.py` | 3 | Broadcast status, localização, nova oferta |
| `test_cleanup.py` | 1 | Apagar audit_events antigos |
| `test_osrm.py` | 2 | OSRM sem config, com config |
| `test_pricing_engine.py` | 3 | Base fare, distance, time pricing |

**Total: 49 testes** (incl. 2 admin com estrutura JSON autenticada)

### 6.2 O que cada teste regista (via logs)

| Teste | Eventos esperados |
|-------|-------------------|
| `test_mod_001_offer_creation` | 1× offers_sent (DEBUG) + trip_created | ordem: trip_created primeiro |
| `test_mod_002_only_first_accept_wins` | offers_sent, trip_created, trip_accepted, trip_state_change |
| `test_geo_stability_stale_drivers_excluded` | stale_location_filtered |
| `test_da_001_driver_goes_online` | (nenhum log_event) |
| `test_valid_flow_still_works` | trip_created, trip_state_change (várias), trip_accepted |

---

## 7. COMO TESTAR

### 7.1 Correr todos os testes

```powershell
cd c:\dev\APP\backend
.\venv\Scripts\activate
pytest tests/ -v
```

### 7.2 Ver logs durante os testes

```powershell
pytest tests/ -v -s
```

O `-s` desativa a captura de stdout; os logs aparecem no terminal.

### 7.3 Testar com DEBUG_RUNTIME_LOGS

```powershell
# No .env: DEBUG_RUNTIME_LOGS=True
# Ou: $env:DEBUG_RUNTIME_LOGS="True"; pytest tests/ -v -s
```

### 7.4 Resultado esperado

```
============================= 49 passed in ~18s ==============================
```

---

## 8. COMO VER OS LOGS

### 8.1 Durante o backend

```powershell
uvicorn app.main:app --reload
```

Os logs aparecem no terminal onde o uvicorn roda.

### 8.2 Em testes

```powershell
pytest tests/ -v -s
```

### 8.3 Via API (buffer em memória)

```http
GET /debug/trip/{trip_id}/logs
```

- Requer `ENV=dev` ou `ENABLE_DEV_TOOLS=True` ou `BETA_MODE=True`
- Retorna últimos 50 eventos dessa trip
- Exemplo: `{"trip_id": "...", "logs": ["[TRIP] trip_created | ...", ...], "count": N}`

### 8.4 Filtrar por trip_id no terminal

```powershell
pytest tests/ -v -s 2>&1 | Select-String "trip_id=54ad0573"
```

---

## 9. BUFFER EM MEMÓRIA

| Propriedade | Valor |
|-------------|-------|
| Máximo por trip | 50 eventos |
| Persistência | Nenhuma (volátil) |
| Thread-safe | Sim (`Lock`) |
| Eventos que entram | Apenas os que têm `trip_id` |

---

## 10. ENDPOINTS DE DEBUG

| Endpoint | Descrição | Auth |
|----------|-----------|------|
| `GET /debug/trip/{trip_id}/logs` | Logs recentes da trip | Dev/BETA |
| `GET /debug/driver-locations` | Todas as localizações | Dev |
| `GET /debug/trip-matching/{trip_id}` | Diagnóstico de matching | Passenger token |
| `GET /debug/driver-eligibility` | Diagnóstico de elegibilidade | Driver token |

---

## 11. FLUXO TÍPICO DE UMA TRIP (LOGS)

Ordem esperada com `DEBUG_RUNTIME_LOGS=True`:

1. `[DISPATCH] offer_sent` (N vezes)
2. `[TRIP] trip_created`
3. `[TRIP] trip_accepted` ou `[DRIVER] offer_accepted`
4. `[TRIP] state_changed | requested → assigned` (se assign)
5. `[TRIP] state_changed | assigned → accepted`
6. `[TRIP] state_changed | accepted → arriving`
7. `[DRIVER] driver_location_updated` (várias vezes)
8. `[TRIP] state_changed | arriving → ongoing`
9. `[TRIP] state_changed | ongoing → completed`

---

## 12. FICHEIROS RELEVANTES

| Ficheiro | Função |
|----------|--------|
| `app/utils/logging.py` | log_event, log_debug_event, buffer, formatação |
| `app/core/config.py` | DEBUG_RUNTIME_LOGS |
| `app/services/trips.py` | trip_created, trip_accepted, trip_state_change |
| `app/services/offer_dispatch.py` | offers_sent, stale_location_filtered, NO_READY_DRIVERS |
| `app/services/driver_location.py` | driver_location_*, driver_location_updated |
| `app/api/routers/debug_routes.py` | GET /debug/trip/{id}/logs |

---

## 13. POSSÍVEIS MELHORIAS

1. **Cálculo automático de tempos** — script ou endpoint que, dado `trip_id`, calcule tempo até assignment/aceite/início a partir dos logs
2. **Logs de cancelamento** — evento `trip_cancelled` com trip_id, cancelled_by, reason
3. **Logs de rating** — `trip_rated` com trip_id, rater, rating
4. **Export para ficheiro** — opção de escrever logs em ficheiro (ex: `logs/trip_{id}.log`) para análise posterior
5. **Nível DEBUG** — flag `DEBUG_RUNTIME_LOGS` poderia ativar nível DEBUG em vez de só mais eventos
