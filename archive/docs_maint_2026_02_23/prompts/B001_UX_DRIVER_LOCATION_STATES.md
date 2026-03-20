# B001_UX_DRIVER_LOCATION_STATES

## Contexto

O endpoint `/driver_location` pode devolver:

- **404**: `driver_not_assigned` (antes de aceitar)
- **409**: `trip_not_active_for_location_completed` (viagem terminada)

**Atualmente:** O frontend trata estas respostas como erro e faz retry, gerando logs e percepção de falha.

**Objetivo:** Transformar estes estados em UX correta, não erro.

---

## Instruções

### 1. No fetch de driver location

Se `status === 404`:

- NÃO logar como erro
- NÃO fazer retry agressivo
- Interpretar como estado válido: "à procura de motorista" ou "aguardando aceitação"

### 2. Se `status === 409`

- Parar polling imediatamente
- Considerar viagem finalizada
- NÃO fazer retry

### 3. Apenas tratar como erro real

- `status >= 500`
- network failure real

### 4. Atualizar logs

Substituir "Failed to fetch driver location" por mensagens semânticas:

- `driver_not_assigned`
- `trip_completed`

### 5. NÃO alterar

- backend
- lógica de dispatch

---

## Critério de sucesso

- Console deixa de mostrar erros em fluxo normal
- Não há retries infinitos após trip completed
- UX corresponde ao estado real do sistema
