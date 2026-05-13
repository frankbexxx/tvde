# Prompt: «Deslizar para aceitar» compacto sobre o mapa + alinhamento UX (F-1)

**Lista EXTRA:** itens **4** e **5**. **Ligação:** [`TODOdoDIA.md`](../../TODOdoDIA.md) **F-1** — evidência smoke **2026-05-13** (slider **abaixo da dobra** em **360×800**).

## Objectivo

- **CTA de aceitar** (slide + rejeitar) **visível** no **primeiro ecrã** útil em **360×800**, preferencialmente **sobre** o mapa ou **imediato** sob o mapa, **mais compacto** que o cartão actual.
- **Item 5:** rever **alinhamento** com `StatusHeader`, faixa “pedidos no mapa”, `DriverMapAvailabilityPill`, lista — **documentar decisões** numa subsecção do PR.

## Fora de âmbito

- Mudar regra de negócio de aceitação (continua `acceptTrip`).

## Ficheiros prováveis

- [`web-app/src/components/cards/RequestCard.tsx`](../../web-app/src/components/cards/RequestCard.tsx)
- [`web-app/src/components/cards/SlideToAccept.tsx`](../../web-app/src/components/cards/SlideToAccept.tsx)
- [`web-app/src/features/driver/DriverDashboard.tsx`](../../web-app/src/features/driver/DriverDashboard.tsx)

## Critérios de aceitação (visíveis)

1. Com **1 pedido** e viewport **360×800**: **track** do slider **totalmente visível** **sem** scroll (ou scroll máximo **≤ 8 px** medido — definir tolerância no PR).
2. **Thumb** e **“Aceitar com um toque”** mantêm **área tocável ≥ 44×44 pt** (ou equivalente WCAG 2.5.5 alinhado ao projecto).
3. Texto “Aceita em baixo” no mapa **coherente** com posição real do CTA (actualizar copy ou mover CTA).
4. **Vitest/RTL** existentes em `RequestCard` **verdes**; acrescentar teste opcional para variante `compact` se introduzida.

## Ordem sugerida

1. **Quick win (PR #1):** variantes compactas em `SlideToAccept` + `RequestCard` (pode já ter sido aplicado em `main`).
2. **PR #2:** POSicionar cartão/slider em **overlay** sobre mapa (depende do layout em [`EXTRA-2026-05-13-driver-map-fullscreen-chrome.md`](EXTRA-2026-05-13-driver-map-fullscreen-chrome.md)).

## Decisões + riscos

- **Rejeitar** acima do slider pode aumentir altura — considerar **linha** compacta ou ícone secundário.
- **Risco E2E:** selectors `driver-accept-*` — não renomear sem actualizar specs.
