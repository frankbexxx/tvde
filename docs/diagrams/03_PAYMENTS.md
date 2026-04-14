# Diagrama — pagamento (`PaymentStatus` + Stripe)

Estados internos em `PaymentStatus` (`enums.py`). A captura/autorização concreta segue a política documentada em `docs/PRICING_DECISION.md` e testes Stripe.

```mermaid
stateDiagram-v2
  [*] --> pending

  pending --> processing: intenção / confirmação\nem curso
  processing --> succeeded
  processing --> failed

  succeeded --> [*]
  failed --> [*]
```

## Fluxo externo (alto nível)

```mermaid
sequenceDiagram
  participant App as Web / API
  participant API as FastAPI
  participant S as Stripe

  App->>API: criar / confirmar pagamento\n(conforme endpoint)
  API->>S: API Stripe
  S-->>API: webhook (eventos)
  API->>API: idempotência + actualiza\nPaymentStatus / trip
```

Índice: [README.md](README.md)
