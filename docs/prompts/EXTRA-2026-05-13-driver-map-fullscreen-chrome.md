# Prompt: mapa motorista full-bleed (fundo activo) + chrome fixo inferior

**Decisões fechadas (2026-05-06):** ver colunas **9** (nav inferior + strip; mapa de fundo excepto em menus; híbrido menu com overlay forte) e **7** (**adiado** — não bloqueia este prompt). **Item 6:** primeiro toque no mapa para GPS tratado em [`EXTRA-2026-05-13-driver-home-map-onboarding.md`](EXTRA-2026-05-13-driver-home-map-onboarding.md).

**Lista EXTRA:** itens **3** e **6**. **Dependências:** folha [`EXTRA-2026-05-13-DECISOES.md`](EXTRA-2026-05-13-DECISOES.md) actualizada.

## Objectivo

**Manel:** mapa **ocupa o ecrã** como **fundo**, **interactivo ao toque**; **menus e controlos** residem na **linha fixa inferior** (e safe areas). Harmonizar com **item 2** quando o mapa for o primeiro acto.

## Fora de âmbito

- Novo tile provider ou estilo de mapa artístico.

## Ficheiros prováveis

- [`web-app/src/features/driver/DriverDashboard.tsx`](../../web-app/src/features/driver/DriverDashboard.tsx) — estrutura flex / `fixed` / `z-index`
- [`web-app/src/features/driver/DriverBottomNav.tsx`](../../web-app/src/features/driver/DriverBottomNav.tsx)
- [`web-app/src/maps/MapView.tsx`](../../web-app/src/maps/MapView.tsx) — `compactHeight`, classes `absolute inset-0`
- Shell: [`ScreenContainer`](../../web-app/src/components/layout/ScreenContainer.tsx) (se existir)

## Critérios de aceitação (visíveis)

1. Em **360×800**, mapa **visível** atrás dos overlays principais; **pan/zoom** funcionam **sem** scroll da página.
2. **DriverBottomNav** (e, se decisão **9**, strip disponível/offline) **sempre** acima do mapa, **fixos** ao fundo, **respeitando** `safe-area-inset-bottom`.
3. Lista de viagens / cartões **não** empurram o mapa para fora de vista de forma inconsistente — documentar padrão (bottom sheet vs overlay).
4. Sem regressão visível em **desktop** (breakpoint definido no prompt de execução).

## Ordem sugerida

1. Spike de layout (branch experimental).
2. Extrair componente `DriverMapStage` (nome provisório) para zonas z-index únicas.
3. Ajustar com prompt **aceitar compacto** ([`EXTRA-2026-05-13-driver-accept-compact.md`](EXTRA-2026-05-13-driver-accept-compact.md)).

## Decisões + riscos

- **Item 7:** **adiado** — implementar layout sem esperar unificação Top3/mapa-first.
- **Risco:** iOS Safari barra dinâmica — testar em device real ou Simulator.
