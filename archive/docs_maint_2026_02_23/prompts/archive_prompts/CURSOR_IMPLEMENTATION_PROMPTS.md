# Cursor Implementation Prompts

Regra principal:

Nunca alterar código existente sem:

1. evidência de problema
2. plano claro
3. rollback simples

Cada alteração deve:

- manter compatibilidade
- adicionar logs
- incluir validação

---

Começar com PROMPT_-1 e depois PROMPT_00


# PROMPT 01 — Trip State Guardrails

Objetivo:

Garantir que as transições de estado das trips são válidas.

Estados permitidos:

requested → assigned  
assigned → accepted  
accepted → arriving  
arriving → ongoing  
ongoing → completed

Cancelamentos:

requested → cancelled  
assigned → cancelled

---

Tarefa:

1. Criar função central:

validate_trip_transition(old_state, new_state)

2. Usar esta função em:

accept_trip  
arriving  
start_trip  
complete_trip  
cancel_trip

3. Se transição inválida:

return HTTP 409

4. Adicionar logs estruturados.

Requisitos:

- não alterar endpoints
- apenas adicionar validação
- manter compatibilidade com dados existentes

Testes:

- criar trip
- aceitar
- tentar saltar estados
- confirmar erro

---

# PROMPT 02 — Driver Simulation Engine

Objetivo:

Criar ferramenta para simular múltiplos drivers.

Criar script:

scripts/driver_simulator.py

Funcionalidades:

- gerar N drivers
- enviar localização
- aceitar viagens

Parâmetros:

--drivers 10  
--interval 3

Comportamento:

1. criar lista de drivers simulados
2. cada driver envia localização
3. drivers aceitam viagens disponíveis

Logs:

- driver online
- trip accepted
- trip completed

Objetivo:

testar concorrência.

---

# PROMPT 03 — Geo Matching

Objetivo:

mostrar apenas trips próximas.

Alterar endpoint:

GET /driver/trips/available

Adicionar:

distance(driver_location, trip_pickup)

Filtro inicial:

5 km radius

Implementação:

Haversine formula ou PostGIS se disponível.

Regras:

- manter comportamento atual se driver_location não existir
- adicionar logs

Testes:

- driver perto → vê trip
- driver longe → não vê

---

# PROMPT 04 — Dispatch Improvements

Objetivo:

ordenar trips por proximidade.

Alterar endpoint:

GET /driver/trips/available

Adicionar:

ORDER BY distance ASC

Drivers veem primeiro:

viagens mais próximas.

---

# PROMPT 05 — Observability

Adicionar métricas:

- trips created
- trips accepted
- trips completed

Adicionar logs estruturados:

trip_id  
driver_id  
timestamp

Objetivo:

facilitar debugging.