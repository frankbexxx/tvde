# Registo de consultas externas — TVDE

| Campo | Valor |
|-------|--------|
| **id** | REG-EXT-CONSULT |
| **title** | Consultas a advogado, fiscal, IMT, AMT, Stripe, seguradora |
| **type** | REGISTER |
| **created** | 2026-10-11 |
| **updated** | 2026-10-14 |
| **status** | ACTIVO |
| **owner** | Frank |
| **audience** | INTERNAL |

Cada linha liga **pergunta → envio → resposta → decisão interna** ([`DOCUMENT_GOVERNANCE.md`](../meta/DOCUMENT_GOVERNANCE.md) princípio 3). Resposta externa **não** altera o projecto até [`DECISIONS.md`](DECISIONS.md) datada.

**Working list (negócio):** [`TVDE_DECISOES_EXTERNAS_PENDENTES.md`](../business/TVDE_DECISOES_EXTERNAS_PENDENTES.md)

**Política e dossiers (Fase 4):** [`external/README.md`](../external/README.md) · templates [`external/templates/`](../external/templates/) · blueprints [`DRAFT_LEGAL_DOSSIER.md`](../external/templates/DRAFT_LEGAL_DOSSIER.md) · [`DRAFT_FISCAL_DOSSIER.md`](../external/templates/DRAFT_FISCAL_DOSSIER.md)

**Estados (pacote vs pergunta):** conteúdo source **`REVIEW`** · **`ENVIADO`** = pacote enviado (data) · aceitação mandato = campo separado · **`RESPONDIDO`/`INCORPORADO`/`FECHADO`** só após resposta e [`DECISIONS.md`](DECISIONS.md). Envio **não** fecha consulta nem incorpora decisão.

---

## Pacotes dossier (nível pacote)

| Pacote | Source `status` | Pacote enviado | Conteúdo enviado | Destinatário | Aceitação / mandato | Parecer | Incorporação `DECISIONS` | Fechado |
|--------|-----------------|----------------|------------------|--------------|---------------------|---------|--------------------------|---------|
| **EXT-LEG-2026-10-11** | **REVIEW** | **2026-10-14** | Dossier + **A1** + **A2** | Advogado (sem identificação) | **Pendente** | **Não recebido** | **Pendente após parecer** | **Não** |
| **EXT-FIS-2026-10-12** | **REVIEW** | — | Preparado: dossier + **A1–A3** (envio **não confirmado**) | Contabilista (sem identificação) | N/A | **Não recebido** | **N/A** | **Não** |

Checklist envio LEG: [`sources/EXT-LEG-2026-10-11/README_ENVIO.md`](../external/sources/EXT-LEG-2026-10-11/README_ENVIO.md) · FIS: [`sources/EXT-FIS-2026-10-12/README_ENVIO.md`](../external/sources/EXT-FIS-2026-10-12/README_ENVIO.md)

---

## Tabela principal

| ID | Data criação | Destinatário | Tema | Pergunta curta | Origem | Prioridade | Estado | Data envio | Data resposta | Decisão resultante | Evidência |
|----|--------------|--------------|------|----------------|--------|------------|--------|------------|---------------|-------------------|-----------|
| Q-EXT-LEG-001 | 2026-10-11 | Advogado | Validação IMT | Como cumprir validação **operador/motorista/veículo** (app actual); processo **manual temporário** aceitável? | `J1` · `J3` · `L-01`…`L-06` · `FIND-LEG-IMT-01`…`03` · `FIND-LEG-GATE-01` · `FIND-LEG-DRV-01` · `A3-D03-REV1` · [`TVDE_59_2026…`](../architecture/TVDE_59_2026_TECHNICAL_FINDINGS.md) §2 | P0 | **ENVIADO** | 2026-10-14 | — | — | Pacote **EXT-LEG-2026-10-11** |
| Q-EXT-LEG-002 | 2026-10-11 | Advogado | 10 h / 24 h | O que conta como **tempo de operação**; comportamento **perto do limite** / viagem iniciada; **cross-platform** | `J4` · `J5` · `J6` · `L-07` · `L-08` · `L-10` · `DEC-LEG-004` · `FIND-LEG-HRS-01` · `FIND-LEG-HRS-02` | P0 | **ENVIADO** | 2026-10-14 | — | — | Pacote **EXT-LEG-2026-10-11** |
| Q-EXT-LEG-003 | 2026-10-11 | Advogado | Emergência / SOS | SOS actual (**112** + snapshot + share) **suficiente**? Exige PSAP, URL pública ou outra integração? | `J7` · `L-19`…`L-22` · `FIND-LEG-SOS-01` · [`TVDE_DECISOES_PENDENTES…`](../business/TVDE_DECISOES_PENDENTES_M2_M3_2026-09-25.md) §C2 | P0 | **ENVIADO** | 2026-10-14 | — | — | Pacote **EXT-LEG-2026-10-11** |
| Q-EXT-LEG-004 | 2026-10-11 | Advogado | Contratos | Contratos **obrigatórios** (plataforma↔operador↔motorista↔passageiro); **minuta**, versionamento, **prova de aceitação** | `J8` · `L-23` · `L-24` · `FIND-LEG-CTR-01` · `DEC-PROD-002` | P0 | **ENVIADO** | 2026-10-14 | — | — | Pacote **EXT-LEG-2026-10-11** |
| Q-EXT-LEG-005 | 2026-10-11 | Advogado | Bloqueios art. 14.º | Interpretação **«conhecimento / devia ter conhecimento»** para bloqueios operador/motorista/veículo | `J10` · `L-04` · `L-05` · `L-06` | P0 | **ENVIADO** | 2026-10-14 | — | — | Pacote **EXT-LEG-2026-10-11** |
| Q-EXT-LEG-006 | 2026-10-11 | Advogado | Capacidade tecnológica | Checklist objectiva **art. 17.º-A** vs implementação actual da plataforma | `L-27` · [`TVDE_DECISOES_PENDENTES…`](../business/TVDE_DECISOES_PENDENTES_M2_M3_2026-09-25.md) §C2 · `L-30` *(matriz)* | P1 | PREPARAR | — | — | — | — |
| Q-EXT-LEG-007 | 2026-10-11 | Advogado | Comunicações regulatórias | Que **comunicações IMT/AMT** são obrigatórias (alterações, reporte, prazos) — enquadramento legal | `J9` · `L-29` · [`A3_REQUISITOS…`](../legal/A3_REQUISITOS_TVDE_SETEMBRO_2026.md) | P1 | **ENVIADO** | 2026-10-14 | — | — | Pacote **EXT-LEG-2026-10-11** |
| Q-EXT-IMT-001 | 2026-10-11 | IMT | Canal validação | **API/canal** oficial; identificadores; **periodicidade**; indisponibilidade; dados **cross-platform**; comunicações periódicas | `J2` · [`TVDE_DECISOES_PENDENTES…`](../business/TVDE_DECISOES_PENDENTES_M2_M3_2026-09-25.md) §C1 · `L-01` · `L-02` · `L-03` · `L-08` · `L-29` | P0 | PRONTO ENVIO | — | — | — | — |
| Q-EXT-AMT-001 | 2026-10-11 | AMT | Reporting mensal | **Formulário/modelo** TVDE vigente; **canal**; formato; **periodicidade**; requisitos de submissão | [`TVDE_DECISOES_PENDENTES…`](../business/TVDE_DECISOES_PENDENTES_M2_M3_2026-09-25.md) §C4 · `L-17` · `FIND-LEG-AMT-01` | P1 | PRONTO ENVIO | — | — | — | — |
| Q-EXT-AMT-002 | 2026-10-11 | AMT | Contratos | Requisitos de **comunicação dos contratos** de adesão (formato, canal, prazos) | §C4 · `L-23` · `J8` *(aspecto operacional AMT)* | P1 | PREPARAR | — | — | — | — |
| Q-EXT-FIS-001 | 2026-10-11 | Contabilista | Factura passageiro | **Quem emite** factura/documento ao passageiro; emissor/software; conteúdo obrigatório; integração | `F1` · `L-16` · `FIND-LEG-FIS-01` · `DEC-LEG-008` · `A3-D08` | P1 | PRONTO ENVIO | — | — | — | — |
| Q-EXT-FIS-002 | 2026-10-11 | Contabilista | Comissão 15% | **Base sem IVA** (≤25%); tratamento **IVA**; momento e prova da comissão **15%** | `F2` · `F3` · `L-13` · `FIND-LEG-L13` · `DEC-FIS-001` · `DEC-FIS-002` | P1 | PRONTO ENVIO | — | — | — | — |
| Q-EXT-FIS-003 | 2026-10-11 | Contabilista | AMT 5% | **Base de cálculo** e tratamento contabilístico da contribuição **5%** intermediação | `F6` · `L-18` · `FIND-LEG-AMT-02` | P1 | PRONTO ENVIO | — | — | — | — |
| Q-EXT-FIS-004 | 2026-10-11 | Contabilista | Acerto manual | Tratamento contabilístico do **acerto manual** semanal com Partner (modelo DEC-FIS-004) | `F4` · `DEC-FIS-004` · `DEC-BIZ-002` | P0 | PRONTO ENVIO | — | — | — | — |
| Q-EXT-FIS-005 | 2026-10-11 | Contabilista | Refunds / chargebacks | Contabilidade e **comunicação ao passageiro** em refunds/chargebacks | `F5` · `STRIPE-LIVE-02` | P1 | PRONTO ENVIO | — | — | — | — |
| Q-EXT-FIS-006 | 2026-10-11 | Contabilista | Portagens | Tratamento contabilístico de **portagens** pagas pelo passageiro e **fora** da comissão | [`TVDE_DECISOES_PENDENTES…`](../business/TVDE_DECISOES_PENDENTES_M2_M3_2026-09-25.md) §C3 · `DEC-FIS-002` | P1 | PRONTO ENVIO | — | — | — | — |
| Q-EXT-FIS-007 | 2026-10-11 | Contabilista | Arquivo mensal | **Documentação/ficheiros mensais** (AMT, arquivo viagens, conservação) | `F7` · `FIND-LEG-RET-01` · `L-11` | P1 | PREPARAR | — | — | — | — |
| Q-EXT-FIS-008 | 2026-10-11 | Contabilista | Tesouraria Stripe | Tratamento contabilístico de **valores recebidos pela plataforma** e **fees Stripe** (piloto absorve fee) | `DEC-FIS-009` · [`A1_MODELO…`](../business/A1_MODELO_ECONOMICO_SETEMBRO_2026.md) §6c | P1 | PREPARAR | — | — | — | — |
| Q-EXT-INS-001 | 2026-10-11 | Seguradora | Coberturas piloto | **Coberturas exigidas** para veículos/motoristas do piloto TVDE | `S1` · `O3` *(dados veículo)* · [`PARCEIRO_TVDE_CHECKLIST.md`](../legal/PARCEIRO_TVDE_CHECKLIST.md) | P0 | PREPARAR | — | — | — | — |
| Q-EXT-INS-002 | 2026-10-11 | Seguradora | Sinistros | **Processo de sinistro** (contacto, prazos, quem comunica ao passageiro) | `S2` · [`PARCEIRO_TVDE_CHECKLIST.md`](../legal/PARCEIRO_TVDE_CHECKLIST.md) | P0 | PRONTO ENVIO | — | — | — | — |
| Q-EXT-STRIPE-001 | 2026-10-11 | Stripe | Titularidade conta | Conta **business** em nome correcto (**titular** vs operador TVDE) e **responsável legal** | `ST1` · `ST4` · `DEC-PAY-001` | P1 | PREPARAR | — | — | — | — |
| Q-EXT-STRIPE-002 | 2026-10-11 | Stripe | KYB / KYC | Requisitos e estado **KYB/KYC** necessários antes de **Live** | `ST2` · `DEC-PAY-001` | P1 | PREPARAR | — | — | — | — |
| Q-EXT-STRIPE-003 | 2026-10-11 | Stripe | IBAN | **IBAN** e conta de liquidação associada à conta business | `ST3` | P1 | PREPARAR | — | — | — | — |

**EXT-LEG-2026-10-11:** pacote completo **enviado 2026-10-14** (dossier + A1 + A2); aceitação mandato **pendente**; **sem parecer**. **EXT-FIS-2026-10-12:** pacote preparado; **sem envio confirmado**. Campos **Decisão resultante** e **Data resposta** vazios até resposta externa e incorporação em [`DECISIONS.md`](DECISIONS.md). **Nenhuma** consulta **FECHADA**.

---

## 1. Consultas por destinatário

| Destinatário | Total | P0 | P1 | P2 |
|--------------|------:|---:|---:|---:|
| **Advogado** | 7 | 5 | 2 | 0 |
| **Contabilista** | 8 | 1 | 7 | 0 |
| **Seguradora** | 2 | 2 | 0 | 0 |
| **IMT** | 1 | 1 | 0 | 0 |
| **AMT** | 2 | 0 | 2 | 0 |
| **Stripe** | 3 | 0 | 3 | 0 |
| **Total** | **23** | **9** | **14** | **0** |

---

## 2. Enviadas — aguardam resposta (`ENVIADO`)

| ID | Destinatário | Data envio | Nota |
|----|--------------|------------|------|
| Q-EXT-LEG-001 | Advogado | 2026-10-14 | Pacote EXT-LEG; consolidar com resposta IMT quando existir |
| Q-EXT-LEG-002 | Advogado | 2026-10-14 | Alinhar com parecer antes de `ENABLE_DRIVING_HOURS_ENFORCEMENT` |
| Q-EXT-LEG-003 | Advogado | 2026-10-14 | Foundation SOS/112/snapshot no dossier |
| Q-EXT-LEG-004 | Advogado | 2026-10-14 | M2.11 como contexto, não minuta |
| Q-EXT-LEG-005 | Advogado | 2026-10-14 | Gates PF3D / approve admin |
| Q-EXT-LEG-007 | Advogado | 2026-10-14 | Complementa Q-EXT-AMT-* (legal vs procedimento) |

**Fora do pacote v1:** **Q-EXT-LEG-006** (art. 17.º-A) — continua **PREPARAR**.

---

## 2b. Prontas para envio (`PRONTO ENVIO`)

| ID | Destinatário | Nota |
|----|--------------|------|
| Q-EXT-IMT-001 | IMT | Pedido técnico único (§C1 M2) |
| Q-EXT-AMT-001 | AMT | Não implementar export inventado antes do modelo |
| Q-EXT-FIS-001 | Contabilista | Nota 1 pág. modelo comercial A1.4 |
| Q-EXT-FIS-002 | Contabilista | Ligar a runtime 15% + guard 0–25% |
| Q-EXT-FIS-003 | Contabilista | Distincto de Q-EXT-AMT-001 (apuramento vs formulário) |
| Q-EXT-FIS-004 | Contabilista | Semanal/2ª já DEC-FIS-004 |
| Q-EXT-FIS-005 | Contabilista | Ligar a runbook refund manual |
| Q-EXT-FIS-006 | Contabilista | Portagens 0% comissão VAMULÁ |
| Q-EXT-INS-002 | Seguradora | Procedimento geral; matrículas quando O3 fechado |

---

## 3. Bloqueadas por decisão interna (não são `Q-EXT`)

| Origem | Motivo |
|--------|--------|
| `O1` · `O2` | Operador/frota piloto — **Manel + Francisco** (não terceiro) |
| `O3` | Matrículas/titular/**seguro** — bloqueia dossier **Q-EXT-INS-001** |
| `O4` | Periodicidade acerto — **DEC-FIS-004 / DEC-BIZ-002** (DECIDIDO) |
| `O5` | Comprovativo/registo acerto — processo interno antes de pergunta fiscal fechada |
| `O6` | Quem suporta refunds **operacionalmente** — interno; contabilidade = Q-EXT-FIS-005 |
| `O7` | Suporte/incidentes — **DEC-BIZ-006** (horário/canal) |
| `O8` | Validação humana docs — **`S-COMP-03`** pendente Manel |
| `ST5` · `ST6` · `ST7` | Acesso Dashboard, **quando Live**, quem autoriza refunds — interno / **DEC-PAY-001** |
| `S-COMP-03` | Docs pessoais bloqueiam go-online — decisão produto, não consulta externa |

Consultas em **PREPARAR** (dossier incompleto): Q-EXT-LEG-006, Q-EXT-AMT-002, Q-EXT-FIS-007, Q-EXT-FIS-008, Q-EXT-INS-001, Q-EXT-STRIPE-001…003.

---

## 4. Respostas recebidas

*(vazio — 2026-10-14; envio LEG ≠ resposta)*

---

## REVIEW (fora da tabela)

| Tema | Motivo |
|------|--------|
| Sinistro **deslocação para pickup** (fora viagem activa) | Não há pergunta explícita equivalente a `S1`/`S2` nas fontes prioritárias; só checklist Partner genérico |
| **L-28** marca registada — obrigações extra | Matriz `DEPENDE PARECER`; não consta em [`TVDE_DECISOES_EXTERNAS_PENDENTES.md`](../business/TVDE_DECISOES_EXTERNAS_PENDENTES.md) |
| ~~**STRIPE-LIVE-01**~~ / **STRIPE-LIVE-03** | **01 fechado** B v2 STAGING · **03** fechado B1; não Q-EXT-STRIPE |
| OTP **S-AUTH-01** | **Prioridade canónica P1 Marco 2** (carril **C1**, [`ROADMAP_FINAL_ENTREGA_TVDE_2026.md`](../ROADMAP_FINAL_ENTREGA_TVDE_2026.md)); implementação **adiada** até go [`S-AUTH-01_OTP_SMS_DECISION.md`](../architecture/S-AUTH-01_OTP_SMS_DECISION.md) §13 · não consulta externa · histórico Setembro P0 = [`TVDE_STATUS_SETEMBRO_2026.md`](../archive/plans/TVDE_STATUS_SETEMBRO_2026.md) (arquivo) |

---

## Resumo

| Métrica | Valor |
|---------|------:|
| **Total consultas** | **23** |
| **PREPARAR** | **8** |
| **PRONTO ENVIO** | **9** |
| **ENVIADO** (aguarda resposta) | **6** |
| **RESPONDIDO / INCORPORADO / FECHADO** | **0** |
| **Total consolidado aberto** | *não calculado* (métricas por estado `Q-EXT` apenas) |
