# Parceiro TVDE — checklist operacional (papelada)

**Propósito:** inventário **para conversa** com o **titular da licença TVDE** / operador da frota (**parceiro**), alinhando o que a **lei e a prática** exigem da operação com o que o **código e a documentação** do projecto já suportam. Serve para não esquecer tópicos numa reunião ou num email.

**Não é aconselhamento jurídico, fiscal nem contabilístico.** Validação de formulários, prazos legais e redacção de contratos cabe a **profissionais certificados** (advogado, contabilista certificado OCR). Este ficheiro só **lista perguntas e artefactos** úteis.

**Ligações úteis no repo**

| Documento                                                          | Uso                                                     |
| ------------------------------------------------------------------ | ------------------------------------------------------- |
| [`docs/visao_cursor.md`](../visao_cursor.md) §4.2                  | Estado geral legal/compliance no projecto               |
| [`docs/PARTNER_ONBOARDING.md`](../PARTNER_ONBOARDING.md)           | Fluxo técnico mínimo: org, gestor `partner`, motoristas |
| [`docs/meta/PROJECT.md`](../meta/PROJECT.md)                       | Visão produto, comissão, stack                          |
| [`docs/ops/OPERATION_CHECKLIST.md`](../ops/OPERATION_CHECKLIST.md) | Operação diária (cron, Stripe, saúde)                   |

---

## 1. Quem é quem (alinhamento de termos)

| Papel                     | Pergunta a fechar com o parceiro                                                                                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Titular licença TVDE**  | O parceiro (pessoa colectiva ou empresário em nome individual) é o **operador TVDE** face ao IMT e demais autoridades, ou existe **outra entidade** por trás (subcontratação, franquia)? |
| **Plataforma (software)** | Quem é o **prestador da plataforma digital** perante passageiros e motoristas — a tua empresa, o parceiro, ou **modelo misto** (marketplace + frota)?                                    |
| **Motoristas**            | Contrato de trabalho, prestação de serviços ou outro quadro — **quem assina** com o motorista e **quem paga**?                                                                           |
| **Passageiro**            | Quem aparece como **contratante do transporte** no recibo / comunicação ao cliente?                                                                                                      |

Marca uma linha de decisão por tópico e regista em **Notas** (abaixo ou anexo).

---

## 2. Autoridades e licenciamento (IMT e adjacências)

| O que pedir / confirmar                                                                               | Estado | Prazo / meta | Notas                                         |
| ----------------------------------------------------------------------------------------------------- | :----: | ------------ | --------------------------------------------- |
| N.º / cópia da **licença TVDE** válida (operador)                                                     |   ☐    |              |                                               |
| Âmbito geográfico e modalidades autorizadas vs **piloto** (zona, horário)                             |   ☐    |              |                                               |
| Situação de **veículos** licenciados TVDE (lista, matrículas, validades)                              |   ☐    |              |                                               |
| **Motoristas** com capacidade TVDE (CRA, registo criminal, etc.) — lista mínima que o parceiro mantém |   ☐    |              | Advogado confirma checklist legal actualizado |
| Comunicações / alterações obrigatórias ao IMT (mudança de frota, titular, veículo) — **quem executa** |   ☐    |              | Parceiro vs plataforma                        |
| Multas / coimas / histórico relevante (transparência B2B)                                             |   ☐    |              | Opcional mas comum em due diligence leve      |

---

## 3. Seguros e responsabilidade civil

| O que pedir / confirmar                                                                             | Estado | Prazo / meta | Notas                                       |
| --------------------------------------------------------------------------------------------------- | :----: | ------------ | ------------------------------------------- |
| Apólice **RC** (e outros exigidos) com **cobertura** alinhada ao transporte TVDE                    |   ☐    |              | Matrículas e condutor nomeados se aplicável |
| Contacto de **sinistros** e procedimento em acidente com passageiro                                 |   ☐    |              |                                             |
| Responsabilidade **civil contratual** entre parceiro ↔ plataforma (danos indirectos, indemnizações) |   ☐    |              | Cláusulas — advogado                        |

---

## 4. Contratos e papelada entre partes

| Documento                                                                                     | Entre quem                          | Estado | Notas                                               |
| --------------------------------------------------------------------------------------------- | ----------------------------------- | :----: | --------------------------------------------------- |
| **Contrato quadro** parceiro ↔ operador da plataforma (comissão, SLA, dados, rescisão)        | Parceiro / Plataforma               |   ☐    | Encaixa `PRICING_DECISION` + modelo comercial       |
| **Contrato ou anexo** motorista ↔ quem emprega ou contrata                                    | Motorista / …                       |   ☐    |                                                     |
| **Termos** passageiro (transporte + uso da app)                                               | Passageiro / …                      |   ☐    | Falta no repo — ver `visao_cursor` §4.2             |
| **Política de privacidade** + eventual **DPA** (subprocessadores: Stripe, SMS, maps, hosting) | Utilizador / responsável tratamento |   ☐    | Listar subprocessadores reais do ambiente produtivo |
| **Confidencialidade** (NDA) para dados de frota exportados (CSV, métricas)                    | Parceiro / Plataforma               |   ☐    | `GET /partner/trips/export`                         |

---

## 5. Dados pessoais (RGPD) — perguntas mínimas

| Tópico                            | Pergunta                                                                                                     | Estado | Notas                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------ | :----: | --------------------------------------------------------------- |
| **Responsável pelo tratamento**   | Quem é o responsável perante o passageiro? E perante o motorista?                                            |   ☐    | Pode haver responsabilidades conjuntas — advogado               |
| **Base legal**                    | Execução de contrato, legítimo interesse, consentimento — o quê em cada fluxo (OTP, localização, histórico)? |   ☐    |                                                                 |
| **Retenção**                      | Quanto tempo guardar viagens, logs, telefones?                                                               |   ☐    | Alinhar com política e com implementação (`audit_events`, etc.) |
| **Transferências internacionais** | Stripe / Twilio / Render — DPA e SCCs em ordem?                                                              |   ☐    |                                                                 |
| **Direitos ARCL**                 | Processo interno quando o passageiro ou motorista pede cópia/apagamento                                      |   ☐    | Quem responde em 30 dias                                        |

---

## 6. Pagamentos, comissões e faturação

| O que pedir / confirmar                                                                           | Estado | Notas                                       |
| ------------------------------------------------------------------------------------------------- | :----: | ------------------------------------------- |
| Modelo **Stripe** (Connect, application fee, destination) alinhado ao **contrato** com o parceiro |   ☐    | Ver `docs/testing/TESTE_STRIPE_COMPLETO.md` |
| **Quem emite** fatura ou documento ao passageiro; tratamento de **IVA** e comissão da plataforma  |   ☐    | Contabilista certificado                    |
| **Reconciliação** mensal: export partner (`/partner/trips/export`) vs extratos Stripe             |   ☐    |                                             |
| **Chargebacks / disputas** — responsabilidade e fluxo com o parceiro                              |   ☐    |                                             |

---

## 7. O que o projecto **já** cobre vs o que é **negócio / legal**

| Área                           | No código / docs hoje                                                   | Falta típica para “ir a sério” com parceiro    |
| ------------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------- |
| Multi-frota / gestor `partner` | [`PARTNER_ONBOARDING.md`](../PARTNER_ONBOARDING.md), rotas `/partner/*` | Contratos e RGPD por escrito                   |
| Motoristas                     | Aprovação admin, estados de viagem                                      | Processo documental formal por motorista       |
| Pagamentos                     | Stripe, webhooks documentados                                           | Conta live, modelo fiscal, recibos             |
| Operação                       | `OPERATION_CHECKLIST`, cron, health                                     | Runbook sinistros + contacto 24h se necessário |

---

## 8. Próximos passos após a primeira reunião

1. Preencher a coluna **Notas** e marcar **Estado** com data.
2. Enviar ao **advogado** só o subconjunto que exige redacção (contratos, termos, DPA).
3. Enviar ao **contabilista** o modelo de comissão + Stripe + IVA.
4. Actualizar este `.md` quando houver decisões (uma linha por decisão no fim do ficheiro).

---

## 9. Registo de decisões (preencher ao longo do tempo)

| Data | Decisão | Onde ficou documentado (link ou ficheiro) |
| ---- | ------- | ----------------------------------------- |
|      |         |                                           |
