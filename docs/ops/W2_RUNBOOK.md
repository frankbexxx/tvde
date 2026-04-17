# W2 — Runbook operacional (v0, só Admin web)

**Fase:** **W2-A**–**W2-D** (runbook + deep links + Saúde→Viagens + Operações picker/Stripe). Desenho: [`W2_RUNBOOK_UI_DESIGN.md`](W2_RUNBOOK_UI_DESIGN.md).  
**Regra:** **não** uses Swagger nem `curl` com Bearer para estes fluxos — login **admin** na app; o token fica na sessão.

**URL:** abre a **web-app de produção** (Render) e vai a **`/admin`** (ou o caminho equivalente que já usas). Os nomes das tabs coincidem com a UI: **Pendentes**, **Utilizadores**, **Frota**, **Dados**, **Viagens**, **Métricas**, **Operações**, **Saúde**.

**Deep links (W2-B):** ` /admin?tab=health ` · ` /admin?tab=trips&tripId=<uuid> ` (com `tripId`, a tab efectiva é sempre **Viagens** e o painel Detalhe abre para esse id quando a viagem estiver na lista activa). Parâmetro `tab` em inglês, alinhado ao código: `agora` (resumo SP-G; **omissão** de `tab` também abre **Agora**), `pending`, `users`, `frota`, `dados`, `trips`, `metrics`, `ops`, `health`. Também se aceita `trip_id=` como alias de `tripId`. Depois do login, a query string é preservada quando abres directamente o link.

---

## 0. Antes de qualquer incidente

1. Abre a app **PROD** no browser.
2. Autentica-te como **admin** (OTP ou fluxo actual).
3. Confirma que estás em **`/admin`** e que as tabs carregam.

---

## 1. «Isto está pronto para operar?» (env / cron / Stripe)

| Passo | Onde | O quê |
| ----- | ---- | ----- |
| 1.1 | **Operações** | Clica **«Verificar»** (FASE 0). |
| 1.2 | Lê o bloco que aparece | Confirma `CRON_SECRET set`, `STRIPE_WEBHOOK_SECRET set`, flags (`BETA_MODE`, `STRIPE_MOCK`, etc.) conforme o que queres em PROD. |
| 1.3 | (Opcional) | **«Correr cron agora»** — confirma `status`, `duration_ms`, `error_count` e erros JSON se houver. |

Se algo crítico estiver **«não»** onde devia ser **«sim»** → corrige no **Render → Environment** (não documentes valores no Git).

---

## 2. Viagens presas / cancelar / inspeccionar

| Passo | Onde | O quê |
| ----- | ---- | ----- |
| 2.1 | **Viagens** | Lista de viagens activas; escolhe a linha. |
| 2.2 | Painel de detalhe | Lê estado, passageiro/motorista se visível, acções disponíveis. |
| 2.3 | Conforme política | **Cancelar** / outras acções admin que a UI mostrar. |
| 2.4 | (Opcional) | **Debug** se existir botão para JSON de apoio — só para diagnóstico, sem expor em público. |

**Trip id:** vem da lista/detalhe — **não** precisas de ir à API manual se a UI já mostra a viagem.

---

## 3. Avisos de saúde (`system_health`)

| Passo | Onde | O quê |
| ----- | ---- | ----- |
| 3.1 | **Saúde** | **«Atualizar»**. |
| 3.2 | Lê `status` e `warnings` | Anota mensagens (ex.: viagens `accepted` há muito tempo). |
| 3.3 | Em cada linha de anomalia com viagem | **«Abrir em Viagens»** (W2-C) — salta para **Viagens** com `tripId` na URL; se a viagem não estiver na lista activa, usa o JSON como contexto. |
| 3.4 | Se mencionar pagamentos / inconsistências | Segue §5 abaixo **e** Stripe Dashboard. |

---

## 4. Timeouts, ofertas expiradas, limpeza sem esperar o cron externo

| Passo | Onde | O quê |
| ----- | ---- | ----- |
| 4.1 | **Operações** | **«Executar timeouts»** — espera confirmação na UI. |
| 4.2 | **Operações** | **«Expirar ofertas e redispatch»** — idem. |
| 4.3 | (Opcional) | **«Correr cron agora»** se quiseres o batch completo como no W1. |

---

## 5. Pagamento preso / estado financeiro estranho

Não há tab dedicada «Pagamentos» — trilho **mínimo**:

| Passo | Onde | O quê |
| ----- | ---- | ----- |
| 5.1 | **Saúde** | Confirma avisos ligados a pagamentos / `stuck_payments` / inconsistências (se aparecerem). |
| 5.2 | **Operações** (W2-D) | Bloco **«Pagamentos em processing (saúde)»** — **Abrir em Viagens** + links **Stripe (live \| test)** quando existir `pi_…` na API. |
| 5.3 | **Viagens** | Abre a viagem associada; confirma estado da viagem vs. o que o passageiro/motorista vê. |
| 5.4 | **Stripe Dashboard** | PaymentIntents / eventos / webhooks — compara com o que a API processou ([`docs/diagrams/03_PAYMENTS.md`](../diagrams/03_PAYMENTS.md)). |
| 5.5 | Evidência | **Operações → Exportar logs CSV** se precisares de trilho para suporte ou disputa. |

**Disputa / chargeback:** o runbook técnico para no **Stripe** + dados exportados; decisão comercial/jurídica fica **fora** deste ficheiro.

---

## 6. Motorista com `is_available` preso (sem viagem ativa)

| Passo | Onde | O quê |
| ----- | ---- | ----- |
| 6.1 | **Operações** | Secção **«Recuperar motorista»** — **Actualizar saúde** para carregar candidatos. |
| 6.2 | Lista sugerida | Um botão **«Recuperar»** por linha (motoristas «offline há muito sem viagem» na última leitura de saúde). **UUID manual** só em `<details>` para casos raros. |
| 6.3 | **Recuperar** | Confirma mensagem de sucesso ou erro na UI. |

---

## 7. Contexto numérico

| Passo | Onde | O quê |
| ----- | ---- | ----- |
| 7.1 | **Métricas** | Carrega indicadores; usa para decidir se o problema é «volume» ou «caso isolado». |

---

## 8. Fecho do incidente (recomendado)

- [ ] Anotar **hora (UTC)**, **o que fizeste** (tabs + botões), **resultado** (ok / ainda aberto).
- [ ] Se ficou aberto: **próximo dono** (tu / mentor / parceiro técnico) e **próximo passo** (código, dados, Stripe).
- [ ] **Não** colar segredos nem `.env` completo em tickets públicos.

---

## 9. Próximo passo no roteiro (código)

Quando este v0 estiver **ok na prática**, segue **W2-B** no desenho: deep links `?tab=…` para saltar tabs sem perder contexto.
