# TVDE Platform — System Blueprint
Date: 2026-03-12

Este documento descreve a arquitetura completa do sistema TVDE MVP, inspirado em plataformas de ride-hailing como Uber ou Bolt.

Objetivo:
- manter visão clara do sistema
- evitar loops de desenvolvimento
- facilitar evolução da arquitetura

---

# 1. Objetivo do Sistema

Criar uma plataforma que permita:

Passenger:
- pedir viagem
- ver motorista
- acompanhar percurso
- pagar viagem

Driver:
- receber pedidos
- aceitar viagens
- navegar até passageiro
- completar viagem

Sistema:
- coordenar pedidos
- associar motoristas
- gerir estados da viagem
- gerir pagamentos

---

# 2. Arquitetura Geral

Sistema dividido em três camadas principais:

Frontend
Backend
Infraestrutura

---

# 3. Frontend

Stack:

React  
Vite  
TypeScript  
Tailwind  
MapLibre  
MapTiler  
OSRM

Responsabilidades:

- interface do utilizador
- renderização de mapas
- envio de requests
- polling de estado

Componentes principais:

PassengerDashboard
DriverDashboard
MapView

MapView inclui:

PassengerMarker  
DriverMarker  
RouteLine

---

# 4. Backend

Stack:

FastAPI  
SQLAlchemy 2.x  
PostgreSQL  
Stripe

Backend organizado em:

Routers
Services
Models

---

# 5. Routers

Principais routers:

passenger_trips.py  
driver_trips.py  
drivers.py  
matching.py  
admin.py  
debug_routes.py

Responsabilidade:

expor endpoints HTTP.

---

# 6. Services

Contêm lógica de negócio.

Principais services:

trips.py  
driver_location.py  
matching.py  

---

# 7. Models

Principais tabelas:

users  
drivers  
trips  
driver_locations  
payments

---

# 8. Trip Lifecycle

Estados da viagem:

requested  
assigned  
accepted  
arriving  
ongoing  
completed  
cancelled

Fluxo principal:

Passenger request
↓
trip created
↓
status = requested
↓
dispatch
↓
status = assigned
↓
driver accept
↓
status = accepted
↓
driver arriving
↓
status = arriving
↓
trip start
↓
status = ongoing
↓
trip end
↓
status = completed

---

# 9. Dispatch Model

Sistema atual utiliza modelo:

Marketplace Pull

Funcionamento:

trip criada
↓
trip colocada na pool
↓
drivers veem lista
↓
driver aceita

Vantagens:

simples  
robusto  
fácil de implementar

Desvantagens:

menos eficiente em escala.

---

# 10. Driver Tracking

Driver envia localização periodicamente.

Fluxo:

driver device
↓
POST /drivers/location
↓
driver_locations table
↓
passenger polling
↓
GET /trips/{trip_id}/driver-location

Intervalo atual:

3 segundos.

---

# 11. Payments

Pipeline de pagamento:

Passenger request
↓
Stripe PaymentIntent authorize
↓
trip running
↓
trip completed
↓
capture payment
↓
driver payout (futuro)

---

# 12. Maps

Map engine:

MapLibre

Tiles:

MapTiler

Routing:

OSRM

Elementos do mapa:

Passenger marker
Driver marker
Route line

---

# 13. Current System Characteristics

Sistema atual é:

MVP funcional

Características:

- trip lifecycle completo
- driver tracking
- payments integrados
- mapas funcionais

---

# 14. Known Limitations

Sistema ainda não possui:

geo matching
dispatch inteligente
simulação de drivers
streaming tracking
observability avançada

---

# 15. Evolution Strategy

Evolução planeada:

Phase 1
stabilization

Phase 2
driver simulation

Phase 3
geo matching

Phase 4
dispatch improvements

Phase 5
observability

Phase 6
tracking improvements

---

# 16. Engineering Principles

Princípios fundamentais:

simplicidade > complexidade

observação > suposição

dados > opinião

Nunca alterar código funcional sem:

- evidência
- plano
- rollback possível

---

# 17. Development Workflow

Fluxo de desenvolvimento:

1 implementar pequena alteração
2 testar manualmente
3 verificar logs
4 validar base de dados
5 continuar

Nunca implementar múltiplas alterações simultaneamente.

---

# 18. Debug Methodology

Diagnóstico deve seguir ordem:

1 verificar base de dados
2 verificar network requests
3 verificar logs backend
4 verificar estado do frontend

Nunca assumir causa sem evidência.

---

# 19. Long Term Architecture (Future)

Possíveis evoluções futuras:

Redis GEO para localização
WebSocket tracking
Dispatch engine dedicado
event-driven architecture
microservices

Nenhuma destas é necessária para MVP.

---

# 20. Estado Atual

O sistema encontra-se em:

MVP funcional avançado.

Próximo objetivo:

MVP robusto.