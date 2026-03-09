# Technical UI Snapshot — TVDE Web App

Concise technical snapshot of the current UI implementation after design refinement. For external UI review.

---

## 1. Main layout components

| Component | Role | Used in |
|-----------|------|---------|
| **Header** | Sticky app bar: logo, Log link, Sair (beta), SettingsButton, RoleSelector | `routes/index.tsx` (inline) |
| **ScreenContainer** | Mobile-first wrapper for dashboard content; optional fixed bottom button slot | PassengerDashboard, DriverDashboard |
| **ActivityPanel** | Sidebar (desktop) / bottom (mobile): Vista, Estado, Registo (logs) | `routes/index.tsx` (aside) |
| **Main** | Scrollable area for route content (PassengerDashboard, DriverDashboard, AdminDashboard) | `routes/index.tsx` |
| **Bottom primary button** | Fixed bar at bottom when there is a primary action | ScreenContainer `bottomButton` prop |

**Root layout (authenticated):**

- Wrapper: `min-h-screen bg-background flex flex-col w-full max-w-md md:max-w-5xl mx-auto`
- Header: `sticky top-0 z-10 bg-background border-b border-border shrink-0`
- Content row: `flex flex-1 min-h-0 flex-col md:flex-row`
- Main: `flex-1 overflow-y-auto min-h-0 min-w-0`

---

## 2. Tailwind classes by component

### PrimaryActionButton

**Base (shared):**

```
w-full min-h-[52px] rounded-2xl font-bold text-lg shadow-floating
hover:scale-[1.02] active:scale-[0.98] transition-all duration-200
disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100
```

**Variant primary:**

```
bg-primary text-primary-foreground hover:bg-primary/90
```

**Variant danger:**

```
bg-destructive text-destructive-foreground hover:bg-destructive/90
```

**Loading state (inner span):**

```
inline-flex items-center justify-center gap-2
```

**Loading spinner (inner span):**

```
h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent
```

---

### StatusHeader

**Container:**

```
rounded-2xl border px-4 py-4 text-center text-xl font-semibold mb-6
```

**Variant-specific (concatenated):**

| Variant   | Classes |
|-----------|---------|
| requested | `bg-amber-50 text-amber-900 border-amber-200` |
| assigned  | `bg-blue-50 text-blue-900 border-blue-200` |
| accepted  | `bg-emerald-50 text-emerald-900 border-emerald-200` |
| arriving  | `bg-emerald-50 text-emerald-900 border-emerald-200` |
| ongoing   | `bg-violet-50 text-violet-900 border-violet-200` |
| completed | `bg-slate-100 text-slate-800 border-slate-300` |
| idle      | `bg-slate-50 text-slate-600 border-slate-200` |
| error     | `bg-red-50 text-red-900 border-red-200` |

---

### TripCard

**Card container:**

```
rounded-2xl border border-border bg-card p-4 space-y-2
shadow-card hover:shadow-floating transition-all duration-200
```

**Section (origem/destino):**

```
space-y-0.5
```

**Label (Origem / Destino):**

```
text-xs font-medium uppercase tracking-wide text-muted-foreground
```

**Value (pickup / destination):**

```
text-base font-semibold text-foreground
```

**Driver line:**

```
text-sm text-muted-foreground
```

**Price row:**

```
flex items-center justify-between pt-3 border-t border-border
```

**Price value:**

```
text-2xl font-bold text-foreground
```

---

### RequestCard

**Card container:**

```
rounded-2xl border border-border bg-card p-4 space-y-2
shadow-card hover:shadow-floating transition-all duration-200
```

**Recolha section:**

```
space-y-0.5
```

**Label (Recolha):**

```
text-xs font-medium uppercase tracking-wide text-muted-foreground
```

**Pickup value:**

```
text-lg font-semibold text-foreground
```

**Price + button row:**

```
flex items-center justify-between gap-4 pt-2
```

**Price:**

```
text-2xl font-bold text-foreground
```

**ACEITAR button:**

```
min-h-[52px] px-6 rounded-2xl bg-primary text-primary-foreground font-bold text-lg
shadow-floating hover:scale-[1.02] active:scale-[0.98] transition-all duration-200
disabled:opacity-50 disabled:hover:scale-100
```

---

### Toggle

**Wrapper:**

```
rounded-2xl border border-border bg-muted/50 p-4 shadow-card
```

**Inner flex:**

```
flex items-center justify-between gap-4
```

**Label:**

```
text-base font-semibold text-foreground
```

**Sublabel:**

```
text-sm text-muted-foreground
```

**Switch track:**

```
relative h-12 w-20 shrink-0 rounded-full transition-all duration-200
```

- Checked: `bg-primary`
- Unchecked: `bg-muted`

**Switch thumb:**

```
absolute top-1 h-10 w-10 rounded-full bg-white shadow-card transition-transform duration-200
```

- Checked: `left-9`
- Unchecked: `left-1`

---

### ScreenContainer

**Outer wrapper:**

```
min-h-screen flex flex-col max-w-md mx-auto w-full bg-background
```

**Scroll area:**

```
flex-1 flex flex-col px-5 py-6 overflow-y-auto
```

- With bottom button: `pb-24`
- Without: `pb-8`

**Bottom button bar:**

```
fixed bottom-0 left-0 right-0 z-20 bg-background border-t border-border shadow-card
```

**Bottom button inner:**

```
max-w-md mx-auto px-5 py-4 safe-area-pb
```

---

## 3. Design tokens (`src/design-system/tokens.css`)

```css
:root {
  --radius-base: 1rem;
  --radius-large: 1.5rem;

  --shadow-card: 0 6px 18px rgba(0, 0, 0, 0.08);
  --shadow-floating: 0 14px 36px rgba(0, 0, 0, 0.16);

  --transition-fast: 120ms ease;
  --transition-normal: 200ms ease;
}

html {
  background: hsl(var(--color-background));
  color: hsl(var(--color-text));
}
```

**Tailwind mapping (tailwind.config.js):**

- `rounded-xl` → `var(--radius-base)` (1rem)
- `rounded-2xl` → `var(--radius-large)` (1.5rem)
- `shadow-card` → `var(--shadow-card)`
- `shadow-floating` → `var(--shadow-floating)`

---

## 4. Theme variables (by theme)

All theme variables are HSL **three-number values** (no `hsl()` in the variable value). Tailwind wraps them as `hsl(var(--color-*))`.

### Portugal (default)

- **Primary:** `120 45% 38%` (green), fg `0 0% 100%`
- **Accent:** `45 75% 58%` (yellow), fg `0 0% 12%`
- **Secondary:** `0 55% 55%` (red), fg `0 0% 100%`
- **Destructive:** `0 55% 50%`, fg `0 0% 100%`
- **Background:** `45 25% 97%` | **Foreground:** `222 40% 15%`
- **Card:** `0 0% 100%` | **Card-foreground:** `222 40% 15%`
- **Muted:** `45 30% 94%` | **Muted-foreground:** `222 25% 45%`
- **Border:** `45 20% 88%` | **Input:** `45 20% 88%` | **Ring:** `120 45% 38%`
- **Popover:** `0 0% 100%` | **Popover-foreground:** `222 40% 15%`

### Portugal Dark

- **Primary:** `150 55% 42%`, fg `0 0% 100%`
- **Accent:** `42 100% 60%`, fg `0 0% 10%`
- **Background:** `222 47% 8%` | **Foreground:** `0 0% 98%`
- **Card / Surface:** `222 47% 12%`
- **Muted:** `222 47% 15%` | **Muted-foreground:** `215 20% 65%`
- **Border / Input:** `222 47% 20%` | **Ring:** `150 55% 42%`
- **Destructive:** `0 70% 55%`, fg `0 0% 100%`

### Minimal

- **Primary:** `220 14% 30%`, fg `0 0% 100%`
- **Accent:** `220 14% 45%`, fg `0 0% 100%`
- **Background:** `0 0% 100%` | **Foreground:** `220 14% 10%`
- **Card:** `0 0% 100%` | **Muted:** `220 14% 96%` | **Muted-foreground:** `220 9% 46%`
- **Border / Input:** `220 13% 91%` | **Ring:** `220 14% 30%`
- **Destructive:** `0 72% 51%`, fg `0 0% 100%`

### Neon

- **Primary:** `280 100% 60%`, fg `0 0% 100%`
- **Accent:** `170 100% 50%`, fg `0 0% 10%`
- **Background:** `240 10% 6%` | **Foreground:** `0 0% 98%`
- **Card / Surface:** `240 10% 10%`
- **Muted:** `240 10% 15%` | **Muted-foreground:** `240 5% 65%`
- **Border:** `280 50% 25%` | **Input:** `280 30% 15%` | **Ring:** `280 100% 60%`
- **Destructive:** `0 100% 50%`, fg `0 0% 100%`

---

## 5. How themes are applied

- **Mechanism:** `data-theme` on `<html>` (`document.documentElement`) plus CSS variables. No class on `body` for theme.
- **Selector:** Themes are defined in CSS as `:root` (Portugal default) and `:root[data-theme="<id>"]` (portugal, portugal-dark, minimal, neon).
- **Persistence:** Theme id is stored in `localStorage` under key `tvde_theme`.
- **Bootstrap:** In `main.tsx`, `initTheme()` runs before React render: reads `getTheme()` (localStorage or default `"portugal"`), then `document.documentElement.setAttribute("data-theme", theme)`.
- **Runtime change:** User picks theme in Settings (ThemeSelector). `setTheme(id)` updates `data-theme` and writes to localStorage. Components using theme tokens (e.g. `bg-primary`, `text-foreground`) re-render because the CSS variable values change.
- **Tailwind:** Colors in `tailwind.config.js` map to `hsl(var(--color-*))`, so all theme-aware utilities (e.g. `bg-primary`, `border-border`, `text-muted-foreground`) follow the active theme.
- **Dark detection:** `darkMode: ["class", '[data-theme*="dark"]']` so that `portugal-dark` is treated as dark for any Tailwind dark: variants.

---

## 6. Code snippets

### PrimaryActionButton

```tsx
export function PrimaryActionButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
}: PrimaryActionButtonProps) {
  const base =
    'w-full min-h-[52px] rounded-2xl font-bold text-lg shadow-floating hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100'
  const styles =
    variant === 'danger'
      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
      : 'bg-primary text-primary-foreground hover:bg-primary/90'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${styles} ${loading ? 'opacity-80' : ''}`}
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
}
```

### StatusHeader

```tsx
const VARIANT_STYLES: Record<StatusVariant, string> = {
  requested: 'bg-amber-50 text-amber-900 border-amber-200',
  assigned: 'bg-blue-50 text-blue-900 border-blue-200',
  accepted: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  arriving: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  ongoing: 'bg-violet-50 text-violet-900 border-violet-200',
  completed: 'bg-slate-100 text-slate-800 border-slate-300',
  idle: 'bg-slate-50 text-slate-600 border-slate-200',
  error: 'bg-red-50 text-red-900 border-red-200',
}

export function StatusHeader({ label, variant = 'idle' }: StatusHeaderProps) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 text-center text-xl font-semibold mb-6 ${VARIANT_STYLES[variant]}`}
      role="status"
    >
      {label}
    </div>
  )
}
```

---

*Document generated from current codebase (post design refinement).*
