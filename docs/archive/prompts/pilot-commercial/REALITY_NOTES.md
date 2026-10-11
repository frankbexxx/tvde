# Notas de realidade do repo (antes de redigir prompts)

Documento curto para **alinhar prompts** ao que existe hoje em `APP` — evitar assumir 4 repositórios ou stacks novas sem necessidade.

---

## Superfícies actuais (frontend)

- **Uma** aplicação: `web-app/` (React, Vite, Tailwind).
- Rotas por papel (ex.: `/passenger`, `/driver`, `/admin`), não quatro builds separados.
- **Parceiro:** ainda **não** existe como rota/shell dedicada — Fase 2 deve assumir **adição** (ex. `/partner`) com guards por role, reutilizando `web-app` salvo decisão explícita em contrário.

## Backend

- **FastAPI** em `backend/`, Postgres, JWT, roles já usados no fluxo BETA/admin.
- Multi-tenant **rigoroso** para piloto comercial pode exigir trabalho **explícito** em modelo de dados e queries — as prompts das Fases 0, 2 e 6 devem cruzar com o código real, não só com desejos.

## O que já está maduro

- Loop viagem passageiro ↔ motorista, E2E Playwright, simulação DEV, polling com `equals` no detalhe passageiro.
- `AdminDashboard` existe — Fase 1 e 5 devem **auditar** antes de duplicar painéis.

## Decisão de produto (handoff recente)

- **Parceiro** = entidade que detém motoristas (multi-parceiro, multi-motorista).
- **Motorista** = cliente operacional; só o ciclo da viagem.
- **Entrega “app”** = orientação a **piloto comercial** / produção, não demo interna.

## Risco a carregar nas prompts

- Exigir o **mesmo nível de polish** nas 4 superfícies em paralelo → mata velocidade.
- **Fase 2 (parceiro)** como critical path; passageiro/motorista em **freeze / stabilize** até lá.

## Contrato Fase 0 (fechado em documento, não em código)

Três prompts já redigidas com **instruções + execução** e cruzamento com o repo:

- [A001 — superfícies de produto](phase-0-alignment/PROMPT_A001_PRODUCT_SURFACES_DEFINITION.md)
- [A002 — roles e permissões (alvo vs gap)](phase-0-alignment/PROMPT_A002_ROLES_AND_PERMISSIONS_MODEL.md)
- [A003 — limites multi-tenant (alvo vs gap)](phase-0-alignment/PROMPT_A003_MULTI_TENANT_BOUNDARIES.md)

**Código:** `partner` e tenant **ainda não** implementados; o texto é **contrato alvo** para implementação.

**A001–A003** são contrato de produto/RBAC/tenant **válido em documento**, mas **não** mapeiam 1:1 para patches até seguires a sequência operacional em [`IMPLEMENTATION_SEQUENCE.md`](IMPLEMENTATION_SEQUENCE.md) (enum → modelo → deps/JWT → serviços → router `/partner` → testes).

---

_Última revisão: 2026-04-05_
