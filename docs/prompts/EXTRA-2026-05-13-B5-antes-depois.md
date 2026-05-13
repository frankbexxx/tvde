# B5 — Auditoria de ruído (motorista 7 + passageiro 8): antes / depois

Referência: [`EXTRA-2026-05-13-driver-passenger-copy-audit.md`](EXTRA-2026-05-13-driver-passenger-copy-audit.md), decisão **10** (3 pilares: mapa/estado, CTA principal, navegação inferior).

## Alterações visíveis (UI)

| Bloco / mensagem | Antes | Depois | Justificativa |
|------------------|-------|--------|----------------|
| Hint de polling da viagem (`tripPollFootnote`) | Texto repetido sob o `StatusHeader` **e** como `tripPollHint` no `TripPlannerPanel` quando o painel está visível (`in_trip`, etc.). | Com painel visível, mantém-se **só** no `TripPlannerPanel` (via `tripPollHint`). Sob o header só quando **não** há painel (`!showTripPlannerPanel`). | Redundante com o canal único do painel; reduz duas faixas com o mesmo aviso. |
| Botão «Também podes tocar no mapa para marcar destino» (`planning`) | Aparecia no fluxo **embedded** (painel dentro do cartão unificado). | Omitido quando `embedded === true`. | No fluxo unificado o mapa e a copy de planeamento já indicam o gesto; evita CTA extra. |
| Linha «Pagamento: …» no `TripPlannerPanel` em `in_trip` | Sempre que havia `inTripPaymentLine`, inclusive em `TRIP_ONGOING` com `pending` / `processing` / `failed`. | Omessa **só** quando o `PassengerStatusCard` já mostra a mesma informação (`TRIP_ONGOING` + esses estados de pagamento). Mantém-se para `succeeded` e para fases anteriores à viagem em curso (ex. a caminho) onde o cartão não espelha essa linha. | Evita duplicar a mesma linha com o cartão de estado. |
| Microcopy passo 1 (`DriverDashboard`, `driver-home-step1`) | «Mapa e disponibilidade primeiro; depois vês pedidos e o ecrã completo.» | «Mapa e estado em primeiro plano; pedidos e detalhes quando precisares.» | Frase mais curta no primeiro plano; alinhada aos 3 pilares sem novo bloco. |

## O que **não** foi cortado (legal / risco)

- Textos em [`web-app/src/constants/passengerPaymentCopy.ts`](../../web-app/src/constants/passengerPaymentCopy.ts) e blocos `PASSENGER_PAYMENT_DISCLOSURE_*` no `TripPlannerPanel` — **inalterados**.
- Progressive disclosure existente (ex. detalhes GPS motorista em `<details>`) — **inalterado**.

## Decisão 10 (check rápido)

- **Motorista:** mapa/estado, disponibilidade/pedidos, navegação — sem remover um dos três pilares; só encurtar texto auxiliar.
- **Passageiro:** mapa + `StatusHeader` + painel/CTA — deduplicação, sem esconder o único sítio onde o utilizador via polling/pagamento quando o cartão não cobre o caso.
