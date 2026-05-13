# Prompt: ecrã inicial motorista — offline após login; toque no mapa → online + mapa

**Lista EXTRA:** item **2**. **Dependências:** **6–7** em [`EXTRA-2026-05-13-DECISOES.md`](EXTRA-2026-05-13-DECISOES.md); alinhamento com [`DRIVER_HOME_TOP3_MANEL.md`](../../docs/product/DRIVER_HOME_TOP3_MANEL.md).

## Objectivo

Após **login**, motorista entra **offline** **sem** botão grande de “ficar online” no primeiro ecrã; **um toque no mapa** expande/activa o mapa e passa a **online** (ou fluxo equivalente único toque).

## Fora de âmbito

- Redesenho completo do menu lateral (só home inicial).

## Ficheiros prováveis

- [`web-app/src/features/driver/DriverDashboard.tsx`](../../web-app/src/features/driver/DriverDashboard.tsx)
- [`web-app/src/config/driverHomeFeatures.ts`](../../web-app/src/config/driverHomeFeatures.ts) — eventual flag `VITE_DRIVER_*`
- [`web-app/src/maps/MapView.tsx`](../../web-app/src/maps/MapView.tsx) — hit area / pointer events
- Hooks: [`useOnlineStatus`](../../web-app/src/hooks/useOnlineStatus.ts) (se aplicável)

## Critérios de aceitação (visíveis)

1. **Primeiro ecrã** pós-login (modo com feature activa): **não** aparece CTA primário “Ficar online” isolado; mapa **convida ao toque**.
2. **Toque no mapa:** transição para estado **online** + mapa usável (definir se animação ou troca de step).
3. **Permissões GPS:** comportamento conforme decisão **6** (pedido no primeiro toque vs no login).
4. **Regression:** com flag **off**, comportamento actual mantém-se (documentar env).

## Ordem sugerida

1. Feature flag + estado `pendingMapTap` (nome provisório).
2. Wire map tap → `setDriverOnline(true)` + UX.
3. E2E ou smoke script (opcional) — toque simulado.

## Decisões + riscos

- Conflito com **DriverMapOfflinePill** actual — especificar **substituir** vs **esconder** até primeiro toque.
- **Risco:** utilizadores que não percebem que devem tocar — microcopy ou halo no mapa (AC visual).
