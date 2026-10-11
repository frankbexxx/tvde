# Corpo do dossier jurídico

## Objectivo da consulta

A Ventos Férteis, Lda. (marca **VAMULÁ**) prepara a operação de uma plataforma de intermediação TVDE em fase controlada. Pretende-se obter **parecer jurídico** sobre um conjunto fechado de questões que bloqueiam decisões internas de produto, compliance e arranque operacional.

Este dossier:

- separa **perguntas jurídicas** de detalhe técnico de implementação;
- descreve apenas o **contexto factual** necessário ao advogado;
- **não** antecipa conclusões legais nem substitui documentação interna completa.

**Estado:** rascunho interno (`DRAFT`) — **não constitui pedido de parecer formalmente enviado**.

---

## Contexto essencial da plataforma

**Entidade e marca.** A plataforma é operada por **Ventos Férteis, Lda.**, designação comercial **VAMULÁ**. A licença de **gestor de plataforma eletrónica TVDE** junto do IMT (referência interna **354/2026**, documentada internamente) está registada; **não** confundir com integração técnica IMT para validação de operadores, motoristas ou veículos.

**Modelo de papéis.** Decisão interna consolidada: o **parceiro TVDE (frota/operador licenciado)** é fonte de verdade **operacional** para documentação e relação com motoristas; a plataforma VAMULÁ presta **serviço tecnológico** de intermediação (decisão interna DEC-LEG-002).

**Utilizadores.** Passageiros, motoristas e parceiros (gestão de frota) interagem através da aplicação. Termos e política de privacidade públicos existem no site institucional; versionamento contratual in-app é parcial (ver findings abaixo).

**Fase actual.** Piloto / fase controlada: funcionalidades de compliance e pagamentos estão **parcialmente** implementadas; alguns mecanismos de enforcement estão desligados ou pendentes de validação externa antes de produção alargada.

**Pagamentos.** Cobrança ao passageiro via prestador de pagamentos (conta business); operação em modo de testes até decisão interna de activação em ambiente real (DEC-PAY-001 — referência apenas; não objecto deste dossier).

**Compliance viatura e documentos.** Existem gates internos de documentação e aprovação administrativa de motoristas/veículos; **não** são equivalentes a validação IMT automática (findings FIND-LEG-IMT-* e FIND-LEG-DRV-01).

**Dependência cruzada (não incluída como pergunta neste dossier).** Pedido técnico ao **IMT** sobre canal de validação (Q-EXT-IMT-001) corre em paralelo; a resposta pode informar a pergunta Q-EXT-LEG-001, sem substituir parecer jurídico.

---

## Decisões internas já tomadas (selecção)

| ID | Decisão (resumo) | Data | Impacto para este dossier |
|----|------------------|------|---------------------------|
| DEC-LEG-002 | Partner = titular/licenciado; plataforma = tecnologia | 2026-09-02 | Enquadra responsabilidades operador vs plataforma |
| DEC-LEG-003 | Gates compliance viatura previstos M2; flag de enforcement pode estar OFF | 2026-09-04 | Relaciona bloqueios internos vs obrigação legal |
| DEC-LEG-004 | Limite 10 h / 24 h com registo; enforcement efectivo em M2 | 2026-09-04 | Base para Q-EXT-LEG-002 |
| DEC-LEG-005 | Partner/frota = fonte operacional documental (≠ IMT) | 2026-09-02 | Q-EXT-LEG-001, Q-EXT-LEG-005 |
| DEC-LEG-006 | Pedir validação jurídica externa (este exercício) | 2026-09-02 | Justifica consulta |
| DEC-LEG-007 | Termos + privacidade bloqueantes M2 | 2026-09-02 | Contexto Q-EXT-LEG-004 |
| DEC-LEG-010 | Licença gestor plataforma IMT documentada (≠ API) | 2026-09-05 | Contexto licenciamento plataforma |
| DEC-PROD-002 | Termos/privacidade: registo + reaceitação versionada | 2026-09-25 | Q-EXT-LEG-004 |

---

## Findings jurídicos relevantes (selecção)

*Findings descrevem lacunas técnicas/operacionais identificadas internamente — **não** são conclusões de direito.*

| ID | Resumo | Gravidade | Impacto |
|----|--------|-----------|---------|
| FIND-LEG-IMT-01 | Integração IMT operador ausente | P0 | Q-EXT-LEG-001 |
| FIND-LEG-IMT-02 | Integração IMT motorista ausente | P0 | Q-EXT-LEG-001 |
| FIND-LEG-IMT-03 | Integração IMT veículo ausente | P0 | Q-EXT-LEG-001 |
| FIND-LEG-GATE-01 | Gate bloqueio operador (licença frota) ausente | P1 | Q-EXT-LEG-005 |
| FIND-LEG-DRV-01 | Bloqueio motorista/veículo parcial (aprovação interna) | P1 | Q-EXT-LEG-001, Q-EXT-LEG-005 |
| FIND-LEG-HRS-01 | Enforcement 10 h/24 h desligado em runtime | P1 | Q-EXT-LEG-002 |
| FIND-LEG-HRS-02 | Agregação cross-platform de tempos ausente | P2 | Q-EXT-LEG-002 |
| FIND-LEG-SOS-01 | SOS com 112 + partilha; validação externa pendente | PENDENTE EXTERNO | Q-EXT-LEG-003 |
| FIND-LEG-CTR-01 | Contratos adesão / versionamento in-app incompleto | P2 | Q-EXT-LEG-004 |

---

## Perguntas jurídicas

*Estado no registo interno: **PRONTO ENVIO** (ainda **não enviado** ao advogado).*

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

A plataforma dispõe de fluxos de onboarding, upload documental e aprovação administrativa; **não** dispõe de integração automática com sistemas IMT para os três eixos. Existe pedido técnico separado ao IMT (Q-EXT-IMT-001).

::: {custom-style="Q-EXT Label"}
Porque precisamos da resposta
:::

Bloqueia modelo operacional, comunicação a parceiros e critérios de «go-live» sem exposição a incumprimento.

::: {custom-style="Q-EXT Label"}
Impacto da resposta
:::

Define procedimento manual documentado vs exigência de integração imediata; afecta gates de activação de motoristas e veículos.

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

Como interpretar, para efeitos de **bloqueios** de operador, motorista e veículo, o standard de **«conhecimento»** ou **«devia ter conhecimento»** previsto no artigo 14.º do regime TVDE?

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

Afecta regras de suspensão, reactivação e responsabilidade da plataforma vs operador.

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

O que conta como **tempo de operação** para o limite de **10 horas em 24 horas**; qual o comportamento exigido **perto do limite** ou com viagem já iniciada; e como tratar **tempos agregados cross-platform**?

::: {custom-style="Q-EXT Label"}
Contexto mínimo
:::

Existe registo interno de tempos de condução; o enforcement automático pode estar desactivado pending parecer. Não há agregação com outras plataformas.

::: {custom-style="Q-EXT Label"}
Porque precisamos da resposta
:::

Decisão interna DEC-LEG-004 prevê enforcement em M2; activação sem enquadramento legal aumenta risco.

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

O mecanismo actual de **emergência** (contacto **112**, partilha de localização / snapshot de viagem) é **suficiente** enquanto requisito legal, ou exige integração PSAP, URL pública dedicada ou outro canal regulado?

::: {custom-style="Q-EXT Label"}
Contexto mínimo
:::

Funcionalidade de SOS disponível na app; matriz legal interna (L-19 a L-22) identificou requisitos a validar externamente.

::: {custom-style="Q-EXT Label"}
Porque precisamos da resposta
:::

Evitar lançamento com fundação incompleta ou investimento indevido em integrações não obrigatórias.

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

Termos gerais publicados no site; fluxo de aceitação versionada in-app está parcialmente implementado (M2.11). Não se junta minuta proposta neste dossier.

::: {custom-style="Q-EXT Label"}
Porque precisamos da resposta
:::

Contratos são pré-requisito M2 e comunicações AMT/IMT podem depender de modelo contratual.

::: {custom-style="Q-EXT Label"}
Impacto da resposta
:::

Roadmap legal e desenho de UX de aceitação.

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

Consultas procedimentais AMT/IMT existem em dossiers separados; aqui pretende-se enquadramento **legal** de deveres de comunicação.

::: {custom-style="Q-EXT Label"}
Porque precisamos da resposta
:::

Evitar omissões de comunicação formal e calendário interno de compliance.

::: {custom-style="Q-EXT Label"}
Impacto da resposta
:::

Processos internos, responsáveis e articulação com consultas fiscais/procedimentais.

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

Respostas podem ser entregues por email profissional ou documento separado; **não** se solicita nesta fase integração automática no registo interno.

---

## Anexos e referências (lista)

| Ref. | Descrição | Nota |
|------|-----------|------|
| — | Resposta futura IMT (Q-EXT-IMT-001) | Referência cruzada quando existir |
| — | Minutas contratuais | **Não** incluídas neste DRAFT |
| — | Capturas ou dados de viagens reais | **Excluídos** (sem PII) |

---

## Exclusões deliberadas deste dossier

- **Q-EXT-LEG-006** (art. 17.º-A): estado interno **PREPARAR** — aguarda checklist objectivo.
- Perguntas **fiscais**, **seguradora**, **Stripe** e procedimentos **AMT/IMT** puros: dossiers próprios.
