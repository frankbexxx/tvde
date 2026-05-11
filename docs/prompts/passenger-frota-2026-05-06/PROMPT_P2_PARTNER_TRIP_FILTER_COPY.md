# P2 — Frota: clarificar filtro «Só atribuídas»

## Contexto

No `PartnerHome`, o filtro `assigned` lista viagens com estado API `assigned` (motorista atribuído mas ainda sem **aceite**). O rótulo **«Só atribuídas»** confunde operadores (parece incluir viagens *em curso*).

## Objectivo

Trocar o rótulo do chip por texto que reflata o estado **aguarda aceitação do motorista**, sem alterar a lógica de filtro.

## Requisitos

- Label curto e legível em mobile (ex.: **«Por aceitar»** ou equivalente em PT).
- Acrescentar `title` (tooltip nativo) com frase explícita: motorista já atribuído, viagem ainda não aceite.
- Não mudar `TripFilter`, endpoints nem CSV.

## Aceitação

- `npm run lint` e `npm run build` verdes.
