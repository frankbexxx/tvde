# Em curso — quadro operacional

Vista única para saber sempre o que está em execução, no mesmo formato em todas as sessões.

---

## Agora (foco único)

- [x] Smoke pós-merge: **rejeitar oferta**, **rating pós-viagem**, **preferência Waze/Google** + regressões S1/S2.
- [x] PR de estabilização E2E/CI mergeado: tipagem Playwright + retry rate-limit + fix cenário offline.
- [ ] Iniciar implementação de **categorias de veículo** (fatia 1: estrutura + toggles base no driver).

---

## Hoje (até fechar a sessão)

- [x] Driver: **REJEITAR** na lista de pedidos (com `offer_id`).
- [x] Passageiro: **avaliação** opcional após `completed` + detalhe com `driver_rating`.
- [x] Motorista: **preferência de navegação** persistida + **wake lock** durante viagem activa.
- [x] Light theme: **bordas** um pouco mais legíveis (tokens minimal + portugal).
- [x] E2E/CI: eliminar flakiness no cenário **motorista offline**.
- [ ] Perguntas ao Manuel (`docs/partner/MANUEL_DRIVER_QA_2026-04-29.md`) — quando o Frank tiver respostas.

---

## Amanhã (próxima sessão útil)

- [ ] Categorias de veículo e «dois destinos por dia» — fechar regras com Manuel e contrato de dados.
- [ ] Menu motorista (rendimentos, histórico, documentos) — por fatias; suspensão/documentos: **admin** como fonte de verdade.
- [x] E2E: cenário **rejeitar** + **rating** (+ persistência de preferência de navegação).

---

## Backlog (não bloquear agora)

- Theming/polish amplo de superfície e iconografia final.
- Refactors estruturais sem impacto directo em operação.

---

_Última revisão: 2026-04-29_
