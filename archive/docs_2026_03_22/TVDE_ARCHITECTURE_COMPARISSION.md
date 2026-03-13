# TVDE — Architecture Comparison
Date: 2026-03-12

Baseado no estado atual do sistema e comparação com arquitetura típica de ride-hailing (Uber/Bolt).

---

# 1. Arquitetura Atual

Stack:

Frontend
- React
- Vite
- TypeScript
- MapLibre
- MapTiler
- OSRM routing

Backend
- FastAPI
- SQLAlchemy
- PostgreSQL (Render)

Infra
- Render Web Service
- Render Static Site
- Render PostgreSQL

---

# 2. Componentes do Sistema

## Rider Service
Responsável por:

- criar viagens
- ver estado da viagem
- ver motorista no mapa
- cancelar

Estado atual:
✔ Implementado

Endpoints principais:

POST /trips  
GET /trips/{trip_id}  
GET /trips/{trip_id}/driver-location

---

## Driver Service

Responsável por:

- disponibilidade do motorista
- aceitar viagens
- enviar localização

Estado atual:
✔ Implementado

Endpoints principais:

POST /drivers/location  
GET /driver/trips/available  
POST /driver/trips/{trip_id}/accept

---

## Trip Service

Responsável por:

- lifecycle da viagem
- associação motorista
- estado

Estados atuais:

requested  
assigned  
accepted  
arriving  
ongoing  
completed  
cancelled

Estado:
✔ Correto

---

## Location Service

Responsável por:

- guardar localização dos motoristas
- fornecer tracking ao passenger

Implementação atual:

driver → POST /drivers/location  
↓  
driver_locations table  
↓  
passenger polling

Estado:
🟡 Simplificado (SQL + polling)

---

## Dispatch Engine

Responsável por:

- escolher motorista

Modelo atual:

trip criada  
↓  
vai para pool  
↓  
drivers escolhem

Tipo:

Marketplace Pull Model

Estado:
🟡 Simplificado mas válido para MVP

---

## Matching Geográfico

Objetivo:

- mostrar apenas viagens próximas

Estado:
🔴 Ainda não implementado

---

## Payments

Pipeline:

Passenger request  
↓  
Stripe PaymentIntent authorize  
↓  
trip running  
↓  
capture

Estado:
✔ Correto

---

# 3. Classificação Geral do Sistema

Maturity scale:

0 — ideia  
1 — protótipo  
2 — MVP funcional  
3 — MVP robusto  
4 — produção inicial  
5 — escala

Estado atual:

MVP funcional avançado
≈ nível 2.5