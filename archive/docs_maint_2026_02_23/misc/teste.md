TVDE — Passado, Presente e Futuro
O que temos (estado atual)
Backend
FastAPI + PostgreSQL (Render) + SQLAlchemy 2.x
Ciclo de viagem com state machine e validações
Stripe: PaymentIntent, webhooks, autorização/capture
Driver tracking: driver_locations, auto-dispatch quando o motorista envia posição
Matching geográfico: Haversine, raio configurável (GEO_RADIUS_KM=25 por defeito)
Auth: JWT, OTP, BETA com role por path
Admin: métricas, system health, recover driver, cancel trip, run timeouts
Race conditions: locks em complete_trip e cancel
Simulador: múltiplos drivers, concorrência
Frontend
React 19 + Vite 7 + TypeScript
MapLibre + MapTiler (streets-v2)
Dashboards: passageiro, motorista, admin
Tracking: polling da localização do motorista no mapa
Rota OSRM entre origem e destino
Infra
Render: backend, frontend estático, PostgreSQL
GitHub: repo, deploy automático
O que falta (prioridades)
Crítico para piloto
Componente	Estado	Esforço
Driver availability toggle	Drivers sempre “online”	1–2 semanas
Driver rejection/timeout	Só aceitar; sem re-dispatch	1–2 semanas
Pricing engine	Preço fixo/mock	2–3 semanas
Regras de cancelamento	Básicas	1 semana
Importante
Componente	Estado	Esforço
Surge pricing	Não existe	2–3 semanas
Real-time (WebSockets)	Polling 3s	2–4 semanas
Driver verification	Sem verificação de licença/seguro	3–4 semanas
Rating system	Não existe	2–3 semanas
Operacional
Componente	Estado
Background workers	Timeouts via endpoint manual
Queue (Redis)	Não existe
Fraud detection	Não existe
Analytics	Métricas básicas
Para onde vamos (roadmap)
Fase 1 — Estabilização (≈ concluída)
State machine, race conditions, GEO_RADIUS configurável
Próximo passo: toggle de disponibilidade do motorista
Fase 2 — Marketplace (3–6 semanas)
Toggle online/offline
Rejeição + timeout + re-dispatch
Pricing engine (base + distância + tempo)
Regras de cancelamento
Fase 3 — Experiência (3–6 semanas)
WebSockets para updates em tempo real
Push notifications (opcional)
Ajustes de UI/UX
Fase 4 — Piloto (6–8 semanas)
20–30 motoristas, 100–200 passageiros
Zona geográfica limitada (ex.: Lisboa–Oeiras)
Métricas: tempo de espera, viagens/hora, earnings
Horizonte
3–6 meses até piloto realista
Fator limitante: equilíbrio do marketplace (oferta/procura), não só tecnologia
Resumo
Dimensão	Situação
Arquitetura	Sólida, extensível
Core (trips, payments, tracking)	Funcional
Matching	Básico, mas com raio configurável
Gaps críticos	Availability, rejection, pricing
Próximo passo lógico	Toggle online/offline do motorista
A base técnica está pronta para um piloto controlado; falta sobretudo lógica de marketplace e operação.