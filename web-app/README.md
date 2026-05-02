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
- **Motorista — home em 2 passos (beta):** `VITE_DRIVER_HOME_TWO_STEP=true` — mapa + disponibilidade primeiro, depois ecrã completo com pedidos (ver `docs/product/DRIVER_HOME_TOP3_MANEL.md`).

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
