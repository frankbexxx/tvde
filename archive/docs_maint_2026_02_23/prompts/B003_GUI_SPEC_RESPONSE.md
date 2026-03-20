# B003 GUI SPEC — Resposta Completa

## 1. Por tipo de utilizador

### PASSENGER

**VISUAL:** Ecrã com header "Passageiro", StatusHeader (badge colorido com estado), mapa MapLibre com marcadores (verde=passageiro, azul=motorista), rota roxa quando viagem ativa, PassengerStatusCard com conteúdo por estado, botão fixo inferior (Pedir viagem / Cancelar / Pedir nova viagem), histórico de viagens.

**STATE:** `activeTripId`, `activeTrip` (poll 3s), `driverLocation` (poll 2s), `uxState` (500ms debounce), `tripCompletedFromLocation`.

**PERCEPTION:** "A app está a trabalhar para mim" — spinner em SEARCHING, mensagens claras em cada estado, sem ecrãs vazios, sem erros em fluxo normal.

---

### DRIVER

**VISUAL:** Toggle Disponível/Offline, mapa com posição do motorista, StatusHeader com contagem de viagens ou estado da viagem ativa, lista de RequestCards (viagens disponíveis) ou ActiveTripSummary, botão fixo (Cheguei / Iniciar / Concluir / Cancelar).

**STATE:** `offline`, `available` (poll 3s), `activeTripId`, `driverLocation` (geolocation), trip detail (poll 2s).

**PERCEPTION:** "Estou no controlo" — toggle claro, viagens aparecem quando disponíveis, feedback imediato ao aceitar.

---

### ADMIN

**VISUAL:** Tabs (Pendentes, Utilizadores, Viagens, Métricas, Operações, Saúde), listas por tab, botões de ação (Aprovar, Promover, Atribuir, etc.), métricas em cards.

**STATE:** `tab`, `pending`, `users`, `activeTrips`, `metrics`, `health`, polling 8s.

**PERCEPTION:** "Tenho visibilidade total" — dados atualizados, ações claras.

---

## 2. Layout detalhado (wireframes)

### PASSENGER

```
[HEADER]
  Passageiro
  Pedir e acompanhar viagens

[DEV TOOLS] (colapsável)

[GEOLOCATION BANNER] (se fallback)

[STATUS HEADER] ← dominante, badge colorido
  "À procura de motorista..." | "Motorista a caminho" | etc.

[MAP AREA] h-[45vh] min-h-[220px]
  - Marcador verde (passageiro)
  - Marcador azul (motorista, quando atribuído)
  - Linha roxa (rota OSRM)

[ERROR BANNER] (se erro)

[ESTIMATE] (sem viagem) ou [PASSENGER STATUS CARD] (com viagem)

[HISTÓRICO] (lista de viagens)

[BOTTOM BUTTON] fixed
  Pedir viagem | Cancelar | Pedir nova viagem
```

### DRIVER

```
[HEADER]
  Motorista
  Aceitar e completar viagens

[TOGGLE] Estado: Disponível | Offline

[TOAST] (409)

[ERROR BANNER]

[MAP] (quando online) ou [OFFLINE MESSAGE]

[STATUS HEADER] ou [LISTA REQUEST CARDS] ou [ACTIVE TRIP SUMMARY]

[HISTÓRICO]

[BOTTOM BUTTON] (quando viagem ativa)
  Cheguei | Iniciar viagem | Concluir viagem
  Cancelar viagem
```

### ADMIN

```
[HEADER] TVDE + RoleSelector

[TABS] horizontal scroll
  Pendentes | Utilizadores | Viagens | Métricas | Operações | Saúde

[ERROR]

[TAB CONTENT]
  - Pendentes: lista + Aprovar
  - Utilizadores: lista + Promover/Despromover/Editar
  - Viagens: lista + Atribuir/Cancelar
  - Métricas: cards
  - Operações: botões Run timeouts, etc.
  - Saúde: warnings, drivers
```

---

## 3. Componentes

| Componente | Responsabilidade | Props | Estados |
|------------|------------------|-------|---------|
| **ScreenContainer** | Wrapper mobile-first, bottom button fixo | children, bottomButton | — |
| **StatusHeader** | Badge de estado, cor por variant | label, variant | requested, assigned, accepted, arriving, ongoing, completed, idle, error |
| **MapView** | Mapa MapLibre, marcadores, rota | passengerLocation, driverLocation, route | — |
| **PassengerStatusCard** | Conteúdo por UX state passageiro | uxState, activeTrip | SEARCHING_DRIVER, DRIVER_ASSIGNED, etc. |
| **TripCard** | Card de viagem (origem, destino, preço) | pickup, destination, price, driverName | — |
| **RequestCard** | Card de viagem disponível para motorista | pickup, estimatedPrice, onAccept, loading | — |
| **PrimaryActionButton** | Botão principal fixo | onClick, disabled, loading, variant | primary, danger |
| **Toggle** | Switch Disponível/Offline | checked, onChange, onLabel, offLabel | — |
| **Spinner** | Loading indicator | size | sm, md, lg |
| **DevTools** | Diagnóstico (colapsável) | lastCreatedTripId, mode | — |

---

## 4. Estados UX (CRÍTICO)

| Estado | Texto | Cores | Botão | Mapa |
|--------|------|-------|-------|------|
| **SEARCHING_DRIVER** | "À procura de motorista..." | amber-50/amber-900 | Cancelar | Só passageiro, rota origem→destino |
| **DRIVER_ASSIGNED** | "Motorista a caminho" | emerald-50/emerald-900 | Cancelar | Passageiro + motorista + rota |
| **DRIVER_ARRIVING** | "Motorista chegou" | emerald | Cancelar | Idem |
| **TRIP_ONGOING** | "Em viagem" | violet-50/violet-900 | — | Idem |
| **TRIP_COMPLETED** | "Viagem concluída" | slate | Pedir nova viagem | — (2s depois clear) |

---

## 5. CSS / Estilo

**Paleta (tema Portugal):**
- primary: verde (120 45% 38%)
- accent: amarelo (45 75% 58%)
- destructive: vermelho (0 55% 50%)

**Tipografia:**
- font-family: Plus Jakarta Sans, Inter
- Headers: text-2xl font-bold
- Body: text-base
- Labels: text-xs uppercase tracking-wide

**Espaçamentos:**
- space-y-6 entre secções
- px-4 py-4 em cards
- rounded-2xl (1rem) em cards/badges

**Snippets:**
```css
/* StatusHeader */
.rounded-2xl.border.px-4.py-4.text-center.text-xl.font-semibold
transition-colors duration-300

/* PrimaryActionButton */
.w-full.min-h-[52px].rounded-full.font-bold.text-lg
shadow-floating hover:scale-[1.02] active:scale-[0.98]
transition-all duration-200

/* TripCard */
.rounded-2xl.border.border-border.bg-card/95
shadow-card hover:shadow-floating transition-all duration-200
```

---

## 6. Animações

- **Spinner:** animate-spin
- **Toast 409:** animate-toast-enter (slideDown 0.2s)
- **StatusHeader:** transition-colors duration-300
- **Cards:** hover:shadow-floating, transition-all duration-200
- **Botões:** hover:scale-[1.02] active:scale-[0.98]

---

## 7. Map integration

- **Centro inicial:** Oeiras (38.6973, -9.30836)
- **Primeira passengerLocation:** easeTo(center, zoom 14, 800ms)
- **Driver marker:** só quando driverLocation não null
- **Rota:** OSRM fetch quando route.from e route.to mudam
- **Driver offline:** mapa escondido, mensagem "Está offline"

---

## 8. Regras de percepção

- **500ms delay** em uxState (usePassengerUxState) — evita flicker
- **Spinner** em "A verificar..." — nunca ecrã vazio
- **404/409** não são erros — B001 trata como estados válidos
- **Polling** com intervalos visíveis (2s, 3s) — utilizador sente atualização
- **StatusHeader** sempre com texto — utilizador sabe o estado

---

## 9. Estrutura de ficheiros

```
web-app/src/
├── features/
│   ├── passenger/
│   │   ├── PassengerDashboard.tsx
│   │   ├── PassengerStatusCard.tsx
│   │   └── usePassengerUxState.ts
│   ├── driver/
│   │   └── DriverDashboard.tsx
│   ├── admin/
│   │   └── AdminDashboard.tsx
│   └── shared/
│       └── DevTools.tsx
├── components/
│   ├── layout/
│   │   ├── ScreenContainer.tsx
│   │   ├── StatusHeader.tsx
│   │   └── PrimaryActionButton.tsx
│   ├── cards/
│   │   ├── TripCard.tsx
│   │   └── RequestCard.tsx
│   └── ui/
│       ├── Spinner.tsx
│       └── Toggle.tsx
├── maps/
│   ├── MapView.tsx
│   ├── PassengerMarker.tsx
│   ├── DriverMarker.tsx
│   └── RouteLine.tsx
└── design-system/
    ├── tokens.css
    └── themes/portugal.css
```

---

## 10. Melhorias aplicadas

1. **Admin:** "Pending Users" → "Utilizadores pendentes" ✅
2. **addLog:** "Viagem completed" → "Viagem concluída" ✅
3. **StatusHeader:** transition-colors já existe (300ms) ✅
4. **Admin tabs:** usar design tokens (`bg-primary`, `bg-muted`) em vez de blue-600 hardcoded ✅
5. **PassengerStatusCard:** adicionar `transition-opacity duration-300` para suavizar mudanças de estado ✅
6. **Admin botão Guardar:** `bg-primary text-primary-foreground` + hover ✅
