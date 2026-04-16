# SP-A — Admin com poder operacional (não só painel)

## Intenção

Resolver incidentes **reais** (utilizador, viagem, pagamento) **sem** mexer em código nem SQL manual na rotina.

## Critérios de aceite

1. **Edição segura** de nome/telefone (alinhar com fluxo BETA “cauteloso” já planeado).
2. **Bloquear / reativar** (estender só se houver enum/estado claro; senão documentar o que existe).
3. **Correção de estado de viagem** só com **transições válidas** + confirmação + motivo.
4. **Pagamento:** estados internos + nota + ligação Stripe; reembolso manual no Stripe até haver API segura.

## Dependências

- **SP-B** deve estar mínimo viável antes de acrescentar “override” forte (para cada intervenção haver trilho).

## Estado (repo)

- **1 — Edição segura:** `PATCH /admin/users/{id}` (BETA) com validação de telefone `+351` + audit `user_patch`.
- **2 — Bloquear / reativar:** `POST .../block` e **`POST .../unblock`** (BETA).
- **3 — Correcção de estado de viagem:** `POST /admin/trips/{trip_id}/transition` com confirmação `FORCAR_<ESTADO>` e motivo; só **accepted→arriving** e **arriving→ongoing**. Cancelamento admin: `POST /admin/cancel-trip/{id}` com corpo opcional `CANCELAR_VIAGEM` + motivo → `cancellation_reason`.
- **4 — Pagamento:** detalhe admin inclui **`stripe_dashboard_url`** quando o PI é real; **`POST /admin/trips/{trip_id}/payment-ops-note`** regista nota em auditoria (`payment_ops_note`). Reembolso continua manual no Stripe.

## Validação pós-deploy (UI ≠ só cURL)

- A API exige no JSON a confirmação literal **`FORCAR_ARRIVING`** / **`FORCAR_ONGOING`** (útil para testes com `curl` ou Postman).
- No **web-app**, o painel **Admin → Viagens → Activas** expõe **`→ arriving`** (viagem `accepted`) e **`→ ongoing`** (viagem `arriving`), e no detalhe da viagem **Forçar arriving** / **Forçar ongoing**: o cliente envia essa confirmação por ti; só pedes confirmação no browser e um **motivo ≥ 10 caracteres** (auditoria).
- Se não vês esses botões, o deploy do **web-app** ainda não inclui o merge que os adiciona (ex.: [PR no GitHub](https://github.com/frankbexxx/tvde/pull/109) — confirma o número no teu remoto).

## Exclusões

- Motor de disputas judicial.
- Ticketing de suporte completo.
