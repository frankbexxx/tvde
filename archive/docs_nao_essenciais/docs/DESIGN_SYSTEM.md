# Design System TVDE

Sistema de design profissional com React + Tailwind + shadcn/ui.

---

## Estrutura

```
src/
  design-system/
    themes/          # Temas visuais
      portugal.css   # Default (verde/amarelo Portugal)
      portugal-dark.css
      minimal.css
      neon.css
    tokens.css       # Variáveis globais (radius, shadow, transition)
    components/app/
      SettingsButton.tsx
      ThemeSelector.tsx
    pages/           # Componentes exemplo
      RideRequestCard.tsx
      DriverPanelCard.tsx
      TripStatusCard.tsx
  hooks/
    useTheme.ts      # getTheme, setTheme, initTheme
  components/ui/     # shadcn (button, card, sheet, etc.)
```

---

## Temas

| ID | Descrição |
|----|-----------|
| `portugal` | Verde e amarelo, inspirado em Portugal |
| `portugal-dark` | Dark mode Portugal |
| `minimal` | Neutro, limpo |
| `neon` | Roxo e ciano vibrantes |

---

## Uso

1. **Selecionar tema:** Botão engrenagem (header) → Sheet → ThemeSelector
2. **Tokens:** Editar `tokens.css` e `themes/*.css`
3. **Tailwind:** Cores em `tailwind.config.js` usam variáveis CSS

---

## Micro-animações

- Botões: `hover:scale-[1.02] active:scale-[0.98] transition-all duration-200`
- Cards: `hover:shadow-floating`
- Cantos: `rounded-2xl` (--radius-large)

---

## Mobile-first

- `max-w-md mx-auto` no container principal
- Sheet com `side="bottom"` para painéis inferiores
- Safe area: `safe-area-pb` para botões fixos
