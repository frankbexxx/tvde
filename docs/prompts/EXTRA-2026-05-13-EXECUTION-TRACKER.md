# EXTRA 2026-05-13 — Ordem de execução (pós-prompts)

Ligação: plano “lista EXTRA (1–9)” e [`EXTRA-2026-05-13-DECISOES.md`](EXTRA-2026-05-13-DECISOES.md).

| Fase | Prompt / trabalho | Estado | PR / notas |
|------|-------------------|--------|------------|
| **A** | Decisões 1–10 preenchidas | **FECHADO** | Folha DECISOES (2026-05-06) |
| **B1** | [`EXTRA-2026-05-13-driver-accept-compact.md`](EXTRA-2026-05-13-driver-accept-compact.md) (**F-1**) | **Feito** (`main`) | Slider compacto + cartão slide |
| **F-2** | Partilha app no menu passageiro (QR ou asset) | **Feito** | `PassengerSideMenu` + `react-qr-code`; opcional `VITE_APP_SHARE_URL` |
| **B2** | [`EXTRA-2026-05-13-driver-map-fullscreen-chrome.md`](EXTRA-2026-05-13-driver-map-fullscreen-chrome.md) (**3+6**) | **Parcial** | `MapView` `tallStage`; overlay menu Radix `bg-black/80` |
| **B3** | [`EXTRA-2026-05-13-driver-home-map-onboarding.md`](EXTRA-2026-05-13-driver-home-map-onboarding.md) (**2**) | **Parcial** | `VITE_DRIVER_GEO_ON_FIRST_MAP_TAP` + primeiro toque → GPS |
| **B4** | [`EXTRA-2026-05-13-driver-hours-legal.md`](EXTRA-2026-05-13-driver-hours-legal.md) (**1**) | **Feito (v1)** | Segmentos `arriving`/`ongoing`, dia civil `Europe/Lisbon`, `GET /driver/status/compliance/driving-hours`, bloqueio accept/online, UI motorista; **admin override** de `driving_rest_until` pode vir num PR pequeno |
| **B5** | [`EXTRA-2026-05-13-driver-passenger-copy-audit.md`](EXTRA-2026-05-13-driver-passenger-copy-audit.md) (**7+8**) | **PENDENTE** | Inventário antes/depois; 3 pilares por role |

**Testes:** Playwright em fluxos tocados; **pytest** para **B4** quando existir lógica de horas.

Actualizar este ficheiro quando cada **Fase** mudar de estado.
