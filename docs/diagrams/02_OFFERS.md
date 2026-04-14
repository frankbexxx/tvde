# Diagrama — ofertas ao motorista (`OfferStatus`)

Cada pedido em `requested` pode gerar **várias ofertas** (top N motoristas). Estados da oferta em `backend/app/models/enums.py` → `OfferStatus`.

```mermaid
stateDiagram-v2
  [*] --> pending: oferta criada

  pending --> accepted: motorista aceita
  pending --> rejected: motorista rejeita
  pending --> expired: timeout / TTL

  accepted --> [*]
  rejected --> [*]
  expired --> [*]
```

## Nota operacional

- Viagens em `requested` com **todas** as ofertas `rejected` ou `expired` podem ser reencaminhadas (lógica em `offer_dispatch` e serviços de viagem — ver código).

Índice: [README.md](README.md)
