# Checklist de Features (TVDE)

Formato:

- **Sim**: existe e é utilizável no produto atual
- **Parcial**: existe parcialmente (API sem UI, UI limitada, ou falta polimento/fluxo completo)
- **Não**: não existe (ou não está exposto de forma utilizável)

> Nota: Este documento é um snapshot do estado observado no repo e na app web. Vamos atualizando à medida que adicionares itens e/ou implementarmos.
>
> Última atualização: **2026-04-28** (após ciclos de melhoria Passenger/Driver e smokes manuais).

---

## 1) PASSENGER (cliente)

### Core (mínimo produto)

- **Pedir viagem (origem → destino)**: **Sim**
- **Geolocalização automática**: **Parcial**
  - Fallback / demo existe; experiência depende de permissões e device.
- **Escolha tipo de serviço (ex: standard)**: **Não**
- **Ver motorista em tempo real**: **Sim**
  - Tracking via polling (`/trips/{id}/driver-location`) + mapa.
- **ETA (tempo estimado)**: **Parcial**
  - Existe ETA em respostas e meta de rota (OSRM) no planeamento; não é um “ETA ao motorista” completo em todas as fases.
- **Preço estimado**: **Sim**
- **Iniciar / acompanhar / terminar viagem**: **Parcial**
  - Passageiro acompanha estados; iniciar/terminar é ação do motorista.
- **Pagamento (cartão / dinheiro)**: **Parcial**
  - Stripe no backend (PaymentIntent e estados); no `web-app` não há fluxo completo “introduzir cartão/3DS”.
  - “Dinheiro” como método de pagamento first-class: não.
- **Histórico de viagens**: **Parcial**
  - UI mostra histórico recente; sem exploração avançada.
- **Avaliação do motorista**: **Parcial**
  - API existe (`POST /trips/{id}/rate`); UI dedicada de rating não está clara/total no passenger.

### Crescimento

- **Múltiplos destinos (stops)**: **Não**
- **Agendar viagem**: **Não**
- **Partilha de viagem (live tracking link)**: **Não**
- **Favoritos (casa, trabalho)**: **Não**
- **Escolha de motorista preferido (soft)**: **Não**
- **Promoções / códigos desconto**: **Não**
- **Escolha de método pagamento antes da viagem**: **Não**

### Avançado

- **Ride pooling (viagem partilhada)**: **Não**
- **Subscription (ex: descontos mensais)**: **Não**
- **Split payment (dividir conta)**: **Não**
- **Suporte in-app (chat)**: **Não**
- **Tipping (gorjetas)**: **Não**
- **Cancel reasons + fees**: **Parcial**
  - Cancel existe; modelo completo de motivos + taxas não.

---

## 2) DRIVER (motorista)

### Core

- **Receber pedidos**: **Sim**
- **Aceitar / rejeitar viagem**: **Parcial**
  - Aceitar: sim.
  - Rejeitar (oferta): API existe; UI explícita de rejeição não está evidente no front principal.
- **Navegação até passageiro**: **Sim**
  - Links dedicados para Waze/Google Maps no estado de aproximação.
- **Navegação durante viagem**: **Sim**
  - Links dedicados para Waze/Google Maps durante `ongoing`.
- **Iniciar / terminar viagem**: **Sim**
- **Ver ganhos por viagem**: **Parcial**
  - Existe `final_price` e campos de payout em respostas; não é dashboard de ganhos completo.
- **Estado online/offline**: **Sim**

### Crescimento

- **Heatmap (zonas com procura)**: **Não**
- **Earnings dashboard (dia/semana)**: **Não**
- **Histórico de viagens**: **Parcial**
- **Cancelamento com motivo**: **Parcial**
- **Pausa / descanso**: **Não**
  - Offline cobre parte do comportamento, mas não é “pausa” de produto.
- **Notificações de procura**: **Não**

### Avançado

- **Bonus / incentivos**: **Não**
- **Metas (ex: 10 viagens = extra €)**: **Não**
- **Integração com apps de navegação**: **Sim**
- **Suporte in-app**: **Não**
- **Gestão de horários**: **Não**
- **Score do motorista (qualidade)**: **Parcial**
  - Existem campos/ratings no domínio; UX/visibilidade completa ainda não.

---

## 3) PARTNER (frota / gestor)

> Este é o foco atual.

### Core

- **Ver lista de motoristas**: **Sim**
- **Atribuir motoristas à frota**: **Sim**
- **Ver viagens da frota**: **Sim**
- **Métricas básicas (viagens, atividade)**: **Sim**
- **Estado dos motoristas (online/offline)**: **Sim**
- **Ativar/desativar motoristas**: **Sim**

### Crescimento

- **Earnings por motorista**: **Parcial**
  - Existem dados base no ecossistema; falta “dashboard por motorista” no partner.
- **Relatórios (diário / semanal)**: **Parcial**
  - Admin tem weekly/alerts/usage; partner não tem pacote equivalente completo.
- **Export (CSV)**: **Sim**
- **Filtros avançados (por data, driver)**: **Parcial**
  - Existem filtros por estado e pesquisa; intervalos de datas/BI avançado não.
- **Onboarding de motoristas**: **Parcial**
  - “Adicionar à frota” existe; onboarding documental não.
- **Gestão de documentos (licenças)**: **Não**

### Avançado

- **Comissões por motorista**: **Parcial**
- **Payouts (pagamentos aos motoristas)**: **Parcial**
- **Alertas operacionais (ex: motorista inativo)**: **Parcial**
  - Admin tem alertas mínimos; partner não tem painel próprio.
- **Tracking em tempo real da frota (mapa)**: **Não**
- **Gestão de múltiplas frotas**: **Parcial**
- **Performance analytics (top drivers)**: **Não**

---

## 4) ADMIN (plataforma)

### Core

- **Ver todos os utilizadores**: **Sim**
- **Gerir motoristas / passageiros**: **Parcial**
- **Criar parceiros**: **Sim**
- **Atribuir motoristas**: **Sim**
- **Ver todas as viagens**: **Sim**
- **Métricas globais**: **Sim**

### Crescimento

- **Suporte (resolver problemas)**: **Parcial**
- **Refunds**: **Parcial**
- **Gestão de preços (pricing rules)**: **Parcial**
- **Gestão de zonas (geofencing)**: **Não**
- **Fraude básica (contas suspeitas)**: **Não**

### Avançado

- **Dynamic pricing (surge)**: **Não**
- **Sistema de disputas**: **Não**
- **Gestão de campanhas**: **Não**
- **Auditoria completa (logs + ações)**: **Parcial**
- **Controlo financeiro global**: **Parcial**

---

## 5) FEATURES TRANSVERSAIS (críticas)

### Auth / Segurança

- **Login consistente**: **Parcial**
- **Roles bem definidos**: **Sim**
- **Sessão estável**: **Parcial**

### Mapa / Localização

- **Tracking em tempo real**: **Parcial**
  - Polling é o “default” atual.
- **Fallback robusto**: **Sim**
- **Precisão / smoothing**: **Parcial**

### Tempo real

- **Polling ou websockets**: **Parcial**
  - `web-app` usa polling em várias áreas; WS não é o caminho dominante no cliente.
- **Sincronização estado viagem**: **Sim**

### Logs / Observabilidade

- **request_id**: **Sim**
- **Logs por ação**: **Parcial**
- **Tracking erros**: **Parcial**
  - Não há APM (ex: Sentry) assumido como standard no repo.

### Testes

- **E2E**: **Parcial**
  - Há base Playwright (`test:e2e`), mas não cobre tudo.
- **Multi-user scenarios**: **Parcial**

---

## 6) Faltas com maior impacto (próximas iterações)

Para manter foco operacional, este é o recorte recomendado do que falta com melhor retorno:

1. **Driver — rejeitar oferta na UI** (hoje está só aceitar/cancelar depois de aceitar).
2. **Passenger — rating do motorista na UI** (API já existe; falta fluxo visível no fim da viagem).
3. **Passenger — método de pagamento first-class** (escolha explícita pré-viagem e feedback claro).
4. **E2E — ampliar cobertura multi-user em cenários de falha/cancelamento** (hoje está parcial).
