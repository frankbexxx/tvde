# Mapa da UI — onde mexer (cores, espaçamentos, componentes)

Guia para alterações **manuais** na interface: ficheiro → o que controla → excertos de referência.  
Stack: **Tailwind** + variáveis CSS em **`web-app/src/design-system/`**.

---

## Regra de ouro

| Objetivo                                            | Onde                                                                  |
| --------------------------------------------------- | --------------------------------------------------------------------- |
| Paleta global (primary, fundo, bordas, destructive) | `web-app/src/design-system/themes/*.css`                              |
| Sombras e raios “de marca”                          | `web-app/src/design-system/tokens.css` + `web-app/tailwind.config.js` |
| Fundo da página / tipografia base                   | `web-app/src/index.css`                                               |
| Um botão ou caixa **concreta**                      | A `className` nesse `.tsx`                                            |

Cores Tailwind (`bg-primary`, `text-foreground`, …) mapeiam para `hsl(var(--color-*))` definidos nos temas.

---

## 1. Paleta global

**Ficheiros:** `web-app/src/design-system/themes/portugal.css`, `portugal-dark.css`, `minimal.css`, `neon.css`  
**Ligação ao Tailwind:** `web-app/tailwind.config.js` (`theme.extend.colors`).

Exemplo (valores HSL **sem** `hsl()` — três números):

```css
/* portugal.css */
--color-primary: 120 45% 38%;
--color-accent: 45 75% 58%;
--color-background: 45 25% 97%;
--color-destructive: 0 55% 50%;
```

**Sombras / raios:** `web-app/src/design-system/tokens.css` (`--shadow-card`, `--shadow-floating`, `--radius-base`, `--radius-large`).

---

## 2. Shell da app (header “TVDE”, largura)

**Ficheiro:** `web-app/src/routes/index.tsx`

- Largura: `max-w-md md:max-w-5xl mx-auto`
- Header sticky: `bg-background/80 backdrop-blur-md border-b border-border/80`
- Título: `<h1 className="text-lg font-bold text-foreground">TVDE</h1>`
- Loading / erro de arranque: mesma rota, blocos com `Spinner`, `text-destructive`, botão `bg-primary`

**Definições / tema / modo passageiro–motorista:** `web-app/src/design-system/components/app/SettingsButton.tsx` (usa `Button`, `ThemeSelector`, `Sheet`/`Dialog`).

---

## 3. Contentor de ecrã + barra fixa inferior

**Ficheiro:** `web-app/src/components/layout/ScreenContainer.tsx`

- Área scroll: `px-5 pt-6 pb-4` (com `pb-20` se existir `bottomButton`)
- Barra fixa: `fixed bottom-0 … border-t border-border shadow-card`, `py-4`, `safe-area-pb`

Usado em `PassengerDashboard` e `DriverDashboard`.

---

## 4. Botão principal fixo (ex.: Cancelar, Pedir nova viagem)

**Ficheiro:** `web-app/src/components/layout/PrimaryActionButton.tsx`

- `min-h-[52px]`, `rounded-full`, `shadow-floating`
- `variant === 'primary'`: gradiente `from-primary to-accent`
- `variant === 'danger'`: `bg-destructive`

---

## 5. Banner de estado (StatusHeader)

**Ficheiro:** `web-app/src/components/layout/StatusHeader.tsx`

- Mapa `VARIANT_STYLES`: `requested`, `assigned`, `accepted`, `arriving`, `ongoing`, `completed`, `idle`, `error`
- Modo `emphasis="subdued"`: bloco neutro `bg-card`, menos destaque
- Modo `compact`: pill pequena

Para mudar a cor de **um** estado, edita a string Tailwind nesse mapa (ou a variável CSS correspondente no tema para efeito global).

---

## 6. Mapa

**Ficheiro:** `web-app/src/maps/MapView.tsx`

- Altura: `h-[45vh] min-h-[220px] max-h-[420px]`
- Moldura: `rounded-2xl`, `shadow-card` vs `shadow-sm` (subdued)
- Placeholder sem mapa: `bg-muted/60`, `border-dashed`
- Rota de planeamento: `RouteLine` com `line-color` roxo (`#8b5cf6`) no JSX
- Marcadores pickup/destino: `PassengerMarker` com `colorClassName` (âmbar / verde)

---

## 7. Painel de planeamento (TripPlannerPanel)

**Ficheiro:** `web-app/src/features/passenger/TripPlannerPanel.tsx`

- `panelSurface`: bordas, `bg-card`, `shadow-inner` / `shadow-card` consoante `uiState` e `embedded`
- Botões “Pedir viagem”, “Repor”, “Centrar mapa…”, “Confirmar”: cada um com `className` no JSX
- Secção não embutida: `<section className="rounded-2xl border px-4 py-4 …">`

---

## 8. Cartão de estado da viagem (passageiro)

**Ficheiro:** `web-app/src/features/passenger/PassengerStatusCard.tsx`

Cada `case` do UX state tem o seu `div` com `rounded-2xl border … bg-primary/10`, `bg-success/15`, etc. Edita o bloco do estado que quiseres mudar.

---

## 9. PassengerDashboard — blocos principais

**Ficheiro:** `web-app/src/features/passenger/PassengerDashboard.tsx`

Referências úteis (procurar no ficheiro por estas classes ou textos):

| Elemento                                  | Padrão de classes / nota                                             |
| ----------------------------------------- | -------------------------------------------------------------------- |
| Card unificado (mapa + pesquisa + painel) | `rounded-2xl border border-border bg-card overflow-hidden shadow-sm` |
| Separador mapa                            | `border-t border-border`                                             |
| Rodapé do painel embutido                 | `px-4 py-4 border-t border-border bg-card/40`                        |
| Banner simulação DEV                      | `bg-violet-100 dark:bg-violet-500/15 border-violet-300 …`            |
| Aviso fallback geo                        | `bg-warning/20 border-warning/50`                                    |
| Erro                                      | `rounded-xl bg-destructive/10 border-destructive/30`                 |
| Rodapé poll (texto pequeno)               | `text-xs text-foreground/55`                                         |
| Loading “A sincronizar viagem”            | `rounded-2xl border bg-card` + `Spinner`                             |
| Aviso histórico                           | `bg-warning/15 border-warning/40`                                    |
| Secção histórico                          | `pt-8 mt-8 border-t border-border`                                   |

---

## 10. Motorista — pedido disponível (ACEITAR)

**Ficheiro:** `web-app/src/components/cards/RequestCard.tsx`

- Caixa: `rounded-2xl border border-border bg-card/95 p-4 shadow-card`
- Botão ACEITAR: `rounded-full bg-gradient-to-r from-primary to-accent shadow-floating`

---

## 11. TripCard (origem / destino / preço)

**Ficheiro:** `web-app/src/components/cards/TripCard.tsx`  
Mesmo padrão visual que `RequestCard` (`rounded-2xl`, `bg-card/95`, `shadow-card`).

---

## 12. Acções viagem activa (motorista)

**Ficheiro:** `web-app/src/features/driver/ActiveTripActions.tsx`

- Estado “a sincronizar”: `rounded-xl border bg-muted/30`
- Gate de proximidade: `text-xs text-foreground/65`
- CTA: `PrimaryActionButton`

**Ecrã motorista completo** (título, mapa, toggle online): `web-app/src/features/driver/DriverDashboard.tsx` — procurar `className` e banners `bg-violet-100` (mock).

---

## 13. Login BETA

**Ficheiro:** `web-app/src/features/auth/LoginScreen.tsx`  
`bg-card`, `rounded-2xl`, `shadow-card`, tabs Passageiro / Motorista.

---

## 14. Componentes UI genéricos (shadcn)

**Pasta:** `web-app/src/components/ui/`

| Ficheiro                  | Uso                                              |
| ------------------------- | ------------------------------------------------ |
| `button.tsx`              | Variantes `default`, `outline`, `destructive`, … |
| `card.tsx`                | Layouts tipo card                                |
| `dialog.tsx`, `sheet.tsx` | Modais / gaveta (ex.: definições)                |
| `input.tsx`               | Campos de texto                                  |
| `sonner.tsx`              | Toasts (com `sonner` nas features)               |

---

## 15. Tabela rápida “quero mudar…”

| Quero mudar…                                | Ficheiro principal                                   |
| ------------------------------------------- | ---------------------------------------------------- |
| Cor primária / fundo / bordas em toda a app | `design-system/themes/portugal.css` (+ outros temas) |
| Sombras globais                             | `design-system/tokens.css`                           |
| Gradiente / ruído de fundo                  | `index.css`                                          |
| Header e largura máxima                     | `routes/index.tsx`                                   |
| Padding geral dos ecrãs com scroll          | `components/layout/ScreenContainer.tsx`              |
| Botão fixo grande em baixo                  | `components/layout/PrimaryActionButton.tsx`          |
| Cores do banner de estado                   | `components/layout/StatusHeader.tsx`                 |
| Tamanho e moldura do mapa                   | `maps/MapView.tsx`                                   |
| Painel “Para onde vais?” e botões           | `features/passenger/TripPlannerPanel.tsx`            |
| Cartões por estado (procura, a caminho, …)  | `features/passenger/PassengerStatusCard.tsx`         |
| Card grande passageiro + avisos             | `features/passenger/PassengerDashboard.tsx`          |
| Card ACEITAR                                | `components/cards/RequestCard.tsx`                   |
| Botões shadcn em massa                      | `components/ui/button.tsx`                           |

---

## 16. Como encontrar o resto

1. Abre a app e identifica o **texto visível**.
2. Pesquisa esse texto em `web-app/src` (Ctrl+Shift+F).
3. Ajusta a `className` (ou o tema) nesse ficheiro.

---

_Última actualização: 2026-04-04_
