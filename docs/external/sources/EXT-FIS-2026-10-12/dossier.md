# Corpo do dossier fiscal/contabilístico

## Objectivo da consulta

A Ventos Férteis, Lda. (marca **VAMULÁ**) opera uma plataforma de intermediação TVDE em **fase piloto controlada**. Pretende-se obter **orientação fiscal e contabilística** sobre o modelo de receitas, liquidação ao parceiro TVDE, documentos ao passageiro e tratamento de pagamentos, **sem** antecipar conclusões nem substituir a documentação interna completa.

Este dossier:

- descreve apenas **factos e decisões internas** relevantes para o contabilista;
- formula **perguntas fechadas** já registadas internamente;
- **não** constitui parecer, **não** envia documentação sensível (IBAN, NIF pessoais, etc.).

**Estado:** em revisão interna (`REVIEW`) — **não enviado** ao destinatário.

---

## Contexto essencial do modelo (nota factual)

Os pontos abaixo reflectam o **estado documentado no projecto**; **não** são conclusões fiscais.

**Cobrança.** O **passageiro paga à plataforma** (prestador de pagamentos); a plataforma **não** liquida automaticamente ao motorista no piloto.

**Liquidação ao parceiro.** No piloto, o **acerto com o parceiro TVDE (frota)** é **manual**, com cadência **semanal / segunda-feira** acordada internamente; beneficiário da liquidação = parceiro/frota; valores de motorista na aplicação servem sobretudo de **referência contabilística**.

**Comissão comercial.** Comissão de intermediação do piloto = **15%** (decisões internas A1.4 / acta operacional 2026-09-09).

**Pagamentos automáticos.** **Stripe Connect**, **split** e **payouts automáticos** **não** são requisito do piloto; mantém-se liquidação manual.

**Stripe Live.** Ambiente de pagamentos real (**Live**) está **preparado tecnicamente** mas **sujeito a gate** operacional e decisões internas (não activado por defeito nesta fase).

**Portagens.** No modelo económico actual, as **portagens não entram na base da comissão** da plataforma (comissão sobre valor com portagens excluídas quando aplicável); tratamento contabilístico exacto = objecto de consulta.

**Contribuição AMT (5%).** A **regra económica** (5% sobre a taxa de intermediação **sem IVA**) está descrita internamente; **apuramento contabilístico e IVA** não estão fechados no produto.

**Refunds e chargebacks.** Processo **operacional** de reembolsos **não está fechado** (inclui limitações de integração automática); existe runbook de reembolso manual em piloto.

**Documento ao passageiro.** **Factura electrónica / documento fiscal** pós-viagem **não implementado** (decisão interna: escolha de emissor após A1/A2 + contabilista).

**Divergência interna — base da comissão (não resolver aqui).** Existe **divergência documental** sobre a base de cálculo da comissão:

- alguns documentos internos referem **`final_price × commission_percent`** (preço final bruto);
- outros (incl. descrição do funcionamento actual) referem base **`final_price − portagens`** (portagens fora da comissão).

**Não** se adopta uma formulação neste dossier; o esclarecimento é pedido na **Q-EXT-FIS-002**.

**Lacuna operacional O5 (comprovativo do acerto).** O **processo e comprovativo** do acerto semanal manual (onde fica registado, quem valida) **ainda não está totalmente fechado** internamente. Isto **não impede** formular a pergunta contabilística sobre o acerto; **não** se descreve aqui um procedimento ou documento inventado.

---

## Decisões internas já tomadas (selecção)

| ID | Decisão (resumo) | Data | Impacto para este dossier |
|----|------------------|------|---------------------------|
| DEC-BIZ-001 | Comissão plataforma piloto **15%** | 2026-09-09 | Contexto Q-EXT-FIS-002 |
| DEC-BIZ-002 | Settlement parceiro: **semanal / segunda / manual** | 2026-09-09 | Q-EXT-FIS-004 |
| DEC-FIS-001 | Comissão piloto **15%**; tiers 12%/12,5% só futuro | 2026-09-03 | Q-EXT-FIS-002 |
| DEC-FIS-002 | Base comissão = **preço final bruto**; fees Stripe **fora** da base | 2026-09-03 | Q-EXT-FIS-002, Q-EXT-FIS-006 |
| DEC-FIS-003 | Beneficiário liquidação piloto = **Partner/Frota** | 2026-09-03 | Q-EXT-FIS-004 |
| DEC-FIS-004 | Liquidação **semanal / segunda / manual** (viagens concluídas) | 2026-09-03 | Q-EXT-FIS-004 |
| DEC-FIS-005 | **Stripe Connect / split** não requisito piloto | 2026-09-03 | Contexto |
| DEC-FIS-006 | **Payouts automáticos** não requisito piloto | 2026-09-03 | Contexto |
| DEC-FIS-009 | Piloto: plataforma **absorve fee Stripe**; passageiro paga só preço final | 2026-09-03 | Contexto (tesouraria v2) |
| DEC-FIS-011 | Tarifário V1 + **15% fixa** fechados (A1.4) | 2026-09-18 | Contexto global |
| DEC-PAY-001 | **Stripe Live adiado** até imediatamente antes piloto real | 2026-09-25 | Timing facturação real |
| DEC-LEG-008 | Recibos/faturação **após** A1/A2 + contabilista | 2026-09-02 | Q-EXT-FIS-001 |

---

## Lacunas identificadas internamente relevantes para a consulta

*Lacunas operacionais ou técnicas — **não** são conclusões fiscais.*

| ID | Resumo | Prioridade interna | Impacto |
|----|--------|-------------------|---------|
| FIND-LEG-FIS-01 | Factura electrónica **ausente** | P1 | Q-EXT-FIS-001 |
| FIND-LEG-L13 | Comissão ≤25%: guard OK; base **sem IVA** por validar | — | Q-EXT-FIS-002 |
| FIND-LEG-AMT-02 | Apuramento contribuição **AMT 5%** ausente no produto | P2 | Q-EXT-FIS-003 |
| STRIPE-LIVE-02 | Refunds: integração automática **incompleta**; runbook manual | P1 | Q-EXT-FIS-005 |

---

## Perguntas externas (contabilista / TOC)

### Q-EXT-FIS-004

::: {custom-style="Q-EXT ID"}
Q-EXT-FIS-004
:::

::: {custom-style="Q-EXT Label"}
Pergunta
:::

Qual o **tratamento contabilístico** do **acerto manual semanal** com o parceiro TVDE (modelo de liquidação descrito nas decisões internas DEC-FIS-004 e DEC-BIZ-002)?

::: {custom-style="Q-EXT Label"}
Contexto mínimo
:::

Semanalmente (segunda-feira), sobre viagens **concluídas**, a plataforma calcula montantes e efectua acerto **manual** ao parceiro; **não** há Connect/split automático no piloto. Relatório mínimo interno previsto (viagens, preços, comissão, líquido parceiro). Comprovativo formal (**O5**) ainda em definição interna.

::: {custom-style="Q-EXT Label"}
Porque precisamos da resposta
:::

Sem enquadramento contabilístico não há processo de fecho nem prova coerente com a operação piloto.

::: {custom-style="Q-EXT Label"}
Impacto da resposta
:::

Define contas, momentos de registo, documentos suportados e reconciliação com movimentos bancários.

::: {custom-style="Q-EXT Label"}
Prioridade
:::

**P0**

**Referências internas:** DEC-FIS-004, DEC-BIZ-002, DEC-FIS-003; lacuna O5 (processo interno).

---

### Q-EXT-FIS-002

::: {custom-style="Q-EXT ID"}
Q-EXT-FIS-002
:::

::: {custom-style="Q-EXT Label"}
Pergunta
:::

Como tratar a **comissão de 15%**: **base sem IVA** (≤25%), **IVA** aplicável, **momento** de reconhecimento e **prova** da comissão?

::: {custom-style="Q-EXT Label"}
Contexto mínimo
:::

Comissão piloto **15%** acordada; guard legal 0–25% implementado antes da captura de pagamento. **Divergência documental interna** sobre base: `final_price × percentagem` **vs** `(final_price − portagens) × percentagem` — ver secção de contexto. Fees Stripe tratadas como **fora** da base da comissão (DEC-FIS-002); plataforma **absorve** fee Stripe no piloto (DEC-FIS-009).

::: {custom-style="Q-EXT Label"}
Porque precisamos da resposta
:::

Bloqueia fecho fiscal do modelo de receita da plataforma e alinhamento com art. 15.º (matriz L-13).

::: {custom-style="Q-EXT Label"}
Impacto da resposta
:::

Define registos contabilísticos, documentos de suporte e eventuais ajustes ao modelo de dados (sem presumir alteração técnica).

::: {custom-style="Q-EXT Label"}
Prioridade
:::

**P1**

**Referências internas:** DEC-FIS-001, DEC-FIS-002, DEC-BIZ-001, DEC-FIS-011; FIND-LEG-L13; matriz L-13.

---

### Q-EXT-FIS-001

::: {custom-style="Q-EXT ID"}
Q-EXT-FIS-001
:::

::: {custom-style="Q-EXT Label"}
Pergunta
:::

**Quem emite** a factura ou documento equivalente ao **passageiro**; que **emissor/software**; que **conteúdo obrigatório**; que **integração** é exigida?

::: {custom-style="Q-EXT Label"}
Contexto mínimo
:::

Passageiro paga via plataforma; **não** existe emissor de factura electrónica integrado. Decisão interna adia escolha de emissor (DEC-LEG-008). Questões puramente jurídicas de enquadramento (L-16) tratadas noutra consulta — aqui foco **contabilístico/fiscal-prático**.

::: {custom-style="Q-EXT Label"}
Porque precisamos da resposta
:::

Sem documento ao passageiro não há conformidade operacional nem base para arquivo fiscal.

::: {custom-style="Q-EXT Label"}
Impacto da resposta
:::

Plano de implementação documental e escolha de fornecedor/certificação.

::: {custom-style="Q-EXT Label"}
Prioridade
:::

**P1**

**Referências internas:** DEC-LEG-008; FIND-LEG-FIS-01; matriz L-16.

---

### Q-EXT-FIS-003

::: {custom-style="Q-EXT ID"}
Q-EXT-FIS-003
:::

::: {custom-style="Q-EXT Label"}
Pergunta
:::

Qual a **base de cálculo** e o **tratamento contabilístico** da contribuição **AMT 5%** sobre taxas de intermediação?

::: {custom-style="Q-EXT Label"}
Contexto mínimo
:::

Regra económica interna: 5% sobre taxa de intermediação **sem IVA** (com 15% → 0,75% da base dos 15% em simulação documental). **Não** confundir com pedido de **formulário/canal AMT** (consulta procedimental separada). Apuramento **não** implementado no produto.

::: {custom-style="Q-EXT Label"}
Porque precisamos da resposta
:::

Necessário para provisões/contas e distinção face a outras taxas.

::: {custom-style="Q-EXT Label"}
Impacto da resposta
:::

Processos mensais de apuramento e ligação eventual a reporting AMT (fora deste dossier).

::: {custom-style="Q-EXT Label"}
Prioridade
:::

**P1**

**Referências internas:** FIND-LEG-AMT-02; matriz L-18; A1 §6d (regra económica).

---

### Q-EXT-FIS-006

::: {custom-style="Q-EXT ID"}
Q-EXT-FIS-006
:::

::: {custom-style="Q-EXT Label"}
Pergunta
:::

Qual o **tratamento contabilístico** das **portagens** pagas pelo passageiro e **fora** da comissão da plataforma?

::: {custom-style="Q-EXT Label"}
Contexto mínimo
:::

Modelo económico: comissão da plataforma **0%** sobre portagens; portagens podem integrar preço final cobrado ao passageiro. Tratamento contabilístico **não** fechado externamente.

::: {custom-style="Q-EXT Label"}
Porque precisamos da resposta
:::

Evita classificação incorrecta de receita vs reembolso de despesas de terceiros.

::: {custom-style="Q-EXT Label"}
Impacto da resposta
:::

Contas, documentos e reconciliação com parceiro e passageiro.

::: {custom-style="Q-EXT Label"}
Prioridade
:::

**P1**

**Referências internas:** DEC-FIS-002; A1 (portagens fora da comissão); nota divergência base comissão (Q-EXT-FIS-002).

---

### Q-EXT-FIS-005

::: {custom-style="Q-EXT ID"}
Q-EXT-FIS-005
:::

::: {custom-style="Q-EXT Label"}
Pergunta
:::

Como registar **contabilisticamente** **refunds** e **chargebacks** e como **comunicar** ao passageiro?

::: {custom-style="Q-EXT Label"}
Contexto mínimo
:::

Integração automática de reembolsos **incompleta**; reembolso manual via prestador de pagamentos possível em piloto (runbook interno). **Não** se pede ao contabilista desenho de software — apenas tratamento contabilístico e deveres de comunicação.

::: {custom-style="Q-EXT Label"}
Porque precisamos da resposta
:::

Operação piloto e Live futuro exigem política clara de estornos e prova.

::: {custom-style="Q-EXT Label"}
Impacto da resposta
:::

Procedimentos internos, contas e mensagens ao passageiro.

::: {custom-style="Q-EXT Label"}
Prioridade
:::

**P1**

**Referências internas:** STRIPE-LIVE-02; DEC-PAY-001; runbook refund (referência interna, sem anexo sensível neste DRAFT).

---

## Forma de resposta pretendida

Solicita-se, por pergunta ou globalmente:

- orientação fiscal/contabilística aplicável ao regime TVDE e IVA em vigor;
- contas e momentos de registo recomendados;
- documentos de suporte exigidos;
- riscos ou prioridades de implementação.

Respostas por email profissional ou documento separado; **não** se solicita nesta fase alteração automática de registos internos.

---

## Anexos e referências (lista)

| Ref. | Descrição | Nota |
|------|-----------|------|
| — | Resumo tarifário A1.4 (15%, portagens, cancel fee) | A extrair de doc interno; **sem** IBAN |
| — | Exemplo **anonimizado** estrutura de preço viagem | Opcional v2 |
| — | Runbook reembolso piloto | Referência interna; **não** incluído nesta versão |

---

## Exclusões deliberadas desta versão

- **Q-EXT-FIS-007** — arquivo mensal / documentação mensal AMT;
- **Q-EXT-FIS-008** — tesouraria Stripe e fees (dossier v2);
- **Q-EXT-AMT-001** — formulário/canal/procedimento **AMT** (destinatário autoridade);
- **Consultas jurídicas** (dossier advogado separado);
- **SAF-T / AT / software certificado** — sem Q-EXT fechada; não inferir;
- **Reconciliação mensal** além do acerto semanal descrito;
- **Arredondamentos** — não formulados como pergunta autónoma;
- **Documento fiscal VAMULÁ → Partner** como pergunta separada (pode surgir da resposta a FIS-004).
