# Sessão 2026-05-06 — passageiro (shell) + Frota (copy)

Ordem de execução (implementar na totalidade; testes automáticos **entre** prompts; **um** PR no fim):

1. [`PROMPT_P1_PASSENGER_BOTTOM_NAV.md`](PROMPT_P1_PASSENGER_BOTTOM_NAV.md)
2. [`PROMPT_P2_PARTNER_TRIP_FILTER_COPY.md`](PROMPT_P2_PARTNER_TRIP_FILTER_COPY.md)
3. **Gates (repetir após cada prompt):**
   - `cd web-app && npm run lint && npm run build && npm run test`
   - `cd web-app && npx playwright test e2e/driver-passenger-flow.spec.ts --project=e2e-ui`
   - `cd web-app && npm run test:e2e:api` — `api-flows` (sem browser); última ronda documentada **2026-05-11** (6/6).

Backend não é obrigatório se não houver alterações em `backend/`.
