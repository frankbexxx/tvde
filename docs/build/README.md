# Build — Driver + Partner (ondas A–D)

Planos de execução e prompts copy-paste. **Executar uma onda de cada vez** → branch → commit → PR → merge → próxima.

| Onda | Ficheiro | Branch sugerido | Depende de |
|------|----------|-----------------|------------|
| A | [ONDA_A_DRIVER_BUILD.md](ONDA_A_DRIVER_BUILD.md) | `feat/onda-a-driver-core` | — |
| B | [ONDA_B_PARTNER_OPS_BUILD.md](ONDA_B_PARTNER_OPS_BUILD.md) | `feat/onda-b-partner-ops` | merge A (opcional) |
| C | [ONDA_C_PARTNER_MAP_BUILD.md](ONDA_C_PARTNER_MAP_BUILD.md) | `feat/onda-c-partner-map` | merge B |
| D | [ONDA_D_INBOX_DOCS_BUILD.md](ONDA_D_INBOX_DOCS_BUILD.md) | `feat/onda-d-inbox-docs` | merge B (C opcional) |

Decisões globais: [`driver_partner_ondas_abcd`](../../.cursor/plans/driver_partner_ondas_abcd_420bc177.plan.md) (Cursor plan).

**Fora de scope:** auth, Stripe, pagamentos, legal, RGPD, Passenger, Admin, CI/deploy.

**Fluxo git:** commit + PR juntos; se CI falhar, commit só dos fixes até verde.
