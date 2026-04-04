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

**Seguinte (Prompt 2):** E2E Playwright — ainda **não** feito.

---

_Última actualização: 2026-03-27_
