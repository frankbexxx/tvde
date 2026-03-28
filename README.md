# TVDE — Ride Sharing MVP

App de partilha de viagens (tipo Uber/Bolt) com backend FastAPI, frontend React e Stripe.

**Estado:** MVP validado em campo (4 dispositivos, rede móvel, fluxo completo operacional).

## Estrutura

- `backend/` — API FastAPI, PostgreSQL, Stripe
- `web-app/` — React + Vite + TypeScript

## Início rápido

1. **Local:** Ver `GUIA_TESTES.md`
2. **Deploy:** Ver `PREPARACAO_RENDER.md`
3. **Validação humana:** Ver `VALIDACAO_HUMANA_CAMPO.md`

## Documentação

1. **[DOCS_INDEX.md](DOCS_INDEX.md)** — mapa da documentação no repo. Histórico antigo retirado do Git: **[docs/HISTORICO_FORA_DO_GIT.md](docs/HISTORICO_FORA_DO_GIT.md)**.
2. **[PROJECT.md](PROJECT.md)** — produto, modelo de dados, fluxo viagem/pagamento.
3. **[docs/GITHUB_MANUAL_TVDE.md](docs/GITHUB_MANUAL_TVDE.md)** — Git/GitHub para este repo (branches, PR, `main`; push directo a `main` está bloqueado).
4. **[PROXIMA_SESSAO.md](PROXIMA_SESSAO.md)** — handoff entre sessões; operações do dia a dia na **Seção F**; relatório de alinhamento na **Seção G**.
5. **[docs/IMPLEMENTACAO_E_TESTES.md](docs/IMPLEMENTACAO_E_TESTES.md)** — o que foi implementado (A000…), como testar, e **Parte II** (logs / pytest).

Guias operacionais rápidos:

| Ficheiro | Descrição |
|----------|-----------|
| `GUIA_TESTES.md` | Manual de testes passo a passo |
| `PREPARACAO_RENDER.md` | Deploy no Render |
| `VALIDACAO_HUMANA_CAMPO.md` | Teste humano em campo |
