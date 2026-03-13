# TVDE — Engineering Roadmap

Objetivo:
Transformar o sistema atual num MVP robusto sem reescrever arquitetura.

Princípios:

- não alterar código que funciona
- mudanças pequenas e testáveis
- cada alteração deve ser verificável
- rollback possível

---

# Fase 1 — Stabilization

Objetivo:
Eliminar inconsistências de estado e edge cases.

Tasks:

1. Trip state guardrails
2. State transition validation
3. Melhorar logs críticos
4. Endpoint consistency checks

Resultado esperado:

Trip lifecycle completamente seguro.

---

# Fase 2 — Driver Simulation Engine

Objetivo:

Simular vários motoristas para testar concorrência.

Features:

- gerar N drivers
- enviar localização
- aceitar viagens automaticamente

Permite testar:

- dispatch
- concorrência
- estabilidade do sistema

---

# Fase 3 — Geo Matching

Objetivo:

Filtrar trips por proximidade.

Implementação inicial:

distance(driver, pickup)

Exemplo:

driver vê trips dentro de 5 km.

---

# Fase 4 — Dispatch Improvements

Objetivo:

melhorar atribuição de viagens.

Possibilidades:

- ranking por distância
- prioridade
- heurísticas simples

---

# Fase 5 — Observability

Adicionar:

- métricas de trips
- métricas de dispatch
- métricas de supply

---

# Fase 6 — Tracking Improvements

Melhorias futuras:

- WebSockets
- atualização mais rápida

Não prioritário para MVP.

---

# Ordem de Implementação

1 — Trip guardrails  
2 — Driver simulation  
3 — Geo matching  
4 — Dispatch improvements  
5 — Observability  
6 — Tracking improvements