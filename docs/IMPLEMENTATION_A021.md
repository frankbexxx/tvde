# Relatório de implementação — A021 (Visual system / refinamento UX passageiro)

## Objectivo (prompt)

Aplicar `docs/prompts/A021_VISUAL_SYSTEM.md`: hierarquia visual consistente, um foco por estado, melhor contraste, mapa como suporte, transições leves — **sem** alterar lógica de negócio, backend ou dependências.

## Alterações por ficheiro

### `web-app/src/features/passenger/PassengerDashboard.tsx`

- `useMemo` **`a021Layout`**: mapeia `passengerUiState` → peso de `StatusHeader`, `MapView` e `TripPlannerPanel`:
  - **idle:** header subduzido, mapa subduzido, painel em destaque.
  - **planning:** header subduzido, mapa realçado, painel subduzido.
  - **confirming:** header subduzido, mapa subduzido, painel em destaque.
  - **searching / in_trip:** header normal (foco), mapa subduzido, painel subduzido.
- Props passadas: `StatusHeader visualWeight`, `MapView mapVisualWeight`, `TripPlannerPanel visualWeight`.
- Contraste: subtítulo do cabeçalho da página, bloco “A sincronizar viagem…”, secção **Histórico** — `text-muted-foreground` substituído por `text-foreground/80`–`/90` onde aplicável.

### `web-app/src/components/layout/StatusHeader.tsx`

- Nova prop opcional **`visualWeight`**: `'default' | 'subdued'`.
- **subdued:** `text-base`, `font-medium`, `opacity-90`, `shadow-none`, padding e margem inferiores ligeiramente menores.
- **default:** `text-xl`, `font-semibold`, `shadow-sm` (destaque quando o estado do fluxo pede foco no banner).

### `web-app/src/maps/MapView.tsx`

- Nova prop **`mapVisualWeight`**: `'emphasized' | 'subdued'` (default `emphasized`).
- **subdued:** `shadow-sm`, `opacity-95`, overlay **`bg-background/25`** sobre o mapa (e sobre placeholder quando `showMap` é falso); transição `transition-all duration-300`.
- Marcadores de planeamento: `shadow-lg` → `shadow-md` (sombra menos pesada que CTAs).
- Texto auxiliar do placeholder: `text-foreground/80`.

### `web-app/src/features/passenger/TripPlannerPanel.tsx`

- Prop **`visualWeight`**: painel com `opacity-90` e `shadow-sm` quando subduzido.
- Superfícies: removido `bg-muted/50` + `dark:bg-zinc-950/50`; planeamento/confirmação usam **`bg-card`** + `shadow-inner` / borda.
- **Planning:** copy compacta — uma linha de itinerário `origem → destino` quando ambos existem; estados intermédios com menos labels redundantes (“Recolha”/“Destino” em blocos separados eliminados).
- **Confirming:** itinerário numa linha com prefixo “Itinerário:”.
- Botões primários de confirmação / idle: **`shadow-floating`** + **`rounded-2xl`** (alinhado à regra “sombra elevada só em CTA”).
- Textos secundários: `text-foreground/80`–`/85` em vez de `text-muted-foreground` predominante.

### `web-app/src/components/layout/PrimaryActionButton.tsx`

- Apenas correção de comentário JSDoc: **`rounded-full`** (coerente com o código).

## O que não foi alterado

- **Backend**, APIs, hooks de estado, condições de `passengerUiState` / `showTripPlannerPanel`.
- **DriverDashboard** / **AdminDashboard** (excepto componente `StatusHeader` partilhado com prop opcional por defeito).
- Novas dependências npm.

## Testes executados

- `npm install` + `npm run build` em `web-app/` — **sucesso** (`tsc -b` + `vite build`).

## Ficheiros não incluídos no commit A021

- Alterações locais noutros paths (ex.: `backend/app/main.py`) e artefactos de auditoria — rever antes de commit global.

## Referência

- Prompt: `docs/prompts/A021_VISUAL_SYSTEM.md`
