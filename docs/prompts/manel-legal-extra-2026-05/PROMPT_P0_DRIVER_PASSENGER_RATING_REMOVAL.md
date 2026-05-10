# PROMPT P0 — Remover pedido de classificação do passageiro (motorista)

**Backlog:** [`MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md`](../../product/MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md) item 4.

## Objectivo

A app **deixa de solicitar** ou **aceitar** classificação do passageiro no papel **motorista** (conformidade / igualdade de tratamento no rating).

## Âmbito

- **Frontend motorista:** remover painel de rating, scroll automático, e qualquer cópia que peça nota ao passageiro.
- **API:** `POST /driver/trips/{id}/rate` deixa de persistir dados — resposta explícita para clientes antigos (ex.: **410 Gone** + `detail` claro).
- **Serviço:** `rate_trip_as_driver` não actualiza `passenger_rating` nem médias derivadas.
- **Testes:** remover ou ajustar testes que assumem rating pelo motorista; manter rating **passageiro → motorista**.

## Critérios de aceitação

- Com viagem `completed`, o motorista **não** vê UI de rating do passageiro.
- Chamada à rota antiga **não** altera `Trip.passenger_rating` nem `User.avg_rating_as_passenger`.
- `pytest` nos testes de rating passa com a nova política.

## Fora de âmbito

- Rating **passageiro → motorista** mantém-se.
- Documentação jurídica da norma/fonte (registo separado).
