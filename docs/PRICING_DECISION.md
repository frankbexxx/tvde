# Decisão de pricing — modelo híbrido

**Data:** 2026-03-22 (consolidação A021→A022)  
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

- Manter a lógica actual: `complete_trip` recalcula preço, ajusta o PaymentIntent se necessário **antes** da captura, webhook continua como fonte de verdade para `payment.status`.
- **`ENABLE_CONFIRM_ON_ACCEPT`** permanece desligado** — confirmação extra no aceitar não faz parte deste modelo híbrido nesta fase.
- Nenhuma alteração obrigatória de endpoints ou estados de trip para esta decisão (só alinhamento de messaging no cliente).

---

## Regra de produto

> **A estimativa não é vinculativa.** O valor cobrado é o **preço final** determinado ao concluir a viagem, salvo política comercial futura explícita (fora de âmbito).

---

## Referências

- Plano de execução: `docs/prompts/A021_VISUAL_SYSTEM.md` (visual) e instruções A021→A022 fechadas na sessão de consolidação.
- Histórico Stripe / confirmação futura (arquivo): `archive/docs_nao_essenciais/STRIPE_CONFIRMACAO_FUTURA.md`
