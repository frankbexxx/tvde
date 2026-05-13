# EXTRA 2026-05-13 — Ordem de execução (pós-prompts)

Ligação: plano “lista EXTRA (1–9)” e [`EXTRA-2026-05-13-DECISOES.md`](EXTRA-2026-05-13-DECISOES.md).

| Fase | Prompt / trabalho | Estado | PR / notas |
|------|-------------------|--------|------------|
| **A** | Decisões 1–10 preenchidas | PENDENTE | Folha DECISOES |
| **B1** | [`EXTRA-2026-05-13-driver-accept-compact.md`](EXTRA-2026-05-13-driver-accept-compact.md) (**F-1**) | **PR sugerido** | Primeira fatia: `SlideToAccept` `density=compact`, `RequestCard` mais apertado em modo slide, copy mapa; overlay completo fica para B2 |
| **B2** | [`EXTRA-2026-05-13-driver-map-fullscreen-chrome.md`](EXTRA-2026-05-13-driver-map-fullscreen-chrome.md) (**3+6**) | PENDENTE | Depende B1 ou paralelo com spike |
| **B3** | [`EXTRA-2026-05-13-driver-home-map-onboarding.md`](EXTRA-2026-05-13-driver-home-map-onboarding.md) (**2**) | PENDENTE | Depois B2 recomendado |
| **B4** | [`EXTRA-2026-05-13-driver-hours-legal.md`](EXTRA-2026-05-13-driver-hours-legal.md) (**1**) | PENDENTE | Depende decisões legais |
| **B5** | [`EXTRA-2026-05-13-driver-passenger-copy-audit.md`](EXTRA-2026-05-13-driver-passenger-copy-audit.md) (**7+8**) | PENDENTE | Pode paralelizar com B1 |

**Testes:** Playwright em fluxos tocados; pytest para backend do item **1**.

Actualizar este ficheiro quando cada **Fase** mudar de estado.
