# Estrutura da GUI — TVDE Web App

Documento detalhado da estrutura da interface para **Web** e **Android** (PWA). Permite análise e correção de layout, responsividade e comportamento.

---

## 1. Visão geral

| Plataforma  | Tecnologia              | Comportamento                              |
| ----------- | ----------------------- | ------------------------------------------ |
| **Web**     | React + Vite + Tailwind | SPA em `https://tvde-app-xxx.onrender.com` |
| **Android** | PWA (mesma web app)     | Chrome/WebView; viewport dinâmico          |

**Breakpoints Tailwind:**

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px

**Viewport:** `width=device-width, initial-scale=1.0, viewport-fit=cover`

---

## 2. Árvore de componentes (raiz)

```
main.tsx
  └── initTheme() → App.tsx
        └── BrowserRouter
              └── ActivityLogProvider
                    └── AuthProvider
                          ├── AppLifecycleLogger
                          └── DevToolsCallbackProvider
                                └── ActiveTripProvider
                                      └── AppRoutes
```

**Contextos:**

- `ActivityLogContext` — logs de eventos, status
- `AuthContext` — token, `role` (UI: passageiro/motorista/admin conforme rota e sessão), `appRouteRole` (passageiro vs motorista persistido), `sessionPhone` (telemóvel mostrado em Conta), `betaMode`, login/logout
- `DevToolsCallbackProvider` — callbacks para refetch dos dashboards quando `DevTools` (só DEV) altera estado no servidor
- `ActiveTripContext` — passengerActiveTripId, driverActiveTripId

---

## 3. Fluxo de rotas e decisões

| Condição                       | Renderiza                                          |
| ------------------------------ | -------------------------------------------------- |
| `isLoading`                    | `"A carregar..."` (centrado, min-h-screen)         |
| `betaMode && !isAuthenticated` | `LoginScreen`                                      |
| Autenticado                    | Layout principal com header + main + ActivityPanel |

**Rotas** (guards em `src/routes/index.tsx`: `RootRedirect`, `PassengerOnly`, `DriverOnly`, `AdminDeniedRedirect`):

- `/` → `RootRedirect` para `/passenger` ou `/driver` conforme `appRouteRole`
- `/passenger` → `PassengerOnly` → `PassengerDashboard`; se papel na sessão for motorista, redirect para `/driver`
- `/driver` → `DriverOnly` → `DriverDashboard`; se papel for passageiro, redirect para `/passenger`
- `/admin` → `AdminDashboard` se `isAdmin`; caso contrário `AdminDeniedRedirect` para o home do papel (`/passenger` ou `/driver`)

---

## 4. Layout principal (AppRoutes)

### 4.1 Container

```css
min-h-screen bg-background flex flex-col w-full max-w-md md:max-w-5xl mx-auto
```

- **Mobile:** `max-w-md` (448px), coluna
- **Desktop (md+):** `max-w-5xl` (1024px), row

### 4.2 Header (sticky)

```css
sticky top-0 z-10 bg-background border-b border-border shrink-0
```

**Conteúdo (flex justify-between):**

- `h1` "TVDE" (text-lg font-bold)
- Grupo à direita (`flex`, ícones): `ProfileButton` (Conta) · `SettingsButton` (Configuração)
  - **Conta:** telemóvel, papel, **Sair** (só em `betaMode`)
  - **Configuração:** tema, modo da app (Passageiro/Motorista), registo de atividade embutido, atalho Painel admin se `isAdmin`, **DevTools** só se `import.meta.env.DEV`

### 4.3 Área principal

```css
flex flex-1 min-h-0 flex-col md:flex-row
```

- **Mobile:** `flex-col` — main em cima, ActivityPanel em baixo
- **Desktop:** `flex-row` — main à esquerda, ActivityPanel à direita

### 4.4 Main (conteúdo)

```css
flex-1 overflow-y-auto min-h-0 min-w-0
```

- `Routes` com PassengerDashboard, DriverDashboard, AdminDashboard

### 4.5 ActivityPanel

```css
w-full md:w-80 shrink-0 bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col min-h-[200px] md:min-h-0 md:h-[calc(100vh-4rem)]
```

- **Mobile:** largura total, borda superior, `min-h-[200px]`
- **Desktop:** `w-80` (320px), borda esquerda, altura `calc(100vh-4rem)`

**Seções:**

1. **Vista + Live** — role, indicador "Ao vivo" (verde)
2. **Estado** — status atual (amber-50)
3. **Registo** — logs com CopyLogButton, Limpar

---

## 5. LoginScreen (BETA)

**Layout:** `min-h-screen flex flex-col items-center justify-center p-4 bg-background`

**Card:** `max-w-sm bg-card rounded-2xl shadow-card p-6`

**Elementos:**

- `h1` "TVDE BETA"
- Links: Passageiro | Motorista (flex-1, py-2, rounded-xl)
- `p` "Entra com o teu telemóvel (+351...)"
- Form: `input phone`, `input password`, `button Entrar`
- Erro: `text-destructive bg-destructive/10`

---

## 6. Papel da app (passageiro / motorista)

### Modelo de papel (actual)

| Aspeto | Comportamento |
|--------|----------------|
| **Definição** | No login (BETA), o utilizador escolhe Passageiro ou Motorista; a API devolve `role` e a app sincroniza `appRouteRole` e navega. |
| **Persistência** | `AuthContext.appRouteRole` + `localStorage` (`tvde_app_route_role`, ver `authStorage.ts`). |
| **Regras de rota** | `passenger` → UI `/passenger`; `driver` → `/driver`; `admin` → `/admin` (com `isAdmin`). |
| **Navegação** | `/` redirecciona pelo papel; acesso cruzado passageiro/motorista bloqueado pelos guards. |
| **Mudança manual** | Só em **Configuração** → Modo da app (não há selector no header). |
| **Admin** | Atalho **Painel admin** nas definições se `isAdmin`; em `/admin` a UI/token de admin segue a rota (`AuthContext`). |

---

## 7. SettingsButton

**Comportamento:** `useMediaQuery("(max-width: 639px)")`

- **Mobile (<640px):** Dialog centrado
- **Desktop:** Sheet bottom

**Trigger:** `Button variant="ghost" size="icon"` (ícone engrenagem)

**Corpo principal (vista "Configuração"):**

- **Aspeto** — `ThemeSelector`
- **Modo da app** — dois botões (Passageiro / Motorista): `setAppRouteRole` + `navigate` para `/passenger` ou `/driver`
- Se `isAdmin`: link **Painel admin** → `/admin`
- **Registo de atividade** — muda para vista com `ActivityPanel` embedded
- Se `import.meta.env.DEV`: **Desenvolvimento** — `DevTools` (modo alinhado com `appRouteRole`)

O **logout (Sair)** em BETA não está nas definições: ver **`ProfileButton`** (painel **Conta**).

### 7.1 ProfileButton (Conta)

- **Trigger:** `Button` ghost, ícone de utilizador, `aria-label="Conta"` — ao lado da engrenagem no header.
- **Painel** (Dialog em mobile, Sheet em desktop): título **Conta**; telemóvel (`sessionPhone`); papel (Passageiro / Motorista / Administrador); se `betaMode`, botão **Sair** (`logout`, variante destrutiva).

**Mobile (Dialog):** `DialogContent` com largura/altura limitadas; título "Configuração" ou "Registo de atividade".

**Desktop (Sheet):** `SheetContent side="bottom"`, cantos superiores arredondados, `safe-area-pb` quando aplicável.

**ThemeSelector:**

- `grid grid-cols-2 gap-2 w-full max-w-[240px]`
- Botões: Portugal | Portugal Dark | Minimal | Neon

---

## 8. ScreenContainer (layout de dashboards)

**Props:** `children`, `bottomButton?`

**Uso:** PassengerDashboard, DriverDashboard

**Layout:**

- `min-h-screen flex flex-col max-w-md mx-auto w-full bg-background`
- Área scroll: `flex-1 flex flex-col px-5 py-6 overflow-y-auto` + `pb-24` se bottomButton
- Bottom button: `fixed bottom-0 left-0 right-0 z-20 bg-background border-t border-border shadow-card`
  - `max-w-md mx-auto px-5 py-4 safe-area-pb`

---

## 9. PassengerDashboard

### 9.1 Estrutura

```
ScreenContainer(bottomButton)
  ├── [fluxo unificado] cartão: pesquisa destino (texto/MapTiler), mapa, painel embedded
  ├── StatusHeader (estados fora do cartão unificado)
  ├── [erro] div bg-red-50
  ├── [sem viagem] Estimativa 4–6 €
  ├── [requested] Spinner + "Estamos a encontrar..."
  ├── [assigned|accepted|arriving|ongoing] TripCard
  ├── [completed] TripCard
  ├── Histórico (lista 5 últimas)
  └── bottomButton: PrimaryActionButton
```

### 9.2 Botão principal (bottom)

| Estado                               | Label             | Variant |
| ------------------------------------ | ----------------- | ------- |
| Sem viagem                           | Pedir viagem      | primary |
| requested/assigned/accepted/arriving | Cancelar          | danger  |
| completed                            | Pedir nova viagem | primary |

### 9.3 StatusHeader (variantes)

| Status    | Label                  | Variant   |
| --------- | ---------------------- | --------- |
| requested | À procura de motorista | requested |
| assigned  | Motorista atribuído    | assigned  |
| accepted  | Motorista a caminho    | accepted  |
| arriving  | Motorista a chegar     | arriving  |
| ongoing   | Em viagem              | ongoing   |
| completed | Viagem concluída       | completed |
| cancelled | Cancelada              | idle      |
| failed    | Falhou                 | error     |

---

## 10. DriverDashboard

### 10.1 Estrutura

```
ScreenContainer(bottomButton)
  ├── header (h1 "Motorista", p descrição)
  ├── Toggle (Estado Disponível/Offline)
  ├── [toast 409] div bg-amber-100 animate-toast-enter
  ├── [erro] div bg-red-50
  ├── [offline] "Está offline..."
  ├── [!offline && !activeTripId] StatusHeader + RequestCards ou "Nenhuma viagem"
  ├── [activeTripId] ActiveTripSummary (StatusHeader + TripCard)
  ├── Histórico (lista 5 últimas)
  └── bottomButton: ActiveTripActions (Cheguei | Iniciar | Concluir | Cancelar)
```

### 10.2 Toggle

- `rounded-xl border-2 border-slate-200 bg-slate-50 p-4`
- Label: "Estado"
- Sub-labels: Disponível | Offline
- Switch: `h-12 w-20 shrink-0 rounded-full`

### 10.3 RequestCard (por viagem disponível)

- `rounded-xl border-2 border-slate-200 bg-white p-4 space-y-4 shadow-sm`
- Recolha (pickup)
- Preço: `text-2xl font-bold text-emerald-700`
- Botão ACEITAR: `min-h-[48px] px-6 rounded-xl bg-emerald-600`

### 10.4 ActiveTripActions (bottom)

| Status   | Botão principal | Cancelar |
| -------- | --------------- | -------- |
| accepted | Cheguei         | Sim      |
| arriving | Iniciar viagem  | Sim      |
| ongoing  | Concluir viagem | Não      |

---

## 11. AdminDashboard

**Layout:** `p-4 max-w-2xl mx-auto`

**Tabs:** Pendentes | Utilizadores

- **Pendentes:** lista de pending users, botão Aprovar
- **Utilizadores:** lista de users, botões Motorista/Passageiro, Editar, Eliminar, Guardar/Cancelar

**Sem ScreenContainer** — usa apenas o main da área principal.

---

## 12. Componentes de UI

### 12.1 PrimaryActionButton

- `w-full min-h-[48px] rounded-2xl font-semibold text-lg shadow-card`
- Variants: `primary` (bg-primary) | `danger` (bg-destructive)
- Loading: spinner + "A processar..."

### 12.2 StatusHeader

- `rounded-xl border-2 px-4 py-4 text-center text-xl font-semibold mb-6`
- Variantes: requested, assigned, accepted, arriving, ongoing, completed, idle, error
- Cores por variante (amber, blue, violet, emerald, slate, red)

### 12.3 TripCard

- `rounded-2xl border-2 border-border bg-card p-4 space-y-3 shadow-card`
- Props: pickup, destination?, price, estimateFallback?, driverName?, children
- Labels: Origem, Destino, preço

### 12.4 RequestCard

- `rounded-xl border-2 border-slate-200 bg-white p-4 space-y-4 shadow-sm`
- Props: pickup, estimatedPrice, estimateFallback?, onAccept, loading?

### 12.5 Toggle

- Props: label, checked, onChange, onLabel, offLabel

### 12.6 Spinner

- Props: size (sm | md | lg)
- `animate-spin rounded-full border-slate-300 border-t-blue-600`

### 12.7 Sheet / Dialog

- Sheet: side top|bottom|left|right, z-[60], bg-card
- Dialog: centrado, overlay z-50

---

## 13. DevTools

- Apenas em **`import.meta.env.DEV`**, embutido em **`SettingsButton`** (secção Desenvolvimento), não no corpo do dashboard.
- Collapsible: `▶ Dev` / `▼ Dev`
- Botões: Seed, Auto-trip, Timeouts, Export logs, Reset run, Assign (se lastCreatedTripId)
- `rounded-lg border border-slate-200 bg-slate-50 overflow-hidden`

---

## 14. Design system

### 14.1 Tokens (tokens.css)

| Token               | Valor                        |
| ------------------- | ---------------------------- |
| --radius-base       | 1rem                         |
| --radius-large      | 1.5rem                       |
| --shadow-card       | 0 8px 20px rgba(0,0,0,0.06)  |
| --shadow-floating   | 0 20px 40px rgba(0,0,0,0.12) |
| --transition-fast   | 120ms ease                   |
| --transition-normal | 200ms ease                   |

### 14.2 Temas (data-theme)

| Tema          | Estilo                                           |
| ------------- | ------------------------------------------------ |
| portugal      | Verde, amarelo, vermelho (bandeira); fundo claro |
| portugal-dark | Verde/amarelo em fundo escuro                    |
| minimal       | Neutros (220°), fundo branco                     |
| neon          | Roxo/ciano em fundo escuro                       |

### 14.3 Safe area

```css
.safe-area-pb {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
```

Usado em: bottom button fixo, Sheet definições.

---

## 15. Responsividade — resumo

| Elemento             | Mobile                      | Desktop (md+)                        |
| -------------------- | --------------------------- | ------------------------------------ |
| Container principal  | max-w-md, col               | max-w-5xl, row                       |
| Main + ActivityPanel | col (panel abaixo)          | row (panel direita)                  |
| ActivityPanel        | w-full, border-t, min-h-200 | w-80, border-l, h-[calc(100vh-4rem)] |
| Conta (perfil)       | Dialog centrado             | Sheet bottom                         |
| Configuração         | Dialog centrado             | Sheet bottom                         |
| ThemeSelector        | max-w-[240px]               | —                                    |
| ScreenContainer      | max-w-md                    | —                                    |

---

## 16. Ficheiros de referência

| Componente              | Ficheiro                                              |
| ----------------------- | ----------------------------------------------------- |
| App                     | `src/App.tsx`                                         |
| Rotas                   | `src/routes/index.tsx`                                |
| LoginScreen             | `src/features/auth/LoginScreen.tsx`                   |
| PassengerDashboard      | `src/features/passenger/PassengerDashboard.tsx`       |
| DriverDashboard         | `src/features/driver/DriverDashboard.tsx`             |
| AdminDashboard          | `src/features/admin/AdminDashboard.tsx`               |
| ActivityPanel           | `src/components/ActivityPanel.tsx`                    |
| Auth storage (papel UI) | `src/utils/authStorage.ts`                            |
| AuthContext             | `src/context/AuthContext.tsx`                         |
| ProfileButton (Conta)   | `src/design-system/components/app/ProfileButton.tsx`   |
| SettingsButton          | `src/design-system/components/app/SettingsButton.tsx` |
| ThemeSelector           | `src/design-system/components/app/ThemeSelector.tsx`  |
| DevToolsCallbackContext | `src/context/DevToolsCallbackContext.tsx`             |
| Pesquisa destino        | `src/features/passenger/DestinationSearchField.tsx`   |
| ScreenContainer         | `src/components/layout/ScreenContainer.tsx`           |
| PrimaryActionButton     | `src/components/layout/PrimaryActionButton.tsx`       |
| StatusHeader            | `src/components/layout/StatusHeader.tsx`              |
| TripCard                | `src/components/cards/TripCard.tsx`                   |
| RequestCard             | `src/components/cards/RequestCard.tsx`                |
| Toggle                  | `src/components/ui/Toggle.tsx`                        |
| Spinner                 | `src/components/ui/Spinner.tsx`                       |
| DevTools                | `src/features/shared/DevTools.tsx`                    |

---

## 17. Notas para Android

- **Viewport:** `viewport-fit=cover` para safe areas
- **Definições:** Dialog em vez de Sheet (evita corte)
- **Bottom button:** `safe-area-pb` para o indicador de navegação
- **vh:** Em mobile, `100vh` pode incluir o address bar; `dvh` usado no Sheet quando aplicável

---

_Documento gerado a partir da análise do código em `web-app/src/`._
