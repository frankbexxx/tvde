# VISUAL SYSTEM AUDIT — EXTRAÇÃO COMPLETA (READ-ONLY)

Documento de mapeamento do sistema visual da **web-app** (`c:\dev\APP\web-app`).  
**Apenas observação:** sem alterações de código, sem refatoração, sem recomendações.

---

## 1. Hierarquia visual real (PRIMARY / SECONDARY / TERTIARY)

Classificação por **atenção visual relativa** no ecrã típico (passageiro/motorista com shell da app).

| Componente | Ficheiro | Classes principais (resumo) | Nível | Motivo |
|------------|----------|-----------------------------|-------|--------|
| `PrimaryActionButton` | `web-app/src/components/layout/PrimaryActionButton.tsx` | `min-h-[52px] rounded-full font-bold text-lg shadow-floating`, gradiente `from-primary to-accent` ou `destructive` | **PRIMARY** | CTA fixo em fundo; maior contraste e sombra elevada. |
| `RequestCard` — botão ACEITAR | `web-app/src/components/cards/RequestCard.tsx` | `rounded-full bg-gradient-to-r from-primary to-accent … shadow-floating` | **PRIMARY** | Ação principal na fila de pedidos. |
| `TripPlannerPanel` — “Escolher no mapa” / “Confirmar viagem” | `web-app/src/features/passenger/TripPlannerPanel.tsx` | `rounded-xl bg-primary text-primary-foreground … font-semibold` | **PRIMARY** | CTAs de fluxo de pedido. |
| `StatusHeader` | `web-app/src/components/layout/StatusHeader.tsx` | `rounded-2xl … text-xl font-semibold`, variantes com `bg-primary`, `bg-accent`, `bg-secondary`, `bg-muted`, `bg-destructive` | **PRIMARY** | Faixa de estado no topo do conteúdo; cor sólida por variante. |
| `LoginScreen` — submit | `web-app/src/features/auth/LoginScreen.tsx` | `bg-primary … rounded-xl` | **PRIMARY** | Entrada na sessão. |
| `RoleSelector` — item activo | `web-app/src/components/RoleSelector.tsx` | `bg-primary text-primary-foreground` | **PRIMARY** | Navegação de papel activa. |
| `MapView` — iframe mapa | `web-app/src/maps/MapView.tsx` | `h-[45vh] … shadow-card bg-card rounded-2xl` | **PRIMARY** | Área visual dominante quando visível. |
| Marcadores mapa (pickup planeamento) | `MapView` + `PassengerMarker` | `bg-amber-500 ring-amber-400/60` (override) | **PRIMARY** | Cor fixa Tailwind, destaque sobre o mapa. |
| Marcadores mapa (dropoff planeamento) | idem | `bg-emerald-600 ring-emerald-400/60` | **PRIMARY** | idem |
| Rota planeamento (OSRM preview) | `MapView` | `line-color: '#8b5cf6'` (MapLibre paint) | **PRIMARY** | Linha roxa sobre o mapa. |
| `TripCard` — preço | `web-app/src/components/cards/TripCard.tsx` | `text-2xl font-bold` | **PRIMARY** | Valor monetário em destaque. |
| Header shell `TVDE` | `web-app/src/routes/index.tsx` | `text-lg font-bold text-foreground` | **SECONDARY** | Marca + navegação; sticky mas não tão grande como o mapa. |
| `TripCard` — corpo | `TripCard.tsx` | `rounded-2xl border … shadow-card`, labels `text-xs uppercase text-muted-foreground` | **SECONDARY** | Cartão informativo; hierarquia clara abaixo do preço. |
| `TripPlannerPanel` — superfície planeamento/confirmação | `TripPlannerPanel.tsx` | `border-border/90 bg-muted/50 dark:bg-zinc-950/50 shadow-inner` | **SECONDARY** | Painel de contexto sem CTA único dominante. |
| `Toggle` (motorista) | `web-app/src/components/ui/Toggle.tsx` | `rounded-2xl border … bg-muted/50 shadow-card` | **SECONDARY** | Controlo importante mas não “full bleed”. |
| `PassengerStatusCard` — blocos de estado | `PassengerStatusCard.tsx` | `rounded-2xl border …` com `bg-primary/10`, `success/15`, `secondary/15`, `muted` | **SECONDARY** | Estado da viagem + `TripCard` embutido. |
| `DevTools` | `DevTools.tsx` | `rounded-lg border bg-muted` | **SECONDARY** | Secção colapsável; secundária para utilizador final. |
| Banners aviso geo (passageiro/motorista) | `PassengerDashboard.tsx`, `DriverDashboard.tsx` | `rounded-lg bg-warning/20 border-warning/50 text-sm text-warning` | **SECONDARY** | Alerta contextual. |
| Erro global passageiro | `PassengerDashboard.tsx` | `rounded-xl bg-destructive/10 border-destructive/30 text-destructive` | **SECONDARY** | Mensagem de erro visível mas não fixa como botão. |
| `ScreenContainer` — barra inferior | `ScreenContainer.tsx` | `fixed bottom-0 … z-20 border-t shadow-card` | **SECONDARY** | Contém o CTA primário mas o botão em si é PRIMARY. |
| Links header “Log” / “Sair” | `routes/index.tsx` | `text-sm text-muted-foreground hover:text-foreground` | **TERTIARY** | Ações de baixo peso visual. |
| `ActivityPanel` — cabeçalhos “Vista”, “Estado”, “Registo” | `ActivityPanel.tsx` | `text-[9px] uppercase`, `text-xs` | **TERTIARY** | Metadados e estado de depuração. |
| `ActivityPanel` — linhas de log | idem | `text-[10px] font-mono`, cores por tipo | **TERTIARY** | Densidade alta, baixo foco. |
| Histórico viagens passageiro | `PassengerDashboard.tsx` | `text-base text-muted-foreground`, `border-b` | **TERTIARY** | Lista compacta. |
| `TripPlannerPanel` — texto auxiliar idle | `TripPlannerPanel.tsx` | `text-sm text-muted-foreground` | **TERTIARY** | Apoio ao título. |
| Meta km/min confirmação | `TripPlannerPanel.tsx` | `text-sm text-foreground/80` | **TERTIARY** | Dados de percurso. |
| `MapView` — placeholder sem mapa | `MapView.tsx` | `bg-muted/60 border-dashed`, `text-base` / `text-sm text-muted-foreground` | **TERTIARY** | Estado vazio. |
| `ThemeSelector` — opção inactiva | `ThemeSelector.tsx` | `bg-muted text-muted-foreground` | **TERTIARY** | Escolha de tema não seleccionada. |

---

## 2. Inventário de componentes UI relevantes

### Layout / shell

| Nome | Localização | Função | Variantes / notas | Classes Tailwind (principais) |
|------|-------------|--------|-------------------|-------------------------------|
| Shell da app | `routes/index.tsx` | `min-h-dvh`, header sticky, main + `ActivityPanel` | `md:flex-row`, `max-w-md md:max-w-5xl` | `bg-background`, header `z-10`, `backdrop-blur-md` |
| `ScreenContainer` | `components/layout/ScreenContainer.tsx` | Coluna centrada `max-w-md`, scroll + botão fixo opcional | Com / sem `bottomButton` | `px-5 pt-6 pb-4`, `pb-20` se botão, barra `z-20` |
| `StatusHeader` | `components/layout/StatusHeader.tsx` | Faixa de estado textual | Variantes: `requested`, `assigned`, `accepted`, `arriving`, `ongoing`, `completed`, `idle`, `error` | `rounded-2xl border px-4 py-4 text-xl font-semibold` + mapa `VARIANT_STYLES` |
| `PrimaryActionButton` | `components/layout/PrimaryActionButton.tsx` | CTA largura total, sombra elevada | `primary` \| `danger`; `loading` | `rounded-full`, `shadow-floating`, gradiente ou `destructive` |
| `ActivityPanel` | `components/ActivityPanel.tsx` | Painel lateral/diário de actividade | — | `md:w-80`, `bg-card/90`, `backdrop-blur-sm`, tipografia muito pequena |
| `RoleSelector` | `components/RoleSelector.tsx` | Links Passageiro / Motorista / Admin | Admin condicional a `isAdmin` | `rounded-xl`, activo `bg-primary` |
| `SettingsButton` | `design-system/components/app/SettingsButton.tsx` | Abre tema: `Dialog` (<640px) ou `Sheet` (≥640px) | `useMediaQuery("(max-width: 639px)")` | Trigger: `Button` `variant="ghost"` `size="icon"` |
| `ThemeSelector` | `design-system/components/app/ThemeSelector.tsx` | Grelha 2×2 de temas | 4 `ThemeId` | `rounded-xl px-4 py-3 text-sm` |

### Cartões e painéis de domínio

| Nome | Localização | Função | Variantes | Classes principais |
|------|-------------|--------|-----------|-------------------|
| `TripCard` | `components/cards/TripCard.tsx` | Origem/destino/preço (+ motorista opcional) | `children` opcional | `rounded-2xl border bg-card/95 backdrop-blur-sm p-4 shadow-card hover:shadow-floating` |
| `RequestCard` | `components/cards/RequestCard.tsx` | Pedido disponível + ACEITAR | `loading` | Mesma base que `TripCard` + botão gradiente |
| `TripPlannerPanel` | `features/passenger/TripPlannerPanel.tsx` | Painel inferior UX por `PassengerUIState` | `idle`, `planning`, `confirming`, `searching`, `in_trip` | `rounded-2xl border shadow-card`, superfície condicional |
| `PassengerStatusCard` | `features/passenger/PassengerStatusCard.tsx` | Conteúdo por `PassengerUxState` | Inclui modo `isSubmittingTrip` | Múltiplos `rounded-2xl border` + cores semânticas |
| `DevTools` | `features/shared/DevTools.tsx` | Ferramentas de desenvolvimento | `mode`: `passenger` \| `driver` | `rounded-lg border bg-muted`, botões `rounded-lg` com cores semânticas |

### Mapas

| Nome | Localização | Função | Variantes | Classes / notas |
|------|-------------|--------|-----------|-------------------|
| `MapView` | `maps/MapView.tsx` | Mapa MapLibre, rota, overlays | `showMap`, modo planeamento, geometrias | `rounded-2xl shadow-card bg-card`, altura `45vh` clamp |
| `PassengerMarker` | `maps/PassengerMarker.tsx` | Pin passageiro / selecção | `colorClassName` opcional | `rounded-full ring-4 shadow-floating`, `animate-ping` |
| `DriverMarker` | `maps/DriverMarker.tsx` | Pin motorista | `colorClassName` opcional | `rounded-full ring-4 shadow-floating` |
| `RouteLine` | `maps/RouteLine.tsx` | Linha de rota GeoJSON | — | (camada MapLibre) |

### Autenticação

| Nome | Localização | Função | Variantes | Classes principais |
|------|-------------|--------|-----------|-------------------|
| `LoginScreen` | `features/auth/LoginScreen.tsx` | Login BETA com selector papel | Links passageiro/motorista | `max-w-sm bg-card rounded-2xl shadow-card p-6`, inputs `rounded-xl` |

### Motorista

| Nome | Localização | Função | Variantes | Classes principais |
|------|-------------|--------|-----------|-------------------|
| `Toggle` | `components/ui/Toggle.tsx` | Disponível / Offline | `onLabel` / `offLabel` | `h-12 w-20 rounded-full`, knob branco `shadow-card` |
| `DriverDashboard` | `features/driver/DriverDashboard.tsx` | Dashboard + lista pedidos, histórico, mapa | — | Alinhado a `ScreenContainer`, `StatusHeader`, `RequestCard`, `TripCard`, avisos `warning` |

### Passageiro

| Nome | Localização | Função | Variantes | Classes principais |
|------|-------------|--------|-----------|-------------------|
| `PassengerDashboard` | `features/passenger/PassengerDashboard.tsx` | Orquestra mapa, painel, cartão estado, histórico | — | `text-2xl` título secção, `space-y-6` |

### Admin

| Nome | Localização | Função | Variantes | Classes principais |
|------|-------------|--------|-----------|-------------------|
| `AdminDashboard` | `features/admin/AdminDashboard.tsx` | Tabs, listas, métricas, operações, saúde | Tabs: `pending`, `users`, `trips`, `metrics`, `ops`, `health` | `max-w-2xl mx-auto p-4`, cartões `bg-muted rounded-lg`, botões `px-2 py-1 text-xs rounded` |

### Debug

| Nome | Localização | Função | Variantes | Classes principais |
|------|-------------|--------|-----------|-------------------|
| `DebugMapPage` | `features/debug/DebugMapPage.tsx` | Mapa com coords fixas | — | `p-4 space-y-4`, `text-xl font-bold` |

### `components/ui/*` (shadcn / utilitários)

| Nome | Ficheiro | Função | Variantes | Uso observado na app |
|------|----------|--------|-----------|----------------------|
| `Button` | `button.tsx` | Botão CVA | `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`; tamanhos `default`, `sm`, `lg`, `icon` | `SettingsButton` trigger; base para outros primitives |
| `Dialog` | `dialog.tsx` | Modal centrado | Overlay + conteúdo `z-50` | Definições mobile |
| `Sheet` | `sheet.tsx` | Painel lateral / fundo | Overlay `z-50`, conteúdo `z-[60]` | Definições desktop |
| `AlertDialog` | `alert-dialog.tsx` | Diálogo de alerta | `z-50` | Sem import directo nas features listadas (disponível) |
| `Spinner` | `Spinner.tsx` | Indicador circular | `sm`, `md`, `lg` | Passageiro, painel, loading shell |
| `sonner` `Toaster` | `sonner.tsx` | Toasts | Tema derivado de `data-theme` | `App.tsx` |
| `Toggle` | `Toggle.tsx` | Grande switch | — | Motorista |
| `card`, `input`, `badge`, `tabs`, `progress`, `avatar` | ficheiros homónimos | Primitives shadcn | CVA / variantes | **Nenhuma importação encontrada** em `features/` ou `routes/` para estes ficheiros (excepto ecossistema interno `alert-dialog` → `buttonVariants`) |

---

## 3. Tokens visuais em uso

### 3.1 Cores `--color-*` (por ficheiro de tema)

**Ficheiros:** `design-system/themes/portugal.css`, `portugal-dark.css`, `minimal.css`, `neon.css`.

| Token | portugal | portugal-dark | minimal | neon |
|-------|----------|---------------|---------|------|
| `--color-primary` | ✓ | ✓ | ✓ | ✓ |
| `--color-primary-foreground` | ✓ | ✓ | ✓ | ✓ |
| `--color-accent` | ✓ | ✓ | ✓ | ✓ |
| `--color-accent-foreground` | ✓ | ✓ | ✓ | ✓ |
| `--color-secondary` | ✓ | **não definido** | **não definido** | **não definido** |
| `--color-secondary-foreground` | ✓ | **não definido** | **não definido** | **não definido** |
| `--color-danger` | ✓ | ✓ | ✓ | ✓ |
| `--color-destructive` | ✓ | ✓ | ✓ | ✓ |
| `--color-destructive-foreground` | ✓ | ✓ | ✓ | ✓ |
| `--color-background` | ✓ | ✓ | ✓ | ✓ |
| `--color-foreground` | ✓ | ✓ | ✓ | ✓ |
| `--color-surface` | ✓ | ✓ | ✓ | ✓ |
| `--color-card` | ✓ | ✓ | ✓ | ✓ |
| `--color-card-foreground` | ✓ | ✓ | ✓ | ✓ |
| `--color-text` | ✓ | ✓ | ✓ | ✓ |
| `--color-muted` | ✓ | ✓ | ✓ | ✓ |
| `--color-muted-foreground` | ✓ | ✓ | ✓ | ✓ |
| `--color-success` | ✓ | ✓ | ✓ | ✓ |
| `--color-success-foreground` | ✓ | ✓ | ✓ | ✓ |
| `--color-warning` | ✓ | ✓ | ✓ | ✓ |
| `--color-warning-foreground` | ✓ | ✓ | ✓ | ✓ |
| `--color-info` | ✓ | ✓ | ✓ | ✓ |
| `--color-info-foreground` | ✓ | ✓ | ✓ | ✓ |
| `--color-surface-raised` | ✓ | ✓ | ✓ | ✓ |
| `--color-surface-overlay` | ✓ | ✓ | ✓ | ✓ |
| `--color-border` | ✓ | ✓ | ✓ | ✓ |
| `--color-input` | ✓ | ✓ | ✓ | ✓ |
| `--color-ring` | ✓ | ✓ | ✓ | ✓ |
| `--color-popover` | ✓ | ✓ | ✓ | ✓ |
| `--color-popover-foreground` | ✓ | ✓ | ✓ | ✓ |

**Tailwind** (`tailwind.config.js`): mapeia `primary`, `secondary` (com fallback para `muted` / `muted-foreground` se `--color-secondary` ausente), `destructive`, `muted`, `accent`, `popover`, `card`, `success`, `warning`, `info`, `surface.raised`, `surface.overlay`, `border`, `input`, `ring`, `background`, `foreground`.

**Atmosfera (não são `--color-*` mas afectam fundo):**

- `--bg-atmo-mid`, `--bg-atmo-shape`: **portugal**, **portugal-dark**, **minimal**, **neon** (valores por tema).
- `index.css` `body::before` usa `--bg-atmo-mid` com fallback `--color-muted`; `body::after` usa `--bg-atmo-shape` com fallback `--color-primary` a 8% opacidade.

### 3.2 Sombras

| Token / classe | Definição | Onde aparece |
|----------------|-----------|--------------|
| `--shadow-card` | `0 6px 18px rgba(0,0,0,0.08)` | `tokens.css` → Tailwind `shadow-card` |
| `--shadow-floating` | `0 14px 36px rgba(0,0,0,0.16)` | `shadow-floating` em `PrimaryActionButton`, `RequestCard`, marcadores, `Toggle` knob |
| `shadow` (Tailwind default) | — | `ThemeSelector` opção activa, `button` default variant |
| `shadow-sm` | — | variantes `button` outline/destructive |
| `shadow-lg` | — | `Dialog`/`Sheet`/`AlertDialog` conteúdo, `sonner` toast |

### 3.3 Radius

| Token | Valor |
|-------|--------|
| `--radius-base` | `1rem` → mapeado em Tailwind como `rounded-xl` (extend `borderRadius.xl`) |
| `--radius-large` | `1.5rem` → `rounded-2xl` |

**Uso frequente em componentes:** `rounded-2xl` (cartões, mapa, painéis), `rounded-xl` (botões painel, login, selectors), `rounded-full` (CTAs primários circulares, spinners, toggles), `rounded-lg` (admin, DevTools, alguns botões), `rounded-md` (shadcn `Button` base).

---

## 4. Layout e spacing

### Padrões repetidos

- **Shell:** `px-4 py-3` no header; `main` sem padding extra — padding vem dos dashboards.
- **ScreenContainer:** `px-5 pt-6 pb-4`; `pb-20` quando há botão inferior; `pb-8` sem botão; barra fixa `px-5 py-4` + `safe-area-pb`.
- **Secções passageiro/motorista:** `mb-6` no header interno; `space-y-6` bloco principal passageiro; `mt-6` após avisos.
- **Gaps:** `gap-2`, `gap-3`, `gap-4` em flex; `space-y-2` / `space-y-3` / `space-y-4` em colunas.
- **Largura máxima:** shell `max-w-md md:max-w-5xl mx-auto`; `ScreenContainer` `max-w-md`; login `max-w-sm`; admin `max-w-2xl`; `TripCard` não fixa max-width; `MapView` altura `min-h-[220px] max-h-[420px]` com `45vh`.
- **Alturas mínimas:** `PrimaryActionButton` / ACEITAR `min-h-[52px]`; `RoleSelector` links `min-h-[36px]`; `Toggle` track `h-12`.
- **Mapa:** `45vh` com limites 220–420px.

---

## 5. Z-index e camadas

| Valor | Componente / elemento | Contexto |
|-------|----------------------|----------|
| `-3` | `body::before` | Gradiente de fundo |
| `-2` | `body::after` | Blob radial |
| `-1` | `#bg-noise` | Ruído SVG |
| `10` | Header sticky `routes/index.tsx` | Barra superior app |
| `20` | `ScreenContainer` barra inferior | CTA fixo passageiro/motorista |
| `50` | `Dialog` overlay e conteúdo; `Sheet` overlay; `AlertDialog` overlay e conteúdo | Modais |
| `60` | `SheetContent` (classe base em `sheet.tsx`) | Painel sheet acima do overlay 50 |

**Mapa conceptual:**  
`base (conteúdo scroll)` → `z-10` header → `z-20` barra inferior fixa → `z-50` overlays/modais → `z-[60]` conteúdo do sheet.

**MapView:** overlay interno `absolute inset-0` sem z-index (empilhamento dentro do `relative` do frame). Marcadores são layers do mapa, não competem com o stack da app.

---

## 6. Estados visuais (TripPlannerPanel + referência)

Tabela focada nos **`PassengerUIState`** do `TripPlannerPanel` (`idle` | `planning` | `confirming` | `searching` | `in_trip`).

| Estado | Cor dominante percebida | Background / superfície | Destaque | Diferenças visuais reais |
|--------|-------------------------|-------------------------|----------|---------------------------|
| `idle` | `foreground` / `primary` no CTA | `bg-card border-border` (ramo painel) | Médio-alto no botão “Escolher no mapa” | Título `text-lg font-semibold`; subtítulo `text-sm muted`; um botão `bg-primary`. |
| `planning` | `foreground` + labels | `border-border/90 bg-muted/50 dark:bg-zinc-950/50 shadow-inner` | Médio | Labels `text-sm font-semibold`; endereços `text-base font-medium`; botões outline/muted “Definir destino” / “Repor”. |
| `confirming` | `primary` nos CTAs | Mesmo ramo “planning” que activa `panelSurface` | Médio-alto em “Confirmar” | Bloco “De/Para” `text-sm`; meta rota `text-sm text-foreground/80`; dois botões (primário + repor). |
| `searching` | `foreground` + `primary` no spinner | `bg-card` quando não em ramo planning (superfície base do painel) | Alto no `Spinner` + texto | `Spinner size="lg"`; título `text-base font-medium`; subtítulo `text-sm muted`; centrado vertical. |
| `in_trip` | `muted` + `foreground` | `bg-card` | Baixo-médio | `text-base font-semibold` título; estado API em `text-sm`; nota `text-xs muted`. |

**Nota:** O `StatusHeader` global vem de `getPassengerBannerState` (`passengerBanner.ts`) e usa variantes próprias (`StatusHeader`); não duplica o painel mas alinha texto de alto nível com o fluxo.

---

## 7. Tipografia real

### Família e base

- **Fonte:** `Plus Jakarta Sans` (+ Inter fallback) em `:root` (`index.css`); `line-height: 1.5`; `font-weight: 400` base.

### Tamanhos (por uso)

| Classe / padrão | Onde |
|-----------------|------|
| `text-[9px]` | Labels “Vista”, “Estado” no `ActivityPanel` |
| `text-[10px]` | Log, timestamps, botões copiar/limpar, mono log |
| `text-xs` | Labels uppercase em `TripCard`/`RequestCard`, notas login, badges admin, `TripPlannerPanel` linha auxiliar `in_trip` |
| `text-sm` | Subtítulos dashboards, links header, muitos botões secundários, `RoleSelector`, erro login, confirmação De/Para |
| `text-base` | Corpo moradas no planeamento, preços em contexto, estimativa passageiro, alguns títulos de estado |
| `text-lg` | Título idle `TripPlannerPanel`; títulos em `PassengerStatusCard` (alguns estados) |
| `text-xl` | `StatusHeader`; título `DebugMapPage` |
| `text-2xl` | Preço em `TripCard`/`RequestCard`; títulos “Passageiro” / “Motorista” |

### Pesos

- `font-bold`: preços grandes, títulos H1 dashboards, login title.
- `font-semibold`: `StatusHeader`, títulos de secção, moradas em cartões, botões primários do painel.
- `font-medium`: labels, texto intermédio, histórico.

### Classificação por função

- **Títulos:** `text-2xl`/`text-xl`/`text-lg` + bold/semibold em headers e `StatusHeader`.
- **Informação:** `text-base` em moradas e corpo de cartões.
- **Meta (km, min, preço secundário):** `text-sm` com opacidade (`text-foreground/80`, `text-foreground/75`).
- **Auxiliar:** `text-xs`, `text-sm text-muted-foreground`, `text-[9px]`–`text-[10px]` no painel de actividade.

---

## 8. Dark mode / themes

### Mecanismo

- `document.documentElement` attribute `data-theme`: `portugal` | `portugal-dark` | `minimal` | `neon` (`useTheme.ts`, `initTheme`).
- **Tailwind `darkMode`:** `["class", '[data-theme*="dark"]']` — activa variantes `dark:` quando o tema contém `"dark"` (ex.: `portugal-dark`).

### Portugal vs Portugal Dark

- **portugal:** fundo claro quente (`--color-background` 45 25% 97%); `--color-secondary` explícito; `--bg-atmo-mid/shape` alinhados a paleta clara.
- **portugal-dark:** fundo azul escuro (`--color-background` 222 47% 8%); sem `--color-secondary` no ficheiro; `--bg-atmo-mid/shape` escuros; texto `--color-text` quase branco.

### Minimal

- Neutro claro; `--bg-atmo-*` cinza; sem `--color-secondary` no ficheiro.

### Neon

- Fundo muito escuro saturado; primário magenta (`280 100% 60%`); bordas e inputs com matiz roxo; `--bg-atmo-shape` magenta.
- **Toasts (`sonner.tsx`):** `data-theme === "neon"` tratado como tema **“dark”** para o pacote Sonner (`getToastTheme`), independentemente do `dark:` do Tailwind.

### Diferenças transversais por tema

- Trocam todas as variáveis `--color-*` listadas nos ficheiros de tema + `--bg-atmo-mid` / `--bg-atmo-shape`.
- Sombras CSS globais (`--shadow-card`, `--shadow-floating`) são **iguais** em `tokens.css` para todos os temas (valores RGBA fixos).

---

## 9. Padrões de interacção

| Estado | Classes / padrão | Comportamento visual observado |
|--------|------------------|--------------------------------|
| **Hover** | `hover:opacity-95` (CTAs painel/login); `hover:scale-[1.02]` (RoleSelector, Login links, Settings); `hover:shadow-floating` em `TripCard`; `hover:text-foreground` em links muted; `hover:bg-muted`, `hover:bg-accent` | Elevação, escala ligeira ou troca de cor. |
| **Active** | `active:scale-[0.98]` (links, settings); `active:scale-95` (`PrimaryActionButton`, `RequestCard`) | Compressão momentânea. |
| **Disabled** | `disabled:opacity-50`, `disabled:pointer-events-none`, `disabled:hover:scale-100` em botões CVA e primários | Opacidade reduzida; sem hover scale onde especificado. |
| **Loading** | `PrimaryActionButton`: spinner `border-white`, texto “A processar…”; `RequestCard`: spinner `border-current`; `LoginScreen`: texto “A entrar…” + `disabled`; `Spinner` component | Spinners circulares; opacidade extra em `PrimaryActionButton` quando `loading`. |

---

## 10. Mobile vs desktop

| Aspecto | Comportamento |
|---------|----------------|
| **Largura shell** | `max-w-md` por defeito; `md:max-w-5xl` para área mais larga. |
| **Layout principal** | `flex-col` por defeito; `md:flex-row` — `main` + `ActivityPanel` lado a lado em ecrã ≥ md. |
| **ActivityPanel** | Largura total + `border-t` em mobile; `md:w-80`, `border-l`, altura `md:h-[calc(100dvh-4rem)]` em desktop. |
| **Settings** | `<640px`: `Dialog`; `≥640px`: `Sheet` lateral inferior (`side="bottom"`). |
| **Dialog/Sheet** | Radix: `sm:rounded-lg` em diálogos (breakpoint Tailwind `sm`). |
| **Mapa** | Mesma altura relativa; sem breakpoint específico no `MapView` para tamanho. |
| **Elementos “escondidos”** | Não há `hidden md:block` generalizado; o painel de actividade passa de stack vertical a coluna. |
| **Safe area** | `safe-area-pb` na barra inferior e no `SheetContent` definições. |

---

## 11. Densidade de informação

| Área | Observação |
|------|------------|
| `ActivityPanel` | Muito alta: timestamps + mensagens em `text-[10px]`, mono; risco de muitas linhas; scroll interno. |
| `TripCard` / `RequestCard` | Média: poucas linhas por cartão; preço grande domina. |
| `TripPlannerPanel` | Média: até duas moradas + meta + botões; `confirming` mais denso. |
| `AdminDashboard` | Alta em tabs com listas + `pre` e grelhas de métricas; overflow tratado com `overflow-x-auto` / `max-h` em blocos. |
| `PassengerStatusCard` + histórico | Média; histórico é lista linear com truncamento implícito só por texto. |

---

## 12. Consistência entre roles

### Componentes comuns

- Shell `routes/index.tsx` (header, `ActivityPanel`, `RoleSelector`, `SettingsButton`).
- `ScreenContainer` + `StatusHeader` + `PrimaryActionButton` + `MapView` + `TripCard` + aviso geo + `DevTools`.
- Tokens e temas globais.

### Diferenças visuais

- **Passageiro:** `TripPlannerPanel`, `PassengerStatusCard`, fluxo de estados rico; título “Passageiro”.
- **Motorista:** `Toggle` offline, `RequestCard`, lista de pedidos; título “Motorista”; sem `TripPlannerPanel`.
- **Admin:** Sem `ScreenContainer`; layout `p-4 max-w-2xl`; pestanas horizontais scrolláveis; muitos controlos `text-xs` e fundos `bg-muted`; não usa `StatusHeader`/`MapView` no mesmo padrão dos outros papéis.

---

## 13. Inconsistências visuais (observação apenas)

- **`StatusHeader`:** comentário no ficheiro menciona “assigned→blue”; o código usa `bg-primary` para `assigned` (e outros), não uma cor “blue” Tailwind separada.
- **`--color-secondary`:** só em `portugal.css`; noutros temas o Tailwind usa fallback `muted` / `muted-foreground` para `secondary` — aparência de `secondary` varia por tema sem variável dedicada.
- **Sucesso no log:** `ActivityPanel` usa `text-green-600` para `success` em vez de `text-success` ou token semântico.
- **Botões primários:** mistura de `rounded-full` + gradiente (`PrimaryActionButton`, `RequestCard`) vs `rounded-xl` + `bg-primary` sólido (`TripPlannerPanel`, `LoginScreen`).
- **Shadcn `Button`:** `rounded-md` por defeito vs maior parte dos CTAs de domínio com `rounded-xl` ou `rounded-full`.
- **`TripPlannerPanel`:** uso explícito de `dark:bg-zinc-950/50` para planeamento — cor Zinc fixa, não variável do tema.
- **Marcadores mapa:** cores Tailwind fixas (`amber`, `emerald`, roxo na linha OSRM) independentes de `data-theme`.
- **Sombras:** tokens globais não adaptam luminância ao tema escuro (mesmo RGBA).
- **Toasts:** lógica “dark” inclui `neon` no Sonner, mas `neon` não activa `dark:` do Tailwind pelo selector `data-theme*="dark"`.
- **Primitives UI:** `card`, `input`, `badge`, `tabs`, `progress`, `avatar` existem em `components/ui/` sem uso directo nas features mapeadas — duplicação potencial de padrões visuais com inputs “raw” no `LoginScreen`.

---

*Fim do documento. Base: leitura de `web-app/src` (ficheiros listados e greps associados).*
