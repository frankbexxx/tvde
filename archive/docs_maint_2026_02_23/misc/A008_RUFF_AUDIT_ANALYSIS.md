# A008 — Ruff Audit — Análise e Plano de Correção

**Nota:** Nenhuma alteração foi aplicada. Este documento é apenas análise e plano.

---

## 1. CRITICAL FIXES

### 1.1 F821 — `rate_trip_as_driver` undefined

**Diagnóstico:** A função **existe** em `app/services/trips.py` (linha 445). O router `driver_trips.py` usa-a mas **não a importa**.

**Decisão:** FIX — adicionar import.

**Implementação:**

```python
# Em backend/app/api/routers/driver_trips.py, linha 27-37
# ADICIONAR rate_trip_as_driver ao import existente:

from app.services.trips import (
    accept_offer as accept_offer_service,
    accept_trip as accept_trip_service,
    cancel_trip_by_driver,
    complete_trip as complete_trip_service,
    list_available_trips as list_available_trips_service,
    get_trip_for_driver,
    list_completed_trips_for_driver,
    mark_trip_arriving as mark_trip_arriving_service,
    rate_trip_as_driver,  # <-- ADICIONAR
    start_trip as start_trip_service,
)
```

---

### 1.2 F821 — SQLAlchemy forward references (models)

**Diagnóstico:** São forward references válidas. Ruff não reconhece que `"User"`, `"Trip"`, `"Driver"`, `"Payment"` em `Mapped["..."]` são strings. O padrão SQLAlchemy usa aspas para evitar import circular.

**Decisão:** FIX — usar `from __future__ import annotations` em todos os models.

**Implementação:** Adicionar como **primeira linha** em cada ficheiro:

- `backend/app/db/models/driver.py`
- `backend/app/db/models/user.py`
- `backend/app/db/models/trip.py`
- `backend/app/db/models/payment.py`
- `backend/app/db/models/trip_offer.py`

```python
# Primeira linha de cada model (antes de qualquer outro import)
from __future__ import annotations

import uuid
# ... resto do ficheiro
```

**Justificação:** `from __future__ import annotations` torna todas as anotações lazy (avaliadas como strings). Assim, `Mapped["User"]` não é avaliado em runtime e ruff deixa de reportar F821.

---

## 2. SAFE AUTO FIXES

### 2.1 F401 — Unused imports

**Decisão:** FIX — remover. Seguro com `ruff check --fix`.

| Ficheiro | Import a remover |
|----------|------------------|
| `app/api/routers/debug_routes.py` | `status` (de `fastapi`) |
| `app/api/serializers/trip.py` | `Payment` |
| `app/services/cleanup.py` | `select` |
| `app/services/osrm.py` | `urlencode` |
| `app/services/trip_timeouts.py` | `Driver` |
| `app/services/trips.py` | `ROUND_HALF_UP` |
| `tests/test_cancellation_rules.py` | `pytest` |
| `tests/test_cleanup.py` | `settings` (dentro da função) |
| `tests/test_geo_stability.py` | `Trip`, `OfferStatus`, `TripStatus` |
| `tests/test_multi_offer_dispatch.py` | `Trip`, `TripStatus` |
| `tests/test_offer_timeout.py` | `TestClient` |
| `tests/test_pricing_engine.py` | `pytest` |
| `tests/test_websocket_updates.py` | `pytest` |

**Comando:** `ruff check backend --fix` (sem `--unsafe-fixes`)

---

### 2.2 F841 — Unused variables

**Decisão:** FIX — remover ou usar `_` prefix.

| Ficheiro | Variável | Ação |
|----------|----------|------|
| `app/services/offer_dispatch.py:40` | `max_age` | Remover linha (não usada) |
| `tests/test_driver_availability.py:120` | `driver_id` | `_ = _create_driver(...)` ou remover |
| `tests/test_driver_tracking.py:106, 142` | `driver_id` | `_ = _assign_driver_and_location(...)` |
| `tests/test_matching.py:110` | `far_id` | `_ = _create_driver_with_location(...)` |
| `tests/test_multi_offer_dispatch.py:216` | `driver_id` | `_ = _create_driver_with_location(...)` |

**Nota:** Para testes, usar `_` é idiomático quando o valor não é usado mas a chamada tem side-effects necessários.

---

### 2.3 F811 — Redefinition of `engine`

**Diagnóstico:** Import duplicado. Linha 9 importa `engine`, linha 12 importa `SessionLocal, engine` do mesmo módulo.

**Decisão:** FIX — remover import redundante.

**Ficheiros:** `tests/test_driver_location.py`, `tests/test_driver_tracking.py`, `tests/test_matching.py`

**Implementação:**

```python
# ANTES (linhas 9 e 12):
from app.db.session import engine
# ...
from app.db.session import SessionLocal, engine

# DEPOIS:
from app.db.session import SessionLocal, engine
# (remover a primeira linha que importa só engine)
```

---

## 3. IGNORE

### 3.1 E402 — Module level import not at top of file

**Ficheiros:** `app/main.py`, `tools/simulator/simulator.py`

**Decisão:** **KEEP AS IS**

**Justificação:**

- **main.py:** `load_dotenv()` **tem** de correr antes dos imports da app. Os routers e `app.core.config` usam variáveis de ambiente (ex.: `DATABASE_URL`). Carregar `.env` depois dos imports faria com que a config fosse lida antes do env estar disponível.
- **simulator.py:** Os imports de `.config` e bots vêm depois de `_shutdown_lock` e `_result_saved`. Não há dependência técnica; é apenas ordem de declaração. Poderia ser refatorado, mas o impacto é baixo e o risco de quebrar o simulator é desnecessário.

**Recomendação:** Adicionar `# noqa: E402` com comentário explicativo:

```python
# app/main.py, antes do primeiro from app...
# E402: load_dotenv must run before app imports (config reads DATABASE_URL etc.)
from app.api.routers import (
```

---

### 3.2 E712 — Avoid equality comparisons to `True`

**Ficheiros:** `debug_routes.py:89`, `offer_dispatch.py:50, 210`

**Diagnóstico:** Ruff sugere `Driver.is_available` em vez de `Driver.is_available == True`. Em SQLAlchemy, `.where(Driver.is_available)` e `.where(Driver.is_available == True)` são equivalentes; o primeiro é mais idiomático.

**Decisão:** **IGNORE** ou FIX opcional. O código atual funciona. Se corrigir: usar `Driver.is_available` (sem `== True`).

---

## 4. OPTIONAL IMPROVEMENTS

### 4.1 test_cleanup.py — `settings` importado mas não usado

O teste importa `settings` dentro da função mas não usa. Possível uso futuro (ex.: `settings.AUDIT_RETENTION_DAYS`). Se o teste usa valor hardcoded, remover o import.

### 4.2 E712 — Driver.is_available

Substituir `Driver.is_available == True` por `Driver.is_available` onde aplicável. Mudança cosmética, sem impacto funcional.

---

## 5. RESUMO EXECUTIVO

| Categoria | Itens | Ação |
|-----------|-------|------|
| **CRITICAL** | 2 | Import `rate_trip_as_driver`; `from __future__ import annotations` nos models |
| **SAFE AUTO** | ~19 | `ruff --fix` + ajustes manuais (F811, F841) |
| **IGNORE** | E402 | Manter; adicionar noqa com justificação |
| **OPTIONAL** | E712, test_cleanup | Melhorias cosméticas |

---

## 6. ORDEM DE EXECUÇÃO SUGERIDA

1. **Crítico:** Adicionar import `rate_trip_as_driver` em `driver_trips.py`
2. **Crítico:** Adicionar `from __future__ import annotations` nos 5 models
3. **Safe:** Corrigir F811 (engine duplicado) nos 3 testes
4. **Safe:** Corrigir F841 (variáveis não usadas)
5. **Safe:** Executar `ruff check backend --fix` para F401
6. **Opcional:** Adicionar `# noqa: E402` em `main.py` e `simulator.py`

---

## 7. SEGURANÇA DO `ruff --fix`

- **Seguro:** F401 (unused imports) — ruff remove apenas imports não usados.
- **Verificar antes:** F841 — confirmar que a variável não é usada em runtime.
- **Não usar:** `--unsafe-fixes` sem revisão manual.
