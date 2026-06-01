# Contrato ambiance / chrome

Contrato técnico para tokens de **chrome** (overlays UI) na TVDE. Complementa [`info-box-template.md`](info-box-template.md) e [`shell-menu-centric.md`](shell-menu-centric.md).

**Master build:** [`../build/AMBIANCE_CHROME_BUILD.md`](../build/AMBIANCE_CHROME_BUILD.md)

---

## Definições

| Termo | Significado |
|-------|-------------|
| **Tema** | Preferência persistida (`tvde_theme`): `portugal`, `dev`, `minimal`, `neon`, ou `auto` |
| **Ambiance** | Percepção de ambiente de trabalho derivada do tema — chrome coerente, não decoração |
| **Chrome** | UI sobre o palco: sheets, menus, cards, headers, chips, sombras — **não** tiles do mapa |
| **Palco** | Mapa full-bleed (driver/passenger) ou área main partner — informação operacional |

Aplicação: `data-theme` em `document.documentElement` via [`useTheme.ts`](../../web-app/src/hooks/useTheme.ts).

---

## Tokens (lista fechada — 8)

Convenção HSL: `"H S% L%"` (componentes, sem `hsl()`), excepto sombras.

### Superfícies sheet (mapa)

| Token | Uso |
|-------|-----|
| `--color-chrome-sheet-bg` | Fundo bottom sheet / card frame sobre mapa |
| `--color-chrome-sheet-border` | Borda sheet |
| `--shadow-chrome-sheet` | Sombra elevada sheet (valor CSS completo) |

### Menu drawer

| Token | Uso |
|-------|-----|
| `--color-chrome-menu-gradient-from` | Topo do gradiente `MENU_SURFACE` |
| `--color-chrome-menu-row-hover` | Hover `MENU_ROW_BTN` |
| `--color-chrome-menu-row-active` | Item activo (futuro wayfinding) |

### Chips overlay (mapa)

| Token | Uso |
|-------|-----|
| `--color-chrome-chip-bg` | Fundo chip sobre mapa |
| `--color-chrome-chip-border` | Borda chip |

### Partner panels (F3+)

| Token | Uso |
|-------|-----|
| `--color-chrome-panel-bg` | KPI / hub cards partner |

**Fallbacks** em [`tokens.css`](../../web-app/src/design-system/tokens.css): derivados de `--color-background`, `--color-border`, `--shadow-card`.

---

## Matriz aplicação

### Onde ENTRA

| Superfície | Constante / componente | Fase |
|------------|------------------------|------|
| Bottom sheet mapa | `MAP_BOTTOM_SHEET`, `MAP_CARD_FRAME` | F1 piloto, F4 resto |
| Menu drawer | `MENU_SURFACE`, `MENU_ROW_BTN` | F1 piloto, F4 resto |
| Chips mapa | `MAP_CHIP_OVERLAY` | F4 |
| Partner KPI/hub | `PARTNER_KPI_CARD`, `PARTNER_HUB_CARD` (F3) | F3 |
| Aspeto preview | `ThemeSelector` swatches | F2 |

### Onde PROIBIDO

- [`MapView.tsx`](../../web-app/src/maps/MapView.tsx) — tiles, markers, estilo mapa
- Cores semânticas por tema: `--color-success`, `--color-warning`, `--color-destructive`, `--color-info`
- `border-l-info` / `border-l-destructive` em estados accept/cancel/error
- `PrimaryActionButton` estados críticos
- Árvore menu v2 (`partnerMenuNav`, `driverMenuNav`, screens SideMenu)

---

## Regra por role

| Role | Intensidade | Fases |
|------|-------------|-------|
| **Partner** | Craft alto — cards, secções, hubs | F3 (main); F3b menu drawer futuro |
| **Driver / Passenger** | Micro — sheets, chips, menu surface | F1 piloto, F4 completo |
| **Admin** | Minimal, estável | Fora de scope F3–F4 |

---

## Mapeamento temas (sem novos IDs)

| Tema | Ambiance | Chrome (intenção) |
|------|----------|-------------------|
| `portugal` | Claro, operacional, marca PT | Sheet branca/prata; menu gradiente verde suave |
| `dev` | Escuro, menos glare | Sheet/card escuros; menu gradiente primary suave |
| `minimal` | Neutro, dados primeiro | Sheet branca; bordas discretas; sem gradiente forte |
| `neon` | Alto contraste experimental | Sheet escura; bordas accent; uso sandbox |
| `auto` | Sistema | Claro → portugal; escuro → dev |

---

## Checklist smoke manual

| Tema | Ecrã | Verificar |
|------|------|-----------|
| portugal | Driver sheet idle | Texto legível sobre mapa; borda sheet visível |
| dev | Driver sheet idle | Contraste AA corpo/título |
| minimal | Partner home KPIs | Cards legíveis, bordas OK |
| neon | Menu → Definições | Preview swatches coerentes |
| auto (OS dark) | Qualquer | Resolve dev; troca ao mudar OS |

| Ecrã | Verificar |
|------|-----------|
| Partner Frota hub | Hub cards com ícone + subtítulo |
| Passenger Definições | Cards ambiance + Auto explicado |
| Driver oferta | `border-l-info` inalterado |

---

## Não-fazer

Alinhado ao master — ver [`AMBIANCE_CHROME_BUILD.md`](../build/AMBIANCE_CHROME_BUILD.md).

---

## Fases de wiring (referência)

| Fase | Superfícies |
|------|-------------|
| F1 | `MAP_BOTTOM_SHEET`, `MENU_SURFACE`, `MENU_ROW_BTN` (hover) |
| F2 | `ThemeSelector` preview |
| F3 | Partner dashboard, hubs, alerts, `PARTNER_*` constants |
| F4 | Resto `infoBoxTemplate`, chips, menus driver/passenger |

**Pendente pós-F4:** F3b PartnerSideMenu identidade; AppMenuShell unificado (não planeado).
