# TVDE — Ride Sharing MVP

App de partilha de viagens (tipo Uber/Bolt) com backend FastAPI, frontend React e Stripe.

**Estado:** MVP validado em campo (4 dispositivos, rede móvel, fluxo completo operacional).

**Dia a dia:** [`TODOdoDIA.md`](TODOdoDIA.md) — única fonte operacional diária (estado, handoff, fecho).

**Plano mestre:** [`docs/ROADMAP_FINAL_ENTREGA_TVDE_2026.md`](docs/ROADMAP_FINAL_ENTREGA_TVDE_2026.md)

## Estrutura

- `backend/` — API FastAPI, PostgreSQL, Stripe
- `web-app/` — React + Vite + TypeScript

## Início rápido

1. **Local:** Ver [`docs/testing/GUIA_TESTES.md`](docs/testing/GUIA_TESTES.md)
2. **Deploy:** Ver [`docs/deploy/PREPARACAO_RENDER.md`](docs/deploy/PREPARACAO_RENDER.md)
3. **Validação humana:** Ver [`docs/testing/VALIDACAO_HUMANA_CAMPO.md`](docs/testing/VALIDACAO_HUMANA_CAMPO.md)

## Documentação

1. **[DOCS_INDEX.md](docs/meta/DOCS_INDEX.md)** — documentação **CURRENT** (não inventário histórico). Histórico fora do Git: **[docs/HISTORICO_FORA_DO_GIT.md](docs/HISTORICO_FORA_DO_GIT.md)**.
2. **[DOCUMENT_GOVERNANCE.md](docs/meta/DOCUMENT_GOVERNANCE.md)** — regras documentais canónicas (Fases 1–5).
3. **Registos:** [DECISIONS](docs/registers/DECISIONS.md) · [FINDINGS](docs/registers/FINDINGS.md) · [consultas externas](docs/registers/EXTERNAL_CONSULTATIONS.md) · [política external](docs/external/README.md).
4. **[PROJECT.md](docs/meta/PROJECT.md)** — produto, modelo de dados, fluxo viagem/pagamento.
5. **[docs/GITHUB_MANUAL_TVDE.md](docs/GITHUB_MANUAL_TVDE.md)** — Git/GitHub para este repo (branches, PR, `main`; push directo a `main` está bloqueado).
6. **[docs/IMPLEMENTACAO_E_TESTES.md](docs/IMPLEMENTACAO_E_TESTES.md)** — o que foi implementado (A000…), como testar, e **Parte II** (logs / pytest).

_Handoff histórico: [PROXIMA_SESSAO.md](docs/archive/plans/PROXIMA_SESSAO.md) (arquivo)._

Guias operacionais rápidos:

| Ficheiro | Descrição |
|----------|-----------|
| [`docs/testing/GUIA_TESTES.md`](docs/testing/GUIA_TESTES.md) | Manual de testes passo a passo |
| [`docs/deploy/PREPARACAO_RENDER.md`](docs/deploy/PREPARACAO_RENDER.md) | Deploy no Render |
| [`docs/testing/VALIDACAO_HUMANA_CAMPO.md`](docs/testing/VALIDACAO_HUMANA_CAMPO.md) | Teste humano em campo |
