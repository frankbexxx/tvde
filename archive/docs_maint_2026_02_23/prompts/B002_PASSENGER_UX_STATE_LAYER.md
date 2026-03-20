# B002_PASSENGER_UX_STATE_LAYER

## Contexto

O frontend já recebe estados implícitos via API:

- 404 driver_location → driver_not_assigned
- 409 driver_location → trip completed

## Objetivo

Criar uma camada de estado visual (UX state layer) para o passageiro.

## Instruções

### 1. Criar enum de estados no frontend

- SEARCHING_DRIVER
- DRIVER_ASSIGNED
- DRIVER_ARRIVING
- TRIP_ONGOING
- TRIP_COMPLETED

### 2. Mapear estados

- 404 driver_location → SEARCHING_DRIVER
- driver location válido → DRIVER_ASSIGNED ou ARRIVING
- trip.status === ongoing → TRIP_ONGOING
- 409 → TRIP_COMPLETED

### 3. Criar componente visual central

PassengerStatusCard

### 4. Conteúdo por estado

- **SEARCHING_DRIVER:** "À procura de motorista...", spinner
- **DRIVER_ASSIGNED:** "Motorista a caminho", info básica
- **DRIVER_ARRIVING:** "Motorista chegou"
- **TRIP_ONGOING:** "Em viagem"
- **TRIP_COMPLETED:** "Viagem concluída", parar polling

### 5. Delay mínimo 500ms nos estados

- Evita flicker e mudanças bruscas
- Aplicar ao mudar de estado (debounce)

### 6. Remover

- logs de erro para 404/409
- retries agressivos

### 7. NÃO alterar backend

## Critério de sucesso

- Não há ecrãs vazios
- Não há erros visuais durante fluxo normal
- Utilizador percebe sempre o que está a acontecer
