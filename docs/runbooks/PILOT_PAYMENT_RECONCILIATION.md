# Piloto V1 — Viagem concluída, pagamento não reconciliado

**Caso:** `Trip = completed` mas `Payment` não está `succeeded` (fica `processing` / inconsistente).

## 1. Identificar a Trip

- Admin → Viagens → detalhe (referência / estado / motorista / passageiro).  
- Confirmar `completed_at` e preço final.

## 2. Identificar o Payment

- No mesmo detalhe: estado do pagamento (`processing` / `failed` / `succeeded`).  
- Anotar `payment_intent_id` (`pi_…`) se disponível.

## 3. Identificar o Payment Intent

- Stripe Dashboard (modo **Test** em staging; **Live** só em janela live controlada).  
- Abrir o `pi_…` e anotar: status Stripe, amount, currency, charges.

## 4. Estado interno

| Trip | Payment | Significado típico |
|------|---------|-------------------|
| completed | processing | Captura/confirm feito ou a meio; webhook ainda não marcou `succeeded` |
| completed | failed | Falha registada (webhook/reconcile) — não tratar como pago |
| completed | succeeded | OK |

## 5. Consultar Stripe

Comparar:

- amount Stripe vs preço final da viagem;  
- status (`requires_capture`, `succeeded`, `canceled`, `requires_action`);  
- eventos recentes do PI.

## 6. Verificar webhook

- Confirmar endpoint staging/prod a receber eventos.  
- Ver se `payment_intent.succeeded` chegou (ou falhou assinatura).  
- Retries Stripe: idempotência por `evt_…` — reentrega não deve duplicar efeito.

## 7. Decidir acção (sem correcções financeiras cegas)

| Situação Stripe | Acção segura |
|-----------------|--------------|
| `succeeded` + amount OK | Admin **reconcile / stripe-sync** (super_admin) para alinhar Payment |
| `requires_capture` + amount OK | Captura no Stripe ou retry operacional documentado — **não** inventar valor |
| `requires_action` | Passageiro deve concluir SCA; depois retry complete/reconcile |
| amount ≠ final | **Não** capturar; investigar mismatch (log `payment_capture_blocked_amount_mismatch`) |
| `canceled` / failed | Não reconciliar como pago; suporte + possível nova cobrança fora deste fluxo |

## 8. Registar incidente

- Referência viagem + `pi_…` + estados + acção tomada + responsável.  
- Sem secrets, sem PAN, sem client_secret em tickets.

## Ferramentas Admin

- Detalhe da viagem (estados, preço, notas).  
- Sistema → Operações: pré-visualização / sync Stripe (super_admin + motivo).  
- Saúde do sistema: pagamentos stuck / inconsistentes.
