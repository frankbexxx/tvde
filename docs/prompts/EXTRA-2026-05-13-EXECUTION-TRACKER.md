# EXTRA 2026-05-13 — Ordem de execução (pós-prompts)

Ligação: plano “lista EXTRA (1–9)” e [`EXTRA-2026-05-13-DECISOES.md`](EXTRA-2026-05-13-DECISOES.md).

| Fase | Prompt / trabalho | Estado | PR / notas |
|------|-------------------|--------|------------|
| **A** | Decisões 1–10 preenchidas | **FECHADO** | Folha DECISOES (2026-05-06) |
| **B1** | [`EXTRA-2026-05-13-driver-accept-compact.md`](EXTRA-2026-05-13-driver-accept-compact.md) (**F-1**) | **Feito** (`main`) | Slider compacto + cartão slide |
| **F-2** | Partilha app no menu passageiro (QR ou asset) | **Feito** | `PassengerSideMenu` + `react-qr-code`; opcional `VITE_APP_SHARE_URL` |
| **B2** | [`EXTRA-2026-05-13-driver-map-fullscreen-chrome.md`](EXTRA-2026-05-13-driver-map-fullscreen-chrome.md) (**3+6**) | **Feito (v1)** | Palco mapa desacoplado do scroll (`driverMapStageLayout`); `MapView` `fillContainer` + altura `58dvh`; nav inferior + safe-area inalterados |
| **B3** | [`EXTRA-2026-05-13-driver-home-map-onboarding.md`](EXTRA-2026-05-13-driver-home-map-onboarding.md) (**2**) | **Feito (v1)** | Toque no mapa → disponível + `watch` GPS (`onDriverHomeMapInteraction`); pill «Ficar disponível» oculto enquanto `driverMapGeoHint`; microcopy B3; `VITE_DRIVER_GEO_ON_FIRST_MAP_TAP` no template |
| **B4** | [`EXTRA-2026-05-13-driver-hours-legal.md`](EXTRA-2026-05-13-driver-hours-legal.md) (**1**) | **Feito (v1)** | Segmentos, Lisboa, endpoint motorista, bloqueio; **override** `driving_rest_until`: `POST /admin/drivers/{id}/driving-rest-override` + separador Ops (só admin); ver [`EXTRA-2026-05-13-DECISOES.md`](EXTRA-2026-05-13-DECISOES.md) secção execução consolidada |
| **B5** | [`EXTRA-2026-05-13-driver-passenger-copy-audit.md`](EXTRA-2026-05-13-driver-passenger-copy-audit.md) (**7+8**) | **Feito (v1)** | [`EXTRA-2026-05-13-B5-antes-depois.md`](EXTRA-2026-05-13-B5-antes-depois.md); `PassengerDashboard`, `TripPlannerPanel`, microcopy `DriverDashboard` |
| **Nav coerente (§9 ext.)** | Mesma filosofia passageiro → partner | **Prioridade fixada** | **Passageiro primeiro**, **partner depois** ([`DECISOES`](EXTRA-2026-05-13-DECISOES.md) execução consolidada) |
| **R-1** | Rotacional v3 (cache HTTP + cron) | **Feito** | `ROTACIONAL_V3_FETCH_URL`, migração `rotacional_external_cache`, merge em `GET /rotacional/messages` |

**Testes:** Playwright / smokes — **recomendação** (não gate de merge); **pytest** para **B4** + override admin.

Actualizar este ficheiro quando cada **Fase** mudar de estado.
