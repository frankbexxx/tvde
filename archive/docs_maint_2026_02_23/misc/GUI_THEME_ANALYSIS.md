# Análise: Temas, Tokens e Coerência da GUI

## 1. Configurações que mexem na GUI

### Temas disponíveis
| ID | Ficheiro | Descrição |
|----|----------|-----------|
| `portugal` | `themes/portugal.css` | Default — bandeira PT (verde, amarelo, vermelho) |
| `portugal-dark` | `themes/portugal-dark.css` | Dark mode |
| `minimal` | `themes/minimal.css` | Neutro, limpo |
| `neon` | `themes/neon.css` | Cores vibrantes |

### Como funciona
- **Seletor:** `ThemeSelector.tsx` → `useTheme()` → `localStorage.tvde_theme`
- **Aplicação:** `document.documentElement.setAttribute("data-theme", theme)`
- **Cascata:** Cada tema define `:root[data-theme="X"]` com variáveis `--color-*`

### Tokens definidos (por tema)
```
--color-primary, --color-primary-foreground
--color-accent, --color-accent-foreground
--color-secondary, --color-secondary-foreground
--color-destructive, --color-destructive-foreground
--color-muted, --color-muted-foreground
--color-background, --color-foreground
--color-text, --color-border, --color-input, --color-ring
--color-card, --color-surface, --color-popover
--bg-atmo-mid, --bg-atmo-shape
```

### Mapeamento Tailwind (tailwind.config.js)
```
bg-primary, text-primary-foreground
bg-accent, text-accent-foreground
bg-secondary, text-secondary-foreground
bg-muted, text-muted-foreground
bg-destructive, text-destructive-foreground
bg-background, text-foreground
border-border, etc.
```

---

## 2. O que está modular (usa tokens)

| Componente | Tokens usados |
|------------|----------------|
| StatusHeader | `bg-primary`, `bg-accent`, `bg-secondary`, `bg-muted`, `bg-destructive`, `border-border` |
| TripCard | `text-foreground`, `text-muted-foreground` |
| RequestCard | `text-foreground`, `text-muted-foreground`, `from-primary`, `to-accent` |
| Toggle | `border-border`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `bg-primary` |
| RoleSelector | `bg-primary`, `bg-muted`, `bg-accent` |
| ThemeSelector | `bg-primary`, `bg-muted`, `bg-accent` |
| LoginScreen | `text-foreground`, `text-muted-foreground`, `bg-primary`, `bg-muted` |
| AdminDashboard (tabs) | `bg-primary`, `bg-muted` |
| PassengerStatusCard (SEARCHING) | `border-border`, `bg-muted`, `text-foreground`, `text-muted-foreground` |
| PrimaryActionButton | `from-primary`, `to-accent`, `text-primary-foreground` |
| button.tsx, input.tsx, card.tsx, etc. | Tokens semânticos |

---

## 3. O que está hardcoded (ignora temas)

### PassengerStatusCard (4 estados)
| Estado | Cores hardcoded |
|--------|-----------------|
| DRIVER_ASSIGNED | `border-emerald-200`, `bg-emerald-50/50`, `text-emerald-900` |
| DRIVER_ARRIVING | `border-emerald-200`, `bg-emerald-50/50`, `text-emerald-900` |
| TRIP_ONGOING | `border-violet-200`, `bg-violet-50/50`, `text-violet-900` |
| TRIP_COMPLETED | `border-slate-200`, `bg-slate-50`, `text-slate-800` |

### AdminDashboard
- **Títulos:** `text-slate-900`, `text-slate-700`
- **Texto secundário:** `text-slate-500`, `text-slate-600`
- **Cards/containers:** `bg-slate-50`, `bg-slate-100`, `bg-slate-200`
- **Botões sucesso:** `bg-emerald-600`, `hover:bg-emerald-700`
- **Botões perigo:** `bg-red-600`, `bg-red-500`
- **Botões aviso:** `bg-amber-600`, `bg-amber-200`, `text-amber-900`
- **Erro:** `text-red-600`, `bg-red-50`
- **Status saúde:** `text-emerald-700`, `text-amber-700`
- **Blocos JSON:** `text-slate-800`, `bg-slate-100`

### PassengerDashboard
- **Títulos:** `text-slate-900`, `text-slate-600`
- **Banner geolocation:** `bg-amber-50`, `border-amber-200`, `text-amber-800`
- **Erro:** `bg-red-50`, `border-red-200`, `text-red-800`
- **Estado vazio:** `border-slate-200`, `bg-slate-50/50`, `text-slate-600`
- **Histórico:** `text-slate-500`, `text-slate-600`

### DevTools
- **Container:** `border-slate-200`, `bg-slate-50`
- **Botões:** `bg-slate-200`, `bg-emerald-300`, `bg-amber-200`, `bg-violet-200`

---

## 4. Falta de coerência

### Problema 1: Mistura de abordagens
- Alguns componentes reagem ao tema (StatusHeader, RoleSelector)
- Outros têm cores fixas (AdminDashboard, PassengerStatusCard estados 2–5)
- Em `portugal-dark` ou `neon`, o Admin continua com fundos claros (slate-50) e texto escuro — funciona, mas não segue o tema

### Problema 2: Tokens semânticos em falta
O design system não tem tokens para:
- **Success** (verde) — usado como `emerald-*`
- **Warning** (amarelo/laranja) — usado como `amber-*`
- **Info/neutral** — usado como `slate-*`

Existe `destructive` (vermelho) mas muitos sítios usam `red-600` direto.

### Problema 3: Blocos de código (pre)
- `bg-slate-100` + `text-slate-800` — fixo, não reage ao tema
- Em dark mode, o fundo continua claro; o texto foi corrigido para visibilidade mas não é modular

### Problema 4: Cores de estado (UX)
PassengerStatusCard usa cores semânticas (emerald=ok, violet=ativo) para distinguir estados. Isso é intencional para UX, mas:
- Não há tokens `--color-success`, `--color-warning`, `--color-info`
- Se quiseres que o tema mude essas cores, precisas de tokens

---

## 5. Recomendações para modularidade total

### A. Estender tokens.css e temas
Adicionar em cada tema:
```css
--color-success: ...;      /* emerald → primary ou verde custom */
--color-success-foreground: ...;
--color-warning: ...;      /* amber → accent ou amarelo */
--color-warning-foreground: ...;
```

E em tailwind.config.js:
```js
success: { DEFAULT: "hsl(var(--color-success))", foreground: "..." },
warning: { DEFAULT: "hsl(var(--color-warning))", foreground: "..." },
```

### B. Tokens para superfícies
```css
--color-surface-raised: ...;   /* cards, pre blocks — substituir slate-50/100 */
--color-surface-overlay: ...;
```

### C. Migrar componentes
1. **PassengerStatusCard:** DRIVER_ASSIGNED/ARRIVING → `bg-primary/10`, `border-primary` ou `bg-success/10`
2. **AdminDashboard:** `text-slate-900` → `text-foreground`, `bg-slate-50` → `bg-muted`, botões → `bg-primary`, `bg-destructive`
3. **PassengerDashboard:** banners → `bg-accent/20`, `bg-destructive/20`
4. **DevTools:** `bg-slate-*` → `bg-muted`, `text-slate-*` → `text-muted-foreground`
5. **Blocos pre:** `bg-muted` + `text-foreground` (ou `text-card-foreground`) — garantir contraste em todos os temas

### D. Regra de ouro
- **Nunca** usar `slate-*`, `amber-*`, `emerald-*`, `violet-*`, `red-*` diretamente
- **Sempre** usar `text-foreground`, `text-muted-foreground`, `bg-primary`, `bg-muted`, `bg-destructive`, etc.

---

## 6. Resumo

| Aspeto | Estado |
|--------|--------|
| Temas configuráveis | ✅ 4 temas, useTheme, ThemeSelector |
| Tokens base | ✅ primary, accent, secondary, muted, destructive |
| Tokens success/warning | ❌ Não existem |
| Componentes base (ui/) | ✅ Maioritariamente tokens |
| Features (passenger, admin, driver) | ⚠️ Mistura — alguns tokens, muita cor hardcoded |
| Coerência entre temas | ❌ Admin e PassengerStatusCard não reagem ao tema |
| Blocos pre/code | ⚠️ Corrigido para visibilidade, mas ainda hardcoded |

**Conclusão:** Existe infraestrutura de temas e tokens, mas a aplicação é inconsistente. Cerca de 40% dos componentes usam tokens; o resto usa cores Tailwind fixas, o que quebra a modularidade e a coerência entre temas.
