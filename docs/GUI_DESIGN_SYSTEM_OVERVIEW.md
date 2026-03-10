## TVDE Web App – Guia de Interface & Design System

Este documento descreve o estado atual do GUI da TVDE Web App após o refinamento recente do design system (tipografia, fundo atmosférico, botões primários, cards, header, ActivityPanel e StatusHeader), com exemplos de código e parâmetros relevantes.

---

## 1. Tipografia & Base Global

### 1.1. Fonte principal

A fonte principal é **Plus Jakarta Sans**, carregada via Google Fonts em `index.html`:

```html
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0, viewport-fit=cover"
  />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
    rel="stylesheet"
  />
  <title>TVDE Web App</title>
</head>
```

Configuração global em `index.css`:

```css
@layer base {
  :root {
    font-family: "Plus Jakarta Sans", Inter, system-ui, sans-serif;
    line-height: 1.5;
    font-weight: 400;
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
```

### 1.2. Tamanhos de texto em inputs (fix Android zoom)

Regra geral: **inputs com `text-base` (~16px)** para evitar auto‑zoom no Android.

Exemplos:

```tsx
// LoginScreen – input de telefone
<input
  type="tel"
  className="w-full px-3 py-2 border border-input rounded-xl bg-background text-base focus:ring-2 focus:ring-ring focus:border-transparent"
/>

// AdminDashboard – edição de nickname / telefone
<input
  type="text"
  className="w-full px-3 py-2 border rounded-lg text-base"
/>
<input
  type="tel"
  className="w-full px-3 py-2 border rounded-lg text-base"
/>
```

Componente `Input` genérico:

```tsx
// src/components/ui/input.tsx (essencial)
<input
  className={cn(
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
    className
  )}
/>
```

---

## 2. Layout & Viewport (vh → dvh)

O objetivo foi alinhar o layout com **viewports modernos (`dvh`)**, evitando cortes em mobile (barras de navegação, etc.).

### 2.1. Root container

```css
/* App.css */
#root {
  min-height: 100dvh;
}
```

### 2.2. Body

```css
@layer base {
  body {
    margin: 0;
    min-width: 320px;
    min-height: 100dvh;
    background: hsl(var(--color-background));
    color: hsl(var(--color-text));
    position: relative;
    overflow-x: hidden;
  }
}
```

### 2.3. Rotas principais

```tsx
// src/routes/index.tsx – loading e layout
if (isLoading) {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background">
      <p className="text-muted-foreground text-base">A carregar...</p>
    </div>
  )
}

return (
  <div className="min-h-dvh bg-background flex flex-col w-full max-w-md md:max-w-5xl mx-auto">
    {/* ... */}
  </div>
)
```

### 2.4. ScreenContainer

```tsx
// src/components/layout/ScreenContainer.tsx (essencial)
export function ScreenContainer({ children, bottomButton }: ScreenContainerProps) {
  return (
    <div className="min-h-dvh flex flex-col max-w-md mx-auto w-full bg-background">
      <div
        className={cn(
          "flex-1 flex flex-col px-5 py-6 overflow-y-auto",
          bottomButton ? "pb-24" : "pb-8",
        )}
      >
        {children}
      </div>
      {bottomButton && (
        <div className="px-5 pb-5 pt-3 safe-area-pb">
          {bottomButton}
        </div>
      )}
    </div>
  )
}
```

---

## 3. Fundo Atmosférico (Gradiente, Forma Orgânica, Ruído)

### 3.1. Gradiente diagonal

```css
/* index.css – dentro de @layer base */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -3;
  background: linear-gradient(
    135deg,
    hsl(var(--color-background)) 0%,
    hsl(var(--bg-atmo-mid, var(--color-muted))) 38%,
    hsl(var(--color-background)) 100%
  );
  pointer-events: none;
}
```

### 3.2. Textura de ruído

Elemento dedicado em `index.html`:

```html
<body>
  <div id="bg-noise" aria-hidden="true"></div>
  <div id="root"></div>
  <!-- ... -->
</body>
```

CSS:

```css
#bg-noise {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: 0.015; /* ~1.5% */
}
```

### 3.3. Forma orgânica (blob)

```css
body::after {
  content: "";
  position: fixed;
  bottom: -10%;
  right: -15%;
  width: 70%;
  height: 60%;
  z-index: -2;
  background: radial-gradient(
    ellipse at 70% 80%,
    hsl(var(--bg-atmo-shape, var(--color-primary)) / 0.08) 0%,
    transparent 70%
  );
  pointer-events: none;
}
```

---

## 4. Tokens de Tema para Fundo Atmosférico

Foram introduzidos dois novos tokens por tema:

- `--bg-atmo-mid` – cor intermédia do gradiente (38%)
- `--bg-atmo-shape` – cor base do blob orgânico

### 4.1. Tema Portugal

```css
/* src/design-system/themes/portugal.css */
:root,
:root[data-theme="portugal"] {
  /* ...existing tokens... */
  --color-popover: 0 0% 100%;
  --color-popover-foreground: 222 40% 15%;

  --bg-atmo-mid: 45 30% 94%;
  --bg-atmo-shape: 120 45% 38%;
}
```

### 4.2. Tema Portugal Dark

```css
/* src/design-system/themes/portugal-dark.css */
:root[data-theme="portugal-dark"] {
  /* ...existing tokens... */
  --color-popover: 222 47% 12%;
  --color-popover-foreground: 0 0% 98%;

  --bg-atmo-mid: 222 47% 15%;
  --bg-atmo-shape: 150 55% 42%;
}
```

### 4.3. Tema Minimal

```css
/* src/design-system/themes/minimal.css */
:root[data-theme="minimal"] {
  /* ...existing tokens... */
  --color-popover: 0 0% 100%;
  --color-popover-foreground: 220 14% 10%;

  --bg-atmo-mid: 220 14% 96%;
  --bg-atmo-shape: 220 14% 30%;
}
```

### 4.4. Tema Neon

```css
/* src/design-system/themes/neon.css */
:root[data-theme="neon"] {
  /* ...existing tokens... */
  --color-popover: 240 10% 10%;
  --color-popover-foreground: 0 0% 98%;

  --bg-atmo-mid: 240 10% 15%;
  --bg-atmo-shape: 280 100% 60%;
}
```

---

## 5. Botão Primário & Ações Principais

### 5.1. Componente `PrimaryActionButton`

Props:

- `children: ReactNode`
- `onClick: () => void`
- `disabled?: boolean`
- `loading?: boolean`
- `variant?: 'primary' | 'danger'`

Implementação visual:

```tsx
// src/components/layout/PrimaryActionButton.tsx (essencial)
const base =
  "w-full min-h-[52px] rounded-full font-bold text-lg shadow-floating hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100"

const styles =
  variant === "danger"
    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
    : "bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-primary/95 hover:to-accent/95"

return (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || loading}
    className={`${base} ${styles} ${loading ? "opacity-80" : ""}`}
  >
    {loading ? (
      <span className="inline-flex items-center justify-center gap-2">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        A processar...
      </span>
    ) : (
      children
    )}
  </button>
)
```

Padrões:

- Altura mínima: **52px**
- `rounded-full` (pill)
- Gradiente `from-primary` → `to-accent` para **variant `primary`**
- Micro‑interações: `hover:scale-[1.02]`, `active:scale-[0.98]`

### 5.2. Botão ACEITAR (RequestCard)

```tsx
// src/components/cards/RequestCard.tsx (essencial)
<button
  type="button"
  onClick={onAccept}
  disabled={loading}
  className="min-h-[52px] px-6 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold text-lg shadow-floating hover:from-primary/95 hover:to-accent/95 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
>
  {/* ... */}
</button>
```

---

## 6. Cards – TripCard & RequestCard

### 6.1. Container visual comum

Ambos os cards partilham estes elementos:

- `rounded-2xl`
- `border border-border`
- `bg-card/95` com `backdrop-blur-sm` (para legibilidade sobre o fundo atmosférico)
- `shadow-card` com `hover:shadow-floating`

```tsx
// src/components/cards/TripCard.tsx
<div className="rounded-2xl border border-border bg-card/95 backdrop-blur-sm p-4 space-y-2 shadow-card hover:shadow-floating transition-all duration-200">
  {/* ...conteúdo... */}
</div>

// src/components/cards/RequestCard.tsx
<div className="rounded-2xl border border-border bg-card/95 backdrop-blur-sm p-4 space-y-2 shadow-card hover:shadow-floating transition-all duration-200">
  {/* ...conteúdo... */}
</div>
```

### 6.2. Tipografia interna

Padrões:

- Labels de secção: `text-xs font-medium uppercase tracking-wide text-muted-foreground`
- Valores principais: `text-base` ou `text-lg`, `font-semibold`, `text-foreground`
- Preço: `text-2xl font-bold text-foreground`

---

## 7. Header – Integração com Fundo

O header é **sticky** e semi‑transparente, com blur, integrando‑se com o fundo atmosférico.

```tsx
// src/routes/index.tsx – header principal
<header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/80 shrink-0">
  <div className="flex justify-between items-center px-4 py-3 gap-2">
    <h1 className="text-lg font-bold text-foreground">TVDE</h1>
    {/* ações: Log, Sair, Settings, RoleSelector */}
  </div>
</header>
```

---

## 8. ActivityPanel – Tuning de Hierarquia & Densidade

Objetivos:

- Reduzir ruído visual
- Dar foco ao conteúdo principal (mensagens) com tipografia mais pequena e bordas mais leves

### 8.1. Container

```tsx
// src/components/ActivityPanel.tsx (essencial)
<aside
  id="activity-log-panel"
  className="w-full md:w-80 shrink-0 bg-card/90 backdrop-blur-sm border-t md:border-t-0 md:border-l border-border/40 flex flex-col min-h-[200px] md:min-h-0 md:h-[calc(100dvh-4rem)]"
>
  {/* ... */}
</aside>
```

### 8.2. Vista + Live

```tsx
<div className="p-2.5 bg-muted/20 border-b border-border/40 flex justify-between items-center">
  <div>
    <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">
      Vista
    </div>
    <div className="text-xs font-medium text-muted-foreground capitalize">
      {role}
    </div>
  </div>
  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
    Ao vivo
  </div>
</div>
```

### 8.3. Estado & Log

```tsx
// Secção Estado
<div className="p-2.5 bg-muted/15 border-b border-border/40">
  <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">
    Estado
  </div>
  <div className="text-xs font-medium text-muted-foreground">{status}</div>
</div>

// Cabeçalho Registo
<div className="flex justify-between items-center px-2.5 py-1.5 border-b border-border/40">
  <span className="text-muted-foreground text-[10px] font-medium">Registo</span>
  {/* Copy / Clear */}
</div>

// Lista
<div className="flex-1 overflow-y-auto p-2 font-mono text-[10px] text-muted-foreground">
  {/* linhas do log */}
</div>
```

### 8.4. Linhas do log

```tsx
function LogLine({ entry }: { entry: LogEntry }) {
  return (
    <div className="flex gap-2 py-0.5 border-b border-border/40 last:border-0 text-[10px] leading-tight">
      <span className="text-muted-foreground shrink-0">
        {formatTime(entry.ts)}
      </span>
      <span className={LOG_COLORS[entry.type]}>{entry.msg}</span>
    </div>
  )
}
```

---

## 9. StatusHeader – Badges com Transições Suaves

### 9.1. Variantes de estado

```ts
export type StatusVariant =
  | "requested"
  | "assigned"
  | "accepted"
  | "arriving"
  | "ongoing"
  | "completed"
  | "idle"
  | "error"

const VARIANT_STYLES: Record<StatusVariant, string> = {
  requested: "bg-amber-50 text-amber-900 border-amber-200",
  assigned: "bg-blue-50 text-blue-900 border-blue-200",
  accepted: "bg-emerald-50 text-emerald-900 border-emerald-200",
  arriving: "bg-emerald-50 text-emerald-900 border-emerald-200",
  ongoing: "bg-violet-50 text-violet-900 border-violet-200",
  completed: "bg-slate-100 text-slate-800 border-slate-300",
  idle: "bg-slate-50 text-slate-600 border-slate-200",
  error: "bg-red-50 text-red-900 border-red-200",
}
```

### 9.2. Componente

```tsx
export function StatusHeader({ label, variant = "idle" }: StatusHeaderProps) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 text-center text-xl font-semibold mb-6 transition-colors duration-300 ${VARIANT_STYLES[variant]}`}
      role="status"
    >
      {label}
    </div>
  )
}
```

As transições de estado (ex.: `requested` → `accepted` → `ongoing`) passam agora por `transition-colors duration-300`, evitando saltos bruscos de cor.

---

## 10. Resumo Técnico do que está Consolidado

- **Tipografia**
  - Fonte principal: **Plus Jakarta Sans**, com fallback para `Inter` e `system-ui`.
  - Inputs críticos com `text-base` para evitar auto‑zoom em Android.

- **Layout**
  - Uso consistente de `min-h-dvh` em root, login, rotas e `ScreenContainer`.
  - `safe-area-pb` para botões fixos em mobile.

- **Fundo atmosférico**
  - Gradiente diagonal com stops (0%, 38%, 100%).
  - Blob orgânico configurável via `--bg-atmo-shape`.
  - Ruído subtil via SVG embed (`feTurbulence`), ~1.5% de opacidade.

- **Temas**
  - Novos tokens `--bg-atmo-mid` e `--bg-atmo-shape` para cada tema (Portugal, Portugal Dark, Minimal, Neon).

- **Ações primárias**
  - `PrimaryActionButton` e botão `ACEITAR` com gradiente `primary → accent`, `rounded-full`, alta saliência e micro‑interações.

- **Cards**
  - `TripCard` e `RequestCard` com `rounded-2xl`, `shadow-card`, `hover:shadow-floating`, `bg-card/95` + `backdrop-blur-sm` para legibilidade sobre o fundo.

- **Header**
  - `bg-background/80` + `backdrop-blur-md` + `border-border/80` para integração subtil com o fundo.

- **ActivityPanel**
  - Tipografia reduzida (`10–11px`), cores mais neutras, bordas mais leves, fundo semi‑transparente com blur.

- **StatusHeader**
  - Paleta de badges por estado com transições suaves (`transition-colors`).

