# InfoBox — receita visual (smoke 2026-05-22)

Referência: painel **aceitar viagem** motorista (TVDE_6).

## Regras

| Regra | Detalhe |
|-------|---------|
| Mapa | Sempre full-bleed por trás; informação em **caixas por cima** (`MapBottomSheet` / `MapStage`) |
| Moldura | Cantos arredondados **em cima e em baixo** (`rounded-2xl`), nunca só `rounded-t-*` em painéis flutuantes |
| Barra lateral | `border-l-4` azul/info (motorista) ou primary/70 (passageiro) |
| Tamanhos | `INFO_BOX_DRIVER_LARGE` (aceitar) · `INFO_BOX_DRIVER_COMPACT` (em viagem) · `INFO_BOX_PASSENGER` (P) |
| Botões | Altura ~slide (`PrimaryActionButton` `size="compact"`); dois na mesma linha (`BottomActionStack direction="row"`) |
| Scroll | **Não** em caixas de viagem; só em listas (histórico, menu) |

## Constantes TS

[`web-app/src/components/layout/infoBoxTemplate.ts`](../../web-app/src/components/layout/infoBoxTemplate.ts)

## Componentes

- [`MapBottomSheet.tsx`](../../web-app/src/components/layout/MapBottomSheet.tsx) — fundo do mapa
- [`InfoPanel.tsx`](../../web-app/src/components/layout/InfoPanel.tsx) — estados passageiro
- [`ActionPanel.tsx`](../../web-app/src/components/layout/ActionPanel.tsx) — oferta motorista
- [`RequestCard.tsx`](../../web-app/src/components/cards/RequestCard.tsx) — conteúdo aceitar

## Grelha

Actualizar entradas TW-05 em [`screenshot-tweaks-g-matrix.md`](screenshot-tweaks-g-matrix.md) quando cada imagem for fechada.
