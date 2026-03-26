# VISUAL RUNTIME AUDIT — SISTEMA COMPLETO

## 🎯 Objetivo

Extrair a realidade visual final da aplicação em runtime (browser), incluindo estilos computados, layout real e comportamento visual.

## 1. Captura de estados reais

### idle

- Screenshot mental: ecrã de boas-vindas, mapa placeholder, painel "Para onde vais?", botão "Escolher no mapa".
- Elementos visíveis: StatusHeader (muted), MapView placeholder, TripPlannerPanel idle.
- Ordem de atenção: StatusHeader → MapView → TripPlannerPanel → PrimaryActionButton.

### planning

- Screenshot mental: mapa ativo com cursor crosshair, marcadores pickup/dropoff, painel com labels e botão "Definir destino".
- Elementos visíveis: MapView, TripPlannerPanel planning.
- Ordem: MapView → TripPlannerPanel → StatusHeader.

### confirming

- Screenshot mental: mapa + rota, painel resumo De/Para + duração/distância e CTA "Confirmar viagem".
- Elementos: MapView rotor, TripPlannerPanel confirming.
- Ordem: TripPlannerPanel → MapView → StatusHeader.

### searching

- Screenshot mental: spinner, texto "À procura de motorista…", StatusHeader accent.
- Elementos: StatusHeader accent, MapView com marcadores, PassengerStatusCard.
- Ordem: StatusHeader → Spinner → MapView.

### in_trip

- Screenshot mental: mapa com driver marker + rota, StatusHeader primário/secondary, PassengerStatusCard.
- Elementos: StatusHeader, MapView, PassengerStatusCard.
- Ordem: StatusHeader → MapView → PassengerStatusCard.

## 2. Ordem de foco visual (crítico)

- idle: StatusHeader, MapView, TripPlannerPanel, PrimaryActionButton.
- planning: MapView, TripPlannerPanel, StatusHeader.
- confirming: TripPlannerPanel, MapView, StatusHeader.
- searching: StatusHeader, Spinner, MapView.
- in_trip: StatusHeader, MapView, PassengerStatusCard.

## 3. Computed styles (real)

- PrimaryActionButton: bg-primary, text-primary-foreground, text-base 16px, p-4 px (+), py-2, rounded-lg 8px, shadow-sm.
- StatusHeader: variant color (muted/accent/primary/secondary), text-xl 20px, px-4 py-4, rounded-2xl 16px, shadow-card.
- TripPlannerPanel: bg-muted/50 or bg-card; text-base 16px; px-4 py-4; rounded-2xl 16px; shadow-card.
- MapView: bg-card/background placeholder; font-size 14px em textos; p-4; rounded-2xl 16px; shadow-card.
- Header: text-foreground; title 24px; sem shadow.

## 4. Layout real (DOM)

- Alturas: StatusHeader ~80px, MapView 45vh/220-420px, TripPlannerPanel 200-300px.
- Largura: 100%.
- Posição: relative/stacked, botão bottom fixo opcional.
- Overlaps: nenhum;
- Push: painel expande verticalmente.

## 5. Z-index real

- Components: default z-auto; map markers z-10; modals z-50.
- Hierarquia: background → content → overlay → modal.

## 6. Contraste real

- StatusHeader alto contraste em accent/primary; texto padrão médio/baixo em paneles muted.
- Risco legibilidade: text-muted-foreground em bg-muted/50.

## 7. Responsive real

- Mobile/desktop próximos: mapa 45vh, painel full width; sem grandes mudanças de grid; density similar.

## 8. Interações

- Botões: hover bg-primary/90, active bg-primary.
- Focus: ring-2 ring-primary em inputs/ativos.
- MapView: cursor crosshair, click define coordenadas.

## 9. Mapa (elemento especial)

- Espaço: 45% viewport vertical.
- Contraste: route #8b5cf6 vs UI, marcadores saturados.
- Interferencia: ocupa centro, mas não bloqueia elementos de topo/inferior.

## 10. Peso visual por estado

- idle: médio; planning: pesado; confirming: médio; searching: leve; in_trip: médio.

## 11. Problemas visuais detectados

- Competição: StatusHeader x painel em searching.
- Baixa legibilidade: textos muted/foreground em bg-muted/50.
- Excesso de informação: painel planning com muitos labels.
- Inconsistências: variações de estado com transições rápidas.
