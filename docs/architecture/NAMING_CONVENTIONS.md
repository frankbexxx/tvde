# TVDE — Convenções de Naming e Linguagem

Data: 2026-03-22

Este documento define as regras de naming e linguagem para o projeto TVDE. É um guia de estilo, não um refactor — alterações ao código existente devem seguir estas regras quando aplicável.

---

## 1. Regras de Naming

### 1.1 Identificadores de código

Todos os identificadores de código devem estar em **inglês**.

| Tipo | Exemplo correto | Exemplo incorreto |
|------|-----------------|-------------------|
| Variáveis | `driver_location`, `trip_status` | `localizacao_motorista`, `estado_viagem` |
| Funções | `accept_trip`, `create_trip` | `aceitar_viagem`, `criar_viagem` |
| Classes | `DriverLocation`, `TripStatus` | `LocalizacaoMotorista`, `EstadoViagem` |
| Ficheiros | `driver_location.py`, `trips.py` | `localizacao_motorista.py`, `viagens.py` |
| Tabelas BD | `driver_locations`, `trips` | `localizacoes_motoristas`, `viagens` |
| Colunas BD | `passenger_id`, `origin_lat` | `passageiro_id`, `origem_lat` |
| Rotas API | `/drivers/location`, `/trips/{trip_id}/accept` | `/motoristas/localizacao`, `/viagens/{id}/aceitar` |

### 1.2 Convenções de estilo

- **snake_case** para variáveis, funções, ficheiros, tabelas e colunas.
- **PascalCase** para classes e tipos.
- **camelCase** não é usado no projeto; preferir snake_case.

### 1.3 Sufixos de contexto

| Sufixo | Uso |
|--------|-----|
| `_id` | Identificadores (UUID, FK) |
| `_at` | Timestamps (`created_at`, `updated_at`) |
| `_lat`, `_lng` | Coordenadas geográficas |

---

## 2. Regras de Linguagem

### 2.1 Comentários

Os comentários devem ser escritos em **português**.

```python
# valida transição de estado da viagem
# auto-dispatch: se motorista disponível, atribui viagem ao pool
```

**Nota:** O código atual pode ainda ter comentários em inglês. Em alterações futuras, preferir português.

### 2.2 Documentação (.md)

Os ficheiros de documentação do projeto devem permanecer em **português**.

---

## 3. Dicionário de Terminologia

O sistema deve usar consistentemente estes termos em inglês no código:

| Termo em código | Significado (PT) | Uso |
|----------------|------------------|-----|
| `trip` | viagem / pedido de viagem | Ride request; entidade principal |
| `driver` | motorista | Condutor TVDE |
| `passenger` | passageiro | Cliente que pede viagem |
| `dispatch` | atribuição de viagem | Trip assignment |
| `matching` | seleção de motorista | Driver selection |

### 3.1 Termos relacionados

| Código | Significado |
|--------|-------------|
| `driver_location` | Localização GPS do motorista |
| `trip_status` | Estado da viagem (requested, assigned, accepted, etc.) |
| `accept_trip` | Motorista aceita viagem |
| `assign_trip` | Sistema atribui viagem a motorista |
| `create_trip` | Passageiro cria pedido de viagem |

---

## 4. Strings visíveis ao utilizador

As mensagens visíveis ao utilizador devem eventualmente suportar **i18n** (internacionalização).

### 4.1 Chaves de exemplo (futuro)

```
error.invalid_email
trip.not_found
driver.not_available
```

A implementação de i18n **não faz parte** desta convenção; apenas a estrutura de chaves deve ser planeada.

---

## 5. Exemplos: bom vs mau

### 5.1 Naming correto

```python
# Funções
def accept_trip(db: Session, trip_id: str, driver_id: str) -> Trip: ...
def upsert_driver_location(db: Session, driver_id: str, lat: float, lng: float) -> None: ...

# Tabelas
__tablename__ = "driver_locations"
__tablename__ = "trips"

# Rotas
@router.post("/{trip_id}/accept")
@router.get("/{trip_id}/driver-location")
```

### 5.2 Naming incorreto

```python
# Evitar
def aceitar_viagem(...): ...
def localizacao_motorista(...): ...
__tablename__ = "localizacoes_motoristas"
__tablename__ = "viagens"
@router.post("/{trip_id}/aceitar")
```

### 5.3 Comentários

```python
# Correto (português)
# valida transição de estado da viagem
# auto-dispatch: se motorista disponível, atribui viagem ao pool

# Evitar em alterações futuras (inglês para comentários)
# validate trip state transition
# auto-dispatch: if driver available, assign trip to pool
```

---

## 6. Resumo

| Área | Regra |
|------|-------|
| Código (identificadores) | Inglês |
| Comentários | Português |
| Documentação (.md) | Português |
| Strings visíveis | Preparar para i18n (chaves) |
| Terminologia | trip, driver, passenger, dispatch, matching |
