# Em curso — trabalhos ativos

Lista curta do que estamos a implementar **agora**. Marca `[x]` quando fechar; acrescenta linhas quando entrar trabalho novo. Roadmap macro continua em [`TODO_CODIGO_TVDE.md`](TODO_CODIGO_TVDE.md).

---

## Driver — iniciar viagem perto do pickup

- [x] Mostrar «Iniciar viagem» só quando o motorista está a **≤ ~50 m** do ponto de pickup (Haversine, reutilizar `web-app/src/utils/geo.ts`), coerente com os `trip.status` válidos para esse passo.
- [x] Passar para `ActiveTripActions` posição do motorista (`driverLocation` desde `DriverDashboard`); pickup continua no detalhe polled no filho — mesma regra com `canDriverStartTripNearPickup` + handler.
- [x] No handler de sucesso ao iniciar: **não** fazer snap da posição simulada/enviada para o pickup quando já estiver perto (`isWithinHaversineM` / `DRIVER_START_TRIP_MAX_DISTANCE_M` alinhado com o botão).
- [x] (Opcional) Atraso ~**200 ms** antes de `startMockOsrmLeg` na fase pickup→destino (mock DEV).
- [x] Correr **lint** e **testes** do `web-app` após as alterações.

**Nota (produto / camadas):** isto fecha a **camada 1** para o gate “perto do **pin** contratual”. O desvio **passageiro ↔ pin** (indoor, CC, etc.) fica fora deste âmbito — ver [`todo-futuro-nuances.md`](todo-futuro-nuances.md), camada 2.

## Backend — validar proximidade ao iniciar (`POST …/start`)

- [x] Antes de `ongoing`: última `driver_locations` vs `trip.origin_*`, Haversine, raio configurável **`DRIVER_START_TRIP_MAX_DISTANCE_M`** (70 m por defeito, > 50 m do frontend).
- [x] `400` + `driver_location_required` | `driver_too_far_from_pickup`; evento `driver_start_trip_distance_check` no log.
- [x] Testes `tests/test_start_trip_proximity.py`; `/dev/auto-trip` e simulador sincronizam posição ao pickup para não quebrar fluxos de dev.

## E2E Playwright — fluxo crítico passageiro + motorista

- [x] `@playwright/test`, `playwright.config.ts`, `e2e/driver-passenger-flow.spec.ts` (API prepara viagem + `VITE_E2E` + `sessionStorage` `e2e_passenger_trip_id`; dois contextos; geolocalização no pickup; aceitar → iniciar → terminar).
- [x] CI: `.github/workflows/web-e2e.yml` (Postgres + migrate + uvicorn + `npm run test:e2e`).

**Correr localmente — um só backend (FastAPI):**

- **Serviço obrigatório:** API **FastAPI** na base `http://127.0.0.1:8000` (é a mesma app: `/config`, `/dev/seed`, `/dev/tokens`, `/trips`, `/drivers/location`, etc.). Confirma em `http://127.0.0.1:8000/docs`.
- **Base de dados:** Postgres configurada nesse backend (se o uvicorn arranca sem erro de migração, está ok).
- **Não são necessários para este E2E:** MapTiler, Stripe, WebSockets — ignora para este fluxo.
- **Comando:** `cd web-app && npx playwright install chromium && npm run test:e2e` (na raiz do repo também: `npm run test:e2e` se existir o `package.json` delegado). O Playwright sobe o Vite com `VITE_E2E=true` e `VITE_API_URL=http://127.0.0.1:8000` para o browser falar com a API sem depender do proxy `/api`.
- **Se já tiveres `npm run dev` noutro terminal:** esse servidor tem de ser compatível com E2E (`VITE_E2E=true` e a mesma `VITE_API_URL`), senão desliga-o e deixa só o Vite iniciado pelo Playwright.

## Passageiro — painel sem «piscar» no poll

- [x] `usePolling` com `equals` opcional + `passengerTripPollEquals` (ignora `updated_at` / `driver_location` no detalhe — posição vem do hook dedicado).
- [x] Rodapé de poll: só «A sincronizar…» quando ainda **não** há `trip`; removido «A atualizar estado…» em cada refresh de fundo.

---

_Última actualização: 2026-03-27_
