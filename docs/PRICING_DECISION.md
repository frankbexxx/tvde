# Decisão de pricing — modelo híbrido

**Data:** 2026-03-22 (consolidação A021→A022)  
**Actualizado:** 2026-09-11 — A2.5 tarifário GO/Comfort/XL V1  
**Estado:** decisão fechada — documento de referência para produto, UX e backend.

---

## Modelo escolhido: **C — Híbrido**

| Momento | O que o utilizador vê | Vinculativo? |
|--------|------------------------|--------------|
| Pedido / aceitação | **Estimativa** (intervalo ou valor indicativo) | **Não** |
| Fim da viagem (`complete_trip`) | **Preço final** (distância/duração reais ou efectivas) | **Sim** (captura Stripe) |

- A **estimativa** comunica expectativa sem compromisso legal/comercial explícito nessa fase.  
- O **preço final** é calculado no servidor ao concluir a viagem e é o valor usado na **captura** do PaymentIntent (após `update_payment_intent_amount` se aplicável).

---

## Impacto no UX (web-app)

- Mostrar **“Estimativa (indicativa)”** ou equivalente antes e durante a viagem, quando se exibe um valor que não é definitivo.
- Mostrar **“Preço final”** quando a viagem está concluída e existe `final_price` (ou valor cobrado).
- Copy no ecrã passageiro e motorista deixa claro: estimativa ≠ preço final; o definitivo aparece **no fim**.
- **Não** ativar confirmação de valor no `accept` até haver fluxo e copy dedicados (fora do âmbito desta decisão).

---

## Impacto no backend

- Manter a lógica atual: `complete_trip` recalcula preço, ajusta o PaymentIntent se necessário **antes** da captura, webhook continua como fonte de verdade para `payment.status`.
- **`ENABLE_CONFIRM_ON_ACCEPT`** permanece desligado no modelo híbrido; em **prod** e **staging live** (`STRIPE_MOCK=false`) a flag é **hard-disabled** mesmo se o env a ligar (`confirm_on_accept_effective`).
- Placeholder no accept: PI cartão `capture_method=manual` com **€0,50** (mínimo Stripe EUR); o amount real só é escrito no complete **antes** do confirm.
- **Fail-closed:** se o PI já estiver `requires_capture` com amount ≠ `final_price` (ex.: confirm antecipado a €0,50), **não** capturar — `payment_amount_mismatch` / log `payment_capture_blocked_amount_mismatch`.
- Webhook `payment_intent.succeeded` e admin reconcile só marcam `succeeded` se amount/currency baterem com `final_price` (ou `payment.total_amount`).
- **MB WAY:** fase 2 — fluxo próprio (sem manual capture); fora deste hardening.

### Tarifário por categoria (A2.5 · V1)

Fonte canónica: `backend/app/core/tariffs.py` (não `BASE_FARE` env).

| Categoria | Código | Base | €/km | €/min | Mínimo |
|-----------|--------|-----:|-----:|------:|-------:|
| GO | `x` | 1,50 | 0,60 | 0,12 | 4,50 |
| Comfort | `comfort` | 1,90 | 0,85 | 0,15 | 5,50 |
| XL | `xl` | 3,00 | 1,05 | 0,15 | 6,50 |

- `fare_subtotal = max(raw, minimum)`; `total = fare_subtotal + pet + tolls`.
- Snapshot de rates em `trip.price_breakdown` (`category`, `tariff_version`, `price_per_km`, …) para o complete não depender de alterações futuras da tabela.
- Comissão: `(final_price − tolls_amount) × %` — Pet commissionable; portagens **0%** (cálculo automático de tolls = fora desta versão; `tolls_amount=0`).
- Waiting / surge: OFF.

---

## Regra de produto

> **A estimativa não é vinculativa.** O valor cobrado é o **preço final** determinado ao concluir a viagem, salvo política comercial futura explícita (fora de âmbito).

---

## Referências

- Plano de execução: `docs/prompts/A021_VISUAL_SYSTEM.md` (visual) e instruções A021→A022 fechadas na sessão de consolidação.
- Histórico Stripe / confirmação futura: no snapshot local (ver [HISTORICO_FORA_DO_GIT.md](HISTORICO_FORA_DO_GIT.md)), ficheiro `archive/docs_nao_essenciais/STRIPE_CONFIRMACAO_FUTURA.md`
- Diagrama pagamentos: [`docs/diagrams/03_PAYMENTS.md`](diagrams/03_PAYMENTS.md)
