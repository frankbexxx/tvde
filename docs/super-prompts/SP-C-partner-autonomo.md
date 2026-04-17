# SP-C — Partner autónomo (sem TI no dia-a-dia)

## Intenção

O gestor de frota **identifica problemas**, **exporta prova** e **sabe quando escalar** — sem depender de debug técnico.

## Critérios de aceite

- Fila ou vista de **anomalias da frota** (linguagem de negócio: motorista parado, viagem bloqueada, etc.).
- **Histórico útil** com filtros simples (não SQL).
- **CSV** com contrato de colunas **estável** + nota de uma página (já existe base — consolidar).

## Exclusões

- Mapa frota tempo real.
- Stripe Connect / payouts ao motorista.
- BI pesado.

## Estado (implementação)

- **Backend:** `GET /partner/trips/export` — CSV UTF-8 com colunas `trip_id`, `driver_id`, `passenger_id`, `status`, `created_at`, `started_at`, `completed_at`, `updated_at` (contrato: só acrescentar colunas no fim).
- **Web (`PartnerHome`):** secção **Precisa de atenção** (heurísticas: sem progresso, viagem longa em curso, motorista indisponível com viagem atribuída); filtros de viagens (incl. canceladas, falhadas, só atribuídas); lista ordenada por `updated_at`; nota de colunas do CSV + export na secção Viagens; constante `PARTNER_TRIPS_CSV_COLUMNS` em `web-app/src/api/partner.ts`.
