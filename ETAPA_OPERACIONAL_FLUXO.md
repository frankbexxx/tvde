# Etapa Operacional — Fluxo Técnico → Operacional

Documento consolidado para elevar o sistema de "fluxo técnico funcional" para "fluxo operacional realista".

---

## 🎯 Objetivo

Introduzir:

- Timeout automático de trips
- Estado de disponibilidade de motorista
- Sistema básico de dispatch automático
- Proteções contra condições de corrida

**Sem alterar:** fluxo financeiro, Stripe, `complete_trip`, `accept_trip` (apenas adições mínimas).

---

## 🔒 INVARIANTES OBRIGATÓRIAS

- Não alterar `accept_trip` (apenas adicionar `is_available=False` e `FOR UPDATE`)
- Não alterar `complete_trip` (apenas adicionar `is_available=True`)
- Não alterar `stripe_service`
- Não alterar webhook
- Não alterar modelo financeiro
- Não introduzir Stripe Connect
- Não alterar state machine principal (apenas adicionar regras de transição)

---

## 📦 ETAPA 1 — Disponibilidade do Motorista

### Modelo Driver

- Novo campo: `is_available: bool = True` (default)

### Regras

| Evento | Ação |
|--------|------|
| Driver aceita trip | `is_available = False` |
| Trip termina (completed ou cancelled) | `is_available = True` |
| Motorista tenta aceitar com `is_available=False` | Rejeitar (409) |

### Endpoints afetados

- `list_available_trips`: apenas mostrar trips se driver `is_available=True`
- `accept_trip`: validar `driver.is_available` antes de aceitar

### Ficheiros

- `app/db/models/driver.py` — adicionar `is_available`
- `app/main.py` — `_dev_add_columns_if_missing` para `is_available`
- `app/services/trips.py` — validação em `accept_trip`, `list_available_trips`; atualizar em `complete_trip`, `cancel_trip_by_driver`, `cancel_trip_by_passenger`

---

## 📦 ETAPA 2 — Timeout Automático de Trip

### Regras

| Condição | Ação |
|----------|------|
| Trip em `assigned` há > 2 min | `status = requested` |
| Trip em `accepted` há > 10 min sem start | `status = cancelled`, `driver.is_available = True` |
| Trip em `ongoing` há > 6 horas | `status = failed`, `driver.is_available = True` |

### Timestamps usados

- `assigned`: `trip.updated_at`
- `accepted`: `trip.updated_at`
- `ongoing`: `trip.started_at`

### Ficheiros

- `app/services/trip_timeouts.py` — função `run_trip_timeouts(db)`
- `app/api/routers/admin.py` — `POST /admin/run-timeouts`

### Comportamento

- Apenas leitura + update de estado
- Sem mexer em Stripe
- Para `accepted`→cancelled e `ongoing`→failed: libertar driver (`is_available=True`)

---

## 📦 ETAPA 3 — Dispatch Automático Simples

### Regra

Ao criar trip (`create_trip`):

- Se existir driver `is_available=True` e `status=approved`
- Auto-assign: `trip.status = assigned`
- Caso contrário: manter em `requested`

### Implementação

- Chamar lógica equivalente a `assign_trip` dentro de `create_trip` se houver driver disponível
- Sem algoritmo complexo, sem geolocalização — prova de conceito

### Ficheiros

- `app/services/trips.py` — em `create_trip`, após `db.add(trip)` e antes de `db.commit`, verificar e atribuir

---

## 📦 ETAPA 4 — Proteção Contra Race Condition no Accept

### Objetivo

Garantir que dois drivers não podem aceitar a mesma trip simultaneamente.

### Implementação

- Usar `SELECT ... FOR UPDATE` na query da trip em `accept_trip`
- Manter idempotência via check de Payment existente
- Condição atómica: lock da linha trip antes de validar e atualizar

### Ficheiro

- `app/services/trips.py` — `accept_trip`: `select(Trip).where(...).with_for_update()`

---

## 🧪 Testes Esperados

| Cenário | Resultado esperado |
|---------|--------------------|
| Dois drivers aceitam mesma trip | Apenas um consegue; o outro recebe 409 |
| Trip assigned > 2 min | `run-timeouts` reverte para requested |
| Driver indisponível | Não aparece como candidato em available trips |
| Fluxo completo | Sistema mantém coerência com payment existente |

---

## 📊 Critérios de Aceitação

- Fluxo financeiro intacto
- Nenhum impacto em `accept_trip` ou `complete_trip` além de disponibilidade e lock
- Web app continua funcional
- System-health continua consistente

---

## 📁 Resumo de Alterações

| Ficheiro | Alteração |
|----------|-----------|
| `app/db/models/driver.py` | `is_available: bool = True` |
| `app/main.py` | `_dev_add_columns_if_missing`: `is_available` |
| `app/services/trips.py` | Disponibilidade, dispatch, FOR UPDATE, `_set_driver_available` |
| `app/services/trip_timeouts.py` | **Novo** — `run_trip_timeouts()` |
| `app/api/routers/admin.py` | `POST /admin/run-timeouts` |
| `app/schemas/system_health.py` | `RunTimeoutsResponse` |
| `web-app/src/api/trips.ts` | `runTimeoutsAdmin()` |
| `web-app/src/features/shared/DevTools.tsx` | Botão "Run timeouts" |
| `web-app/TESTES_OPERACIONAIS.md` | **Novo** — documento de testes manuais |
