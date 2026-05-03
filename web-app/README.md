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
- **Motorista — barra inferior (beta):** `VITE_DRIVER_BOTTOM_NAV=true` — Início | Ganhos | Caixa | Menu (§9 do mesmo doc); esconde o botão «Menu» do cabeçalho e o painel Conta em scroll duplicado; **mapa em fundo também offline** (§9.2) com marcador GPS ou última posição servidor; pills **Offline / Disponível** no mapa (§9.4) em vez do toggle grande; **§9.5** no ecrã motorista: chip **Estatuto**, placeholder **tier** (ícone), **Lupa** (toast «em breve»); em **Menu → Caixa** há atalho **Ver registo de atividade** (abre Configurações no separador de logs). Com **dois passos** (`VITE_DRIVER_HOME_TWO_STEP`), o passo 1 usa o mesmo mapa/pills quando a barra inferior está activa.

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
