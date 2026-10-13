# Corpo do dossier jurídico

## Objectivo da consulta

A Ventos Férteis, Lda. (marca **VAMULÁ**) prepara a operação de uma plataforma de intermediação TVDE em fase controlada. Pretende-se obter **parecer jurídico** sobre um conjunto fechado de questões que bloqueiam decisões internas de produto, conformidade e arranque operacional.

Este dossier:

- separa **perguntas jurídicas** de detalhe técnico de implementação;
- descreve apenas o **contexto factual** necessário ao advogado;
- **não** antecipa conclusões legais nem substitui documentação interna completa.

**Estado:** em revisão interna (`REVIEW`) — **não enviado** ao destinatário e **não constitui ainda** pedido de parecer formal.

**Regime legal considerado.** O enquadramento considerado neste dossier é o regime jurídico da actividade TVDE constante da **Lei n.º 45/2018**, na redacção vigente após as alterações introduzidas pela **Lei n.º 59/2026**. Esta referência **não** constitui interpretação legal nem substitui parecer.

---

## Contexto essencial da plataforma

**Entidade e marca.** A plataforma é operada por **Ventos Férteis, Lda.**, designação comercial **VAMULÁ**. A **licença n.º 354/2026** de **gestor de plataforma eletrónica TVDE** junto do IMT está documentada em registo interno alinhado com a lista oficial IMT; **não** confundir com integração técnica IMT para validação de operadores, motoristas ou veículos.

**Modelo de papéis.** Decisão interna consolidada: o **parceiro TVDE (frota/operador licenciado)** é fonte de verdade **operacional** para documentação e relação com motoristas; a plataforma VAMULÁ presta **serviço tecnológico** de intermediação (decisão interna DEC-LEG-002).

**Utilizadores.** Passageiros, motoristas e parceiros (gestão de frota) interagem através da aplicação. Termos e política de privacidade públicos existem no site institucional; o versionamento contratual na aplicação está parcial (ver lacunas abaixo).

**Fase actual.** Piloto / fase controlada: funcionalidades de conformidade e pagamentos estão **parcialmente** implementadas; alguns bloqueios automáticos de conformidade estão desactivados ou pendentes de validação externa antes de produção alargada. A **definição operacional final** da composição do piloto (operador TVDE, motoristas, frota e veículos) e o **processo humano** de validação documental pré-activação **permanecem sujeitos a confirmação interna** — **sem** identificação de operador, matrículas ou dados pessoais neste dossier.

**Pagamentos.** Cobrança ao passageiro via prestador de pagamentos (conta empresarial); operação em modo de testes até decisão interna de activação em ambiente real (DEC-PAY-001 — referência apenas; não objecto deste dossier).

**Conformidade viatura e documentos.** Existem controlos internos de documentação e aprovação administrativa de motoristas/veículos; **não** são equivalentes a validação IMT automática (lacunas FIND-LEG-IMT-* e FIND-LEG-DRV-01).

**Dependência cruzada (não incluída como pergunta neste dossier).** Pedido técnico ao **IMT** sobre canal de validação (Q-EXT-IMT-001) corre em paralelo; a resposta pode informar a pergunta Q-EXT-LEG-001, sem substituir parecer jurídico.

**Livro de Reclamações / RAL.** Na matriz legal interna, o requisito **L-25** (Livro de Reclamações e informação RAL) figura como **fechado** do ponto de vista de implementação registada; existe documentação interna de apoio. **Não** há pergunta jurídica dedicada (Q-EXT) neste dossier — apenas contexto para evitar omissão aparente; **não** se junta aqui registo operacional nem dados pessoais.

**Retenção de dados / evidência.** O finding interno **FIND-LEG-RET-01** regista internamente um período de retenção de **2 anos** para actividade/evidência. A **adequação jurídica** desse período e a **conformidade plena** da implementação **não** estão fechadas neste dossier e **podem** depender de parecer ou evolução técnica.

---

## Decisões internas já tomadas (selecção)

| ID | Decisão (resumo) | Data | Impacto para este dossier |
|----|------------------|------|---------------------------|
| DEC-LEG-002 | Parceiro TVDE = titular/licenciado; plataforma = tecnologia | 2026-09-02 | Enquadra responsabilidades operador face à plataforma |
| DEC-LEG-003 | Controlo de conformidade viatura previsto; bloqueios automáticos podem estar desactivados | 2026-09-04 | Relaciona bloqueios internos face à obrigação legal |
| DEC-LEG-004 | Limite 10 h / 24 h com registo; bloqueio efectivo antes de operação plena | 2026-09-04 | Base para Q-EXT-LEG-002 |
| DEC-LEG-005 | Parceiro/frota = fonte operacional documental (≠ IMT) | 2026-09-02 | Q-EXT-LEG-001, Q-EXT-LEG-005 |
| DEC-LEG-006 | Pedir validação jurídica externa (este exercício) | 2026-09-02 | Justifica consulta |
| DEC-LEG-007 | Termos + privacidade exigidos antes de operação plena | 2026-09-02 | Contexto Q-EXT-LEG-004 |
| DEC-LEG-010 | Licença gestor plataforma IMT documentada (≠ API) | 2026-09-05 | Contexto licenciamento plataforma |
| DEC-PROD-002 | Termos/privacidade: registo + reaceitação versionada | 2026-09-25 | Q-EXT-LEG-004 |

---

## Lacunas identificadas internamente relevantes para a consulta

*As entradas abaixo descrevem lacunas operacionais ou técnicas identificadas internamente — **não** constituem conclusões de direito.*

| ID | Resumo | Prioridade interna | Impacto |
|----|--------|-------------------|---------|
| FIND-LEG-IMT-01 | Integração IMT operador ausente | P0 | Q-EXT-LEG-001 |
| FIND-LEG-IMT-02 | Integração IMT motorista ausente | P0 | Q-EXT-LEG-001 |
| FIND-LEG-IMT-03 | Integração IMT veículo ausente | P0 | Q-EXT-LEG-001 |
| FIND-LEG-GATE-01 | Bloqueio de operador (licença de frota) ausente | P1 | Q-EXT-LEG-005 |
| FIND-LEG-DRV-01 | Bloqueio motorista/veículo parcial (aprovação interna) | P1 | Q-EXT-LEG-001, Q-EXT-LEG-005 |
| FIND-LEG-HRS-01 | Limite 10 h/24 h: bloqueio automático desactivado na configuração actual | P1 | Q-EXT-LEG-002 |
| FIND-LEG-HRS-02 | Sem soma de tempos entre diferentes plataformas TVDE | P2 | Q-EXT-LEG-002 |
| FIND-LEG-SOS-01 | SOS com 112 e partilha de viagem; **validação externa pendente** | — | Q-EXT-LEG-003 |
| FIND-LEG-CTR-01 | Contratos de adesão / versionamento na aplicação incompleto | P2 | Q-EXT-LEG-004 |

---

## Perguntas jurídicas

### Q-EXT-LEG-001

::: {custom-style="Q-EXT ID"}
Q-EXT-LEG-001
:::

::: {custom-style="Q-EXT Label"}
Pergunta
:::

Como deve a plataforma cumprir a validação de **operador**, **motorista** e **veículo** face ao estado actual da aplicação, e é juridicamente aceitável um **processo manual temporário** até existir canal IMT definitivo?

::: {custom-style="Q-EXT Label"}
Contexto mínimo
:::

A plataforma dispõe de fluxos de registo, envio documental e aprovação administrativa; **não** dispõe de integração automática com sistemas IMT para os três eixos. Existe pedido técnico separado ao IMT (Q-EXT-IMT-001).

::: {custom-style="Q-EXT Label"}
Porque precisamos da resposta
:::

Bloqueia modelo operacional, comunicação a parceiros e critérios de **entrada em produção** sem exposição a incumprimento.

::: {custom-style="Q-EXT Label"}
Impacto da resposta
:::

Define procedimento manual documentado face à exigência de integração imediata; afecta activação de motoristas e veículos na plataforma.

::: {custom-style="Q-EXT Label"}
Prioridade
:::

**P0**

**Referências internas:** DEC-LEG-003, DEC-LEG-005; FIND-LEG-IMT-01, FIND-LEG-IMT-02, FIND-LEG-IMT-03, FIND-LEG-GATE-01, FIND-LEG-DRV-01.

---

### Q-EXT-LEG-005

::: {custom-style="Q-EXT ID"}
Q-EXT-LEG-005
:::

::: {custom-style="Q-EXT Label"}
Pergunta
:::

Como interpretar, para efeitos de **bloqueios** de operador, motorista e veículo, o **critério de «conhecimento» ou «devia ter conhecimento»** previsto no artigo 14.º do regime TVDE?

::: {custom-style="Q-EXT Label"}
Contexto mínimo
:::

A plataforma prevê bloqueios técnicos e fluxos de aprovação interna; a articulação com deveres de diligência e momentos de bloqueio não está juridicamente fechada.

::: {custom-style="Q-EXT Label"}
Porque precisamos da resposta
:::

Necessário para desenhar política de bloqueio e prova documental perante autoridade.

::: {custom-style="Q-EXT Label"}
Impacto da resposta
:::

Afecta regras de suspensão, reactivação e responsabilidade da plataforma face ao operador.

::: {custom-style="Q-EXT Label"}
Prioridade
:::

**P0**

**Referências internas:** FIND-LEG-GATE-01, FIND-LEG-DRV-01; DEC-LEG-003, DEC-LEG-005.

---

### Q-EXT-LEG-002

::: {custom-style="Q-EXT ID"}
Q-EXT-LEG-002
:::

::: {custom-style="Q-EXT Label"}
Pergunta
:::

O que conta como **tempo de operação** para o limite de **10 horas em 24 horas**; qual o comportamento exigido **perto do limite** ou com viagem já iniciada; e como tratar **tempos acumulados pelo motorista em diferentes plataformas TVDE**?

::: {custom-style="Q-EXT Label"}
Contexto mínimo
:::

Existe registo interno de tempos de condução; o bloqueio automático pode estar desactivado, **pendente de parecer**. Não há soma de tempos **entre diferentes plataformas TVDE**.

::: {custom-style="Q-EXT Label"}
Porque precisamos da resposta
:::

A decisão interna DEC-LEG-004 prevê bloqueio efectivo antes da operação plena; activação sem enquadramento legal aumenta risco.

::: {custom-style="Q-EXT Label"}
Impacto da resposta
:::

Define regras de produto, alertas, recusa de novas viagens e registos probatórios.

::: {custom-style="Q-EXT Label"}
Prioridade
:::

**P0**

**Referências internas:** DEC-LEG-004; FIND-LEG-HRS-01, FIND-LEG-HRS-02.

---

### Q-EXT-LEG-003

::: {custom-style="Q-EXT ID"}
Q-EXT-LEG-003
:::

::: {custom-style="Q-EXT Label"}
Pergunta
:::

O mecanismo actual de **emergência** (contacto **112**, partilha de localização e **resumo da viagem em curso** para terceiros autorizados) é **suficiente** enquanto requisito legal, ou exige ligação a centros de atendimento de emergência (PSAP), página pública dedicada ou outro canal regulado?

::: {custom-style="Q-EXT Label"}
Contexto mínimo
:::

Funcionalidade de SOS disponível na aplicação; análise legal interna (referências L-19 a L-22) identificou requisitos a validar externamente.

::: {custom-style="Q-EXT Label"}
Porque precisamos da resposta
:::

Evitar início de operação com mecanismo juridicamente insuficiente ou investimento indevido em integrações não obrigatórias.

::: {custom-style="Q-EXT Label"}
Impacto da resposta
:::

Priorização de desenvolvimento e comunicação a utilizadores.

::: {custom-style="Q-EXT Label"}
Prioridade
:::

**P0**

**Referências internas:** FIND-LEG-SOS-01; DEC-LEG-006.

---

### Q-EXT-LEG-004

::: {custom-style="Q-EXT ID"}
Q-EXT-LEG-004
:::

::: {custom-style="Q-EXT Label"}
Pergunta
:::

Que **contratos** são juridicamente exigidos entre plataforma, operador, motorista e passageiro; que exigências de **minuta**, **versionamento** e **prova de aceitação** se impõem?

::: {custom-style="Q-EXT Label"}
Contexto mínimo
:::

Termos gerais publicados no site; o fluxo de aceitação versionada na aplicação está parcialmente implementado. Não se junta minuta proposta neste dossier.

::: {custom-style="Q-EXT Label"}
Porque precisamos da resposta
:::

Contratos são pré-requisito para operação plena; comunicações AMT/IMT podem depender de modelo contratual.

::: {custom-style="Q-EXT Label"}
Impacto da resposta
:::

Plano de implementação contratual e **fluxo de aceitação na aplicação**.

::: {custom-style="Q-EXT Label"}
Prioridade
:::

**P0**

**Referências internas:** DEC-PROD-002, DEC-LEG-007; FIND-LEG-CTR-01.

---

### Q-EXT-LEG-007

::: {custom-style="Q-EXT ID"}
Q-EXT-LEG-007
:::

::: {custom-style="Q-EXT Label"}
Pergunta
:::

Que **comunicações** às entidades reguladoras (IMT, AMT) são **legalmente obrigatórias** (alterações relevantes, reporte, prazos), independentemente dos formulários procedimentais?

::: {custom-style="Q-EXT Label"}
Contexto mínimo
:::

Questões sobre **formulários, canais e prazos** junto de IMT e AMT serão tratadas **separadamente** em consultas procedimentais; neste dossier pretende-se o enquadramento **legal** dos deveres de comunicação.

::: {custom-style="Q-EXT Label"}
Porque precisamos da resposta
:::

Evitar omissões de comunicação formal e calendário interno de conformidade.

::: {custom-style="Q-EXT Label"}
Impacto da resposta
:::

Processos internos, responsáveis e articulação com consultas fiscais e procedimentais.

::: {custom-style="Q-EXT Label"}
Prioridade
:::

**P1**

**Referências internas:** documentação A3 e matriz legal L-29 (fontes internas).

---

## Forma de resposta pretendida

Solicita-se, por pergunta ou globalmente:

- orientação jurídica aplicável ao regime TVDE vigente;
- riscos principais e grau de urgência;
- indicação de documentação ou comunicações adicionais recomendadas;
- referência a alterações legislativas relevantes se aplicável.

Respostas podem ser entregues por email profissional ou documento separado; **não** se solicita nesta fase registo automático das respostas nos sistemas internos.

---

## Anexos e referências (lista)

| Ref. | Descrição | Nota |
|------|-----------|------|
| — | Resposta futura IMT (Q-EXT-IMT-001) | Referência cruzada quando existir |
| — | Registo interno L-25 (Livro de Reclamações / RAL) | Disponível **se pedido**; sem dados operacionais |
| — | Minutas contratuais | **Não** incluídas nesta versão em revisão |
| — | Capturas ou dados de viagens reais | **Excluídos** (sem dados pessoais) |

---

## Exclusões deliberadas deste dossier

- **Q-EXT-LEG-006** (art. 17.º-A): consulta ainda em preparação interna — aguarda checklist objectivo.
- Perguntas **fiscais**, **seguradora**, **pagamentos** e procedimentos **AMT/IMT** meramente procedimentais: tratadas noutras consultas.
