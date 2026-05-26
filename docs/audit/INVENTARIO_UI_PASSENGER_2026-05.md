# Inventário UI — Passageiro (maio 2026)

**Modo:** READ-ONLY · Só features **visíveis no ecrã** · Backend invisível = não existe para o user.

**Rota:** `/passenger` → `PassengerDashboard.tsx`

---

## 1. FEATURES IMPLEMENTADAS VISÍVEIS

| FEATURE | ONDE APARECE NO UI | FLUXO USER | ESTADO | FICHEIROS | NOTAS |
|---------|-------------------|------------|--------|-----------|-------|
| Mapa full-bleed | Ecrã principal | Abrir app | IMPLEMENTADA | `PassengerDashboard.tsx`, `MapStage.tsx` | |
| Bottom nav 4 tabs | Rodapé fixo | Início / Histórico / Conta / Menu | IMPLEMENTADA | `PassengerBottomNav.tsx` | |
| Pesquisa recolha (texto) | Bottom sheet idle | Escrever → sugestões → confirmar | IMPLEMENTADA | `DestinationSearchField.tsx` | |
| Pesquisa destino (texto) | Bottom sheet idle | Idem após recolha | IMPLEMENTADA | idem | |
| Marcar recolha/destino no mapa | Mapa + botão sheet | Tap mapa em modo planeamento | IMPLEMENTADA | `TripPlannerPanel.tsx` | |
| Pré-visualização rota OSRM | Mapa + sheet | Recolha+destino confirmados | IMPLEMENTADA | `routingService.ts` | |
| Confirmar viagem | Sheet confirming | Confirmar viagem → POST | IMPLEMENTADA | `TripPlannerPanel.tsx` | |
| Poll estados viagem | Sheet viagem | Automático pós-pedido | IMPLEMENTADA | `PassengerStatusCard.tsx` | |
| Cancelar viagem + motivos | Sheet overlay | Cancelar → preset/textarea → confirmar | IMPLEMENTADA | `PassengerDashboard.tsx` | Não em `ongoing` |
| Retry dispatch | Sheet searching | Tentar novamente após 25s | IMPLEMENTADA | `PassengerStatusCard.tsx` | |
| Tracking motorista no mapa | Mapa | Poll 4s accepted→ongoing | IMPLEMENTADA | `usePassengerDriverLocation.ts` | |
| Estados viagem (cards) | InfoPanel sheet | searching→completed | IMPLEMENTADA | `PassengerStatusCard.tsx` | |
| Stripe confirm cartão | Card no sheet | Se `processing` + client_secret | PARCIAL | `PassengerPaymentConfirmCard.tsx` | Condicional env/backend |
| Avaliação 1–5 pós-viagem | Painel sobre mapa | completed → estrelas → enviar | IMPLEMENTADA | `PassengerTripRatingPanel.tsx` | |
| Histórico viagens | Menu / nav Histórico | Lista read-only | IMPLEMENTADA | `PassengerSideMenu.tsx` | Sem drill-down |
| Partilhar app (QR) | Menu lateral | QR + copiar link | IMPLEMENTADA | `PassengerSideMenu.tsx` | App download, não ETA viagem |
| Conta BETA | Nav Conta / Menu | Nome + password | IMPLEMENTADA | `BetaAccountPanel.tsx` | |
| Logout | Menu lateral | Sair | IMPLEMENTADA | `PassengerSideMenu.tsx` | |
| Header marca + dicas | Topo | Automático | IMPLEMENTADA | `AppHeaderBar.tsx` | Sem ⚙️ em compact |
| GPS fallback + retry | Banner mapa | Tentar outra vez | IMPLEMENTADA | `PassengerDashboard.tsx` | |
| Toasts erros/sucesso | Overlay | Automático | IMPLEMENTADA | `PassengerDashboard.tsx` | |

---

## 2. FEATURES VISÍVEIS MAS NÃO IMPLEMENTADAS

| FEATURE | ONDE APARECE | O QUE PROMETE | O QUE FALTA | FICHEIROS | PRIORIDADE |
|---------|--------------|---------------|-------------|-----------|------------|
| Dados motorista/veículo | TripCard (compact off) | Nome, matrícula | Sempre «Motorista TVDE» / «Veículo TVDE» se visível | `PassengerStatusCard.tsx`, `TripCard.tsx` | Alta |
| Preço estimativa UI | Sheet confirming / log | Preço antes pedir | `ESTIMATE_MOCK '4–6'`; copy fixo «Pagamento simulado» | `PassengerDashboard.tsx`, `TripPlannerPanel.tsx` | Alta |
| Pagamento simulado banner | Payment card | Cobrança real | `VITE_STRIPE_MOCK` / `_secret_mock` | `PassengerPaymentConfirmCard.tsx` | Média |
| Aviso MapTiler | Campo pesquisa | Aviso geocoding | Prop `geocodingUnavailable` sempre false | `DestinationSearchField.tsx` | Baixa |
| TripCard detalhe (O/D/motorista/preço) | Status card | Detalhe viagem | `compact={true}` esconde footer | `PassengerStatusCard.tsx` | Média |
| Definições / perfil header | Dica header | ⚙️ settings | `userCompact` omite Settings | `AppHeaderBar.tsx` | Baixa |

---

## 3. FEATURES NÃO VISÍVEIS MAS EXISTENTES NO CÓDIGO

| FEATURE | EXISTE ONDE | PORQUE NÃO CONTA | COMO TORNAR VISÍVEL |
|---------|-------------|------------------|---------------------|
| Banner status (offline/pagamento) | `passengerBanner.ts` | Só alimenta ActivityLog | Montar `StatusHeader` no dashboard |
| TripPlanner searching/in_trip | `TripPlannerPanel.tsx` | Dashboard usa StatusCard em viagem | Unificar ou remover ramos mortos |
| DevTools passageiro | `DevTools.tsx` | Sem Settings no header compact | Expor ⚙️ ou link dev |
| assignTripAdmin | `api/trips.ts` | Só DevTools | N/A passageiro |
| OTP login | `api/auth.ts` | Sem UI passageiro | Ecrã login OTP |
| Active trip persist refresh | `ActiveTripContext` | Memória só | Restore UI pós-refresh |
| Categoria veículo no pedido | API trips | UI não envia | Selector no planner |

---

## 4. FEATURES ESPERADAS TIPO UBER/BOLT QUE FALTAM

| FEATURE | APP | EXISTE? | GAP | PRIORIDADE |
|---------|-----|---------|-----|------------|
| Pedido viagem | Passenger | Parcial | UI OK; refresh perde viagem | Alta |
| Escolha destino | Passenger | Sim | — | — |
| Tipo veículo | Passenger | Não | Sem selector | Alta |
| Estimativa preço | Passenger | Mock | `4–6` / copy simulado | Alta |
| ETA pickup | Passenger | Parcial | Só haversine «~X km» | Média |
| Motorista/veículo real | Passenger | Não | Placeholder TVDE | Alta |
| Tracking live | Passenger | Parcial | Poll 4s, sem push/WS | Média |
| Contacto motorista | Passenger | Não | Zero tel/chat | Alta |
| Cancelamento | Passenger | Sim | — | — |
| Rating | Passenger | Sim | — | — |
| Histórico | Passenger | Parcial | Só completed; sem detalhe | Média |
| Recibos | Passenger | Não | — | Alta |
| Suporte | Passenger | Não | — | Média |
| Locais guardados | Passenger | Não | — | Média |
| Viagem agendada | Passenger | Não | — | Baixa |
| Multi-paragem | Passenger | Não | — | Baixa |
| Favoritos | Passenger | Não | — | Baixa |
| Promoções | Passenger | Não | — | Baixa |
| Carteira/métodos pagamento | Passenger | Parcial | Stripe só se PI secret | Alta |
| Notificações push | Passenger | Não | — | Alta |
| Safety/SOS | Passenger | Não | — | Alta |
| Partilha viagem/ETA | Passenger | Não | Só QR app | Média |
| Preferências viagem | Passenger | Não | Silenciosa, AC, etc. | Baixa |
| Gorjeta | Passenger | Não | — | Média |
| Reservar para outra pessoa | Passenger | Não | — | Baixa |
| Chat in-app | Passenger | Não | — | Alta |
| PIN verificação pickup | Passenger | Não | — | Média |
| Surge/preço dinâmico | Passenger | Não | — | Média |
| Mapa área serviço | Passenger | Não | — | Média |
| Reportar incidente em viagem | Passenger | Não | — | Alta |
| App nativa | Passenger | Não | Web only | Média |
| Multi-idioma | Passenger | Não | PT only | Baixa |
| Tema claro/escuro | Passenger | Parcial | Via Settings oculto | Baixa |
| Deep link viagem | Passenger | Não | — | Média |

---

## 5. MATRIZ FINAL (Passageiro)

| APP | FEATURE | VISÍVEL? | FUNCIONAL? | ESTADO | PRIORIDADE | BLOQUEIA FEATURE-COMPLETE? |
|-----|---------|----------|------------|--------|------------|----------------------------|
| Passenger | Pedir viagem (mapa+texto) | Sim | Sim | IMPLEMENTADA | — | Não |
| Passenger | Tracking motorista | Sim | Parcial | PARCIAL | Média | Não |
| Passenger | Pagamento Stripe | Sim | Parcial | PARCIAL | Alta | Sim (comercial) |
| Passenger | Motorista/veículo real | Não* | Não | MOCK | Alta | Sim |
| Passenger | Histórico | Sim | Parcial | PARCIAL | Média | Não |
| Passenger | Rating | Sim | Sim | IMPLEMENTADA | — | Não |
| Passenger | Recibos | Não | Não | — | Alta | Sim (comercial) |
| Passenger | Push/notificações | Não | Não | — | Alta | Sim (piloto) |
| Passenger | SOS/contacto | Não | Não | — | Alta | Sim (comercial) |

*TripCard com placeholders existe no código mas oculto em `compact`.
