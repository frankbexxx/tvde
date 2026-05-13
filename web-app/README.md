# TVDE Web App

Frontend React + Vite + TypeScript para a plataforma TVDE.

## Estrutura

```
src/
  api/          # client, auth, trips
  features/     # passenger, driver, shared
  components/
  context/      # AuthContext (token em memory)
  hooks/        # usePolling (5s)
  routes/
  main.tsx
  App.tsx
```

## Configuração

- **Base URL:** `VITE_API_URL` em `.env` (default: `/api` para proxy dev)
- **Auth:** Token em memory via `/dev/tokens` (dev)
- **401:** Interceptor dispara `api:401` → logout
- **Motorista — barra inferior (beta):** `VITE_DRIVER_BOTTOM_NAV=true` — Início | Rendimentos | Caixa | Menu (§9 `docs/product/DRIVER_HOME_TOP3_MANEL.md`); mapa em fundo, pills **Offline / Disponível** no mapa (**ecrã único**: com bottom nav activo, o fluxo em 2 passos **ignora-se** em código — ver `src/config/driverHomeFeatures.ts`).
- **Motorista — GPS após 1.º toque (B3 / §6):** `VITE_DRIVER_GEO_ON_FIRST_MAP_TAP=true` — com **bottom nav**, o `watchPosition` só após tocar no mapa; nesse modo o primeiro toque pode também **ficar disponível** (ver `DriverDashboard` / `onDriverHomeMapInteraction`).

## Como correr

```bash
# Backend a correr em localhost:8000
cd web-app
npm run dev
# http://localhost:5173
```

Proxy: `/api` → `localhost:8000`

## Funcionalidades

- **Passageiro:** Pedir viagem, lista ativa, histórico, DevTools (Assign)
- **Motorista:** Lista assigned, Accept / Arriving / Start / Complete, histórico
- **Polling:** 5s para history e trip detail
