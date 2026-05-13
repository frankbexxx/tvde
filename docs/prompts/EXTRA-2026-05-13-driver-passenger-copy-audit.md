# Prompt: auditoria de ruído — ecrã principal motorista (7) e passageiro (8)

**Decisões fechadas (2026-05-06):** **10** — referência Manel (offline/online, nav fixa); **3 pilares** por role: mapa/estado, CTA principal, navegação inferior; progressive disclosure OK.

**Lista EXTRA:** itens **7**, **8** e meta **9** (cada entrega inclui secção **Decisões + riscos**).

## Objectivo

Reduzir **texto / botões / blocos redundantes** nos **ecrãs principais** (não menu profundo), sem apagar informação **legalmente necessária** até validação.

## Fora de âmbito

- Reescrever specs legais completas; i18n de novas línguas.

## Ficheiros prováveis

- [`web-app/src/features/driver/DriverDashboard.tsx`](../../web-app/src/features/driver/DriverDashboard.tsx)
- Componentes filhos: `StatusHeader`, `DriverShellTopChips`, zonas, banners
- [`web-app/src/features/passenger/PassengerDashboard.tsx`](../../web-app/src/features/passenger/PassengerDashboard.tsx)
- [`TripPlannerPanel.tsx`](../../web-app/src/features/passenger/TripPlannerPanel.tsx)
- **Specs:** [`DRIVER_MENU_SPEC.md`](../../docs/product/DRIVER_MENU_SPEC.md), referência UX passageiro se existir

## Critérios de aceitação (visíveis)

1. Lista **antes/depois** (tabela Markdown no PR): cada bloco removido ou escondido com **justificativa** (“redundante com X”, “mudou para menu”).
2. Decisão **10** da folha de decisões: **3 elementos** que **permanecem** sempre visíveis em cada role — **respeitados** no resultado.
3. **Passageiro:** `TripPlannerPanel` e CTA principal **legíveis** em **360** sem dois avisos contradizentes.
4. **Nenhum texto legal obrigatório** removido sem substituição **aprovada** (checklist no PR).

## Ordem sugerida

1. Inventário screenshots + DOM (lista de nós).
2. PR motorista; PR passageiro (ou um PR com duas secções se diff pequeno).
3. Rever com Manel (async).

## Decisões + riscos

- **Progressive disclosure** vs **delete** — preferência na decisão **10**.
- **Risco:** reduzir demais e aumentar chamadas ao suporte — manter “?” ou link **Ajuda** num único sítio.
