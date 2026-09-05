# Matriz legal → repo → gap — TVDE · 2026-09-04

**Tipo:** confronto operacional (requisito confirmado em source pack / research vs estado do repo)  
**Não é:** parecer jurídico · decisão A3/A6 · alteração de roadmap ou código  
**Fontes de inventário:** [`LEGAL_SOURCES_INDEX.md`](LEGAL_SOURCES_INDEX.md) · research auxiliar [`research/TVDE_LEGAL_RESEARCH_PERPLEXITY_2026-09-04.md`](research/TVDE_LEGAL_RESEARCH_PERPLEXITY_2026-09-04.md)  
**Regra:** conclusões da research/source pack **não** substituem PDF/DR arquivado + parecer; IDs abaixo são para priorização M2.

### Legenda

| Campo | Valores |
|-------|---------|
| **Estado no repo** | `IMPLEMENTADO` · `PARCIAL` · `AUSENTE` · `NÃO VERIFICADO` |
| **Gap** | `SEM GAP` · `GAP FUNCIONAL` · `GAP LEGAL/PROCESSO` · `GAP INTEGRAÇÃO` · `GAP COPY/UX` · `PENDENTE REGULAMENTAÇÃO` |
| **Impacto M2** | `BLOCKER M2` · `NECESSÁRIO M2` · `PODE SER PÓS-PILOTO` · `DEPENDE PARECER` · `FECHADO` *(ex-blocker fechado por fonte oficial)* |

---

## Matriz

| ID | Requisito confirmado | Fonte/artigo | Estado no repo | Gap | Impacto M2 | Código/docs afectados |
|----|----------------------|--------------|----------------|-----|------------|----------------------|
| **L-01** | Validação IMT do **operador** (licença) antes de ativação | Lei 45/2018 art. 20.º n.ºs 5–6; 20.º-A · IMT TVDE | `AUSENTE` | `GAP INTEGRAÇÃO` | `BLOCKER M2` | Sem cliente IMT; Partner onboarding só interno · **licença plataforma (L-26) ≠ validação operador TVDE** · A3 R02 |
| **L-02** | Validação IMT do **motorista** (carta / certificado TVDE ou táxi) | Art. 20.º n.º 6 al. a); art. 10.º · IMT certificação | `AUSENTE` | `GAP INTEGRAÇÃO` | `BLOCKER M2` | Docs motorista FE (`isDriverDocumentsReady`) ≠ consulta IMT · `driverDocuments.ts` |
| **L-03** | Validação IMT do **veículo** (registo, matrícula, idade, inspeção, seguro) | Art. 20.º n.º 6 al. b); art. 12.º | `AUSENTE` | `GAP INTEGRAÇÃO` | `BLOCKER M2` | PF3D docs internos Partner; sem IMT · `vehicle_compliance_*` · `PF3D_*` |
| **L-04** | Bloqueio de **operador** não conforme (conhecimento / devido) | Art. 14.º n.º 2; art. 20.º | `AUSENTE` | `GAP FUNCIONAL` | `BLOCKER M2` | Sem gate de licença Partner no matching/dispatch |
| **L-05** | Bloqueio de **motorista** não conforme | Art. 14.º n.º 2 | `PARCIAL` | `GAP FUNCIONAL` | `BLOCKER M2` | `DriverStatus.approved` + gate FE docs; **sem** IMT; BE `go_online` não valida docs pessoais |
| **L-06** | Bloqueio de **veículo** não conforme | Art. 14.º n.º 2; PF3D | `PARCIAL` | `GAP FUNCIONAL` | `BLOCKER M2` | Código PF3D-3A/B **existe**; `ENABLE_VEHICLE_COMPLIANCE_GATES=false` (A3-D03 / A6 OFF) |
| **L-07** | Limite **10 h / 24 h** de operação TVDE | Art. 13.º n.º 1 | `PARCIAL` | `GAP FUNCIONAL` | `DEPENDE PARECER` | Foundation [#548](https://github.com/frankbexxx/tvde/pull/548) (`c8d2c35`): **rolling 24h UTC**; dia civil removido; estados arriving+ongoing **provisórios**; ver § Driving-hours |
| **L-08** | Contagem **cross-platform** (todas as plataformas) | Art. 13.º n.º 1 | `AUSENTE` | `GAP INTEGRAÇÃO` | `DEPENDE PARECER` | Só dados desta app; sem feed IMT/outras plataformas |
| **L-09** | **Registo** de tempos de trabalho / limites | Art. 13.º n.º 2; 20.º n.º 3; 17.º-A | `PARCIAL` | `GAP FUNCIONAL` | `NECESSÁRIO M2` | Segmentos `DriverActiveDrivingSegment` + snapshot; retenção ≠ 2 anos |
| **L-10** | **Enforcement** / mecanismos que garantam o limite (impedir operação) | Art. 13.º; 17.º-A n.º 2 al. b) | `PARCIAL` | `GAP FUNCIONAL` | `BLOCKER M2` | Foundation #548: compliance ON · **`ENFORCEMENT=false`** deliberado; legacy `driving_rest_until` isolado; ver § Driving-hours |
| **L-11** | Retenção **2 anos** actividade operador/motorista/veículo | Art. 13.º n.º 3 | `PARCIAL` | `GAP LEGAL/PROCESSO` | `NECESSÁRIO M2` | **`PARCIAL — activity retention foundation implemented`** (2026-09-05): Trip `partner_id`/`vehicle_id`/`vehicle_plate` históricos · AuditEvent **730d** · sem purge Trip/segments · GPS history/complaints/IMT/docs versioning **ainda** pendentes |
| **L-12** | Retenção **2 anos** reclamações / processo | Art. 19.º n.º 3 | `AUSENTE` | `GAP LEGAL/PROCESSO` | `NECESSÁRIO M2` | Sem módulo reclamações/RAL com arquivo 2 anos |
| **L-13** | Comissão plataforma **≤ 25% sem IVA** | Art. 15.º n.º 3 | `PARCIAL` | `GAP FUNCIONAL` | `NECESSÁRIO M2` | Piloto **15%** (A1-D01); **sem** hard-cap 25% no settlement |
| **L-14** | Demonstração de **cálculo** (fórmula / fatores) antes e durante | Art. 15.º n.º 4 al. a); 19.º | `PARCIAL` | `GAP COPY/UX` | `NECESSÁRIO M2` | Preço estimado/final existe (`PRICING_DECISION`); breakdown legal incompleto |
| **L-15** | Mostrar **taxa de intermediação** ao utilizador | Art. 15.º n.º 4 / n.º 8 | `PARCIAL` | `GAP COPY/UX` | `NECESSÁRIO M2` | `commission_amount` em modelos/UI Driver; exposição Passageiro legal a fechar |
| **L-16** | **Fatura electrónica** pós-viagem (elementos art. 15.º n.º 8) | Art. 15.º n.º 8 · A3-D08 | `AUSENTE` | `GAP LEGAL/PROCESSO` | `NECESSÁRIO M2` | Sem emissor; A3-D08 adia escolha para pós A1/A2 + contabilista |
| **L-17** | **Reporting mensal AMT** (viagens, faturação, taxa) | Art. 30.º n.ºs 3–4 · AMT formulário | `AUSENTE` | `GAP LEGAL/PROCESSO` | `NECESSÁRIO M2` | Sem export alinhado ao Modelo Formulário TVDE |
| **L-18** | **Contribuição 5%** sobre taxas de intermediação | Art. 30.º n.º 2 | `AUSENTE` | `GAP LEGAL/PROCESSO` | `NECESSÁRIO M2` | Processo financeiro externo; app deve permitir apuramento |
| **L-19** | Serviço de **emergência passageiro** (chamada tempo real + localização) | Art. 19.º n.º 1 al. j); 17.º-A | `PARCIAL` | `GAP FUNCIONAL` | `BLOCKER M2` | **Foundation 2026-09-04:** SOS + `tel:112` + snapshot + share; **PENDENTE VALIDAÇÃO LEGAL** se exigir mais que foundation |
| **L-20** | Serviço de **emergência motorista** (idem) | Art. 19.º / 17.º-A | `PARCIAL` | `GAP FUNCIONAL` | `BLOCKER M2` | Idem foundation Driver |
| **L-21** | Chamada em tempo real às **autoridades** | Art. 19.º n.º 1 al. j) | `PARCIAL` | `GAP INTEGRAÇÃO` | `BLOCKER M2` | **IMPLEMENTADO** via `tel:112` (explícito); sem PSAP/API automática |
| **L-22** | **Partilha de localização** no fluxo de emergência | Art. 19.º; 17.º-A | `PARCIAL` | `GAP FUNCIONAL` | `BLOCKER M2` | Share nativo/clipboard + snapshot localização; sem URL pública/token |
| **L-23** | **Contratos de adesão** operadores + comunicação AMT | Arts. 5.º, 20.º n.ºs 8–9 | `AUSENTE` | `GAP LEGAL/PROCESSO` | `NECESSÁRIO M2` | Sem versionamento/aceitação/envio AMT na app |
| **L-24** | Disponibilizar contrato do operador ao **motorista** na inscrição | Art. 20.º n.º 10 | `AUSENTE` | `GAP COPY/UX` | `NECESSÁRIO M2` | Sem prova de disponibilização |
| **L-25** | **Reclamações** (Livro Electrónico) + informação **RAL** | Art. 19.º n.ºs 2–3 | `AUSENTE` | `GAP COPY/UX` | `NECESSÁRIO M2` | Sem UI/processo canónico |
| **L-26** | **Licença gestor de plataforma** IMT antes de intermediação | Art. 17.º n.º 1 | `IMPLEMENTADO` | `SEM GAP` | `FECHADO` *(ex-BLOCKER)* | **M2-L0 2026-09-05:** Ventos Férteis · **354/2026** · **06/01/2026** · lista IMT arquivada · [`VAMULA_VENTOS_FERTEIS_REGISTO_OFICIAL_2026.md`](VAMULA_VENTOS_FERTEIS_REGISTO_OFICIAL_2026.md) — **≠** integração técnica L1/L2 |
| **L-27** | Requisitos de **capacidade tecnológica** da plataforma | Art. 17.º n.º 4; 17.º-A | `PARCIAL` | `GAP LEGAL/PROCESSO` | `DEPENDE PARECER` | App existe; checklist 17.º-A incompleto vs lei |
| **L-28** | **Marca registada** (requisito de licenciamento) | Art. 17.º n.º 4 | `IMPLEMENTADO` | `SEM GAP` | `DEPENDE PARECER` *(só se surgirem obrigações extra)* | **VAMULÁ** marca nacional **734136** · titular Ventos Férteis · classe 39 · portal INPI (PDF síntese **NÃO ARQUIVADO**) |
| **L-29** | Comunicação **IMT/AMT** (alterações, cláusulas, reporte) | Arts. 17.º n.º 14; 5.º; 30.º | `AUSENTE` | `GAP LEGAL/PROCESSO` | `NECESSÁRIO M2` | Sem calendário/evidências na app |
| **L-30** | Portarias execução 59/2026 (formação, língua, dístico/QR, IMT ops) | Arts. 10.º/10.º-A/12.º/20.º-A | `AUSENTE` | `PENDENTE REGULAMENTAÇÃO` | `DEPENDE PARECER` | Não fechar software até publicação |

---

## Driving-hours — confronto explícito (pós-foundation #548 / 2026-09-04)

| Aspecto | Estado actual | Nota |
|---------|---------------|------|
| Tracking / cálculo | **ON** (`ENABLE_DRIVING_HOURS_COMPLIANCE=true`) | Rolling **24 h**; dia civil removido; 11h fixas removidas |
| Aviso / UI | **ON** (WARN) | Snapshot `warning` / `limit_reached` |
| Registo | **ON** (RECORD) | Segmentos + audits transição; `driving_rest_until` = **legacy** (não afecta limit/eligibility) |
| Enforcement bloqueante | **OFF** (`ENABLE_DRIVING_HOURS_ENFORCEMENT=false`) | Deliberado até parecer + decisão |
| Janela temporal | **Rolling 24 h** | Policy estados: arriving+ongoing (**TEMPORARY_POLICY_PENDING_LEGAL_CONFIRMATION**) |
| Cross-platform | **Ausente** | Só esta plataforma |
| Merge | `c8d2c35` · PR [#548](https://github.com/frankbexxx/tvde/pull/548) | 31 tests PASS |

### WARN + RECORD é suficiente para M2?

**Resposta operacional desta matriz: insuficiente** para afirmar cumprimento do art. 13.º / dever de “implementar mecanismos” que **garantam** o limite, se M2 = operação intermediada sob regime TVDE.

- **Gap exacto:** (1) enforcement OFF → operação continua após limite; (2) definição exacta de “operar” / estados / viagem no limite **pendente parecer**; (3) sem cross-platform.
- **Impacto:** `L-10` = `BLOCKER M2` para go-live licenciado; `L-07`/`L-08` = `DEPENDE PARECER`.
- **Não ligar enforcement** sem parecer + decisão A3 explícita.

---

## A6 / PF3D — confronto explícito

| Já existe | Falta para validação/bloqueio | Depende de IMT? | Manual temporário possível? |
|-----------|-------------------------------|-----------------|----------------------------|
| Partner frota + `vehicle_documents` + alertas PF3C | Validação positiva **IMT** antes de ativar | **Sim** (art. 20.º) | Upload/revisão humana **só** se **não** permitir operação irregular |
| Helper/API compliance PF3D-1/2 | Gates ON em prod | Parcial (docs internos ≠ IMT) | Gates OFF + frota incompleta = risco art. 14.º |
| Gates PF3D-3A/B atrás de flag **OFF** | Ligar flag **após** backfill + decisão A–E + parecer | Sim para conformidade legal plena | Processo Partner **sem** matching de viatura inválida |
| FE gate docs motorista | Gate BE + prova IMT | **Sim** | FE-only **não** basta |
| `DriverStatus.approved` Admin | Ligação a certificado/licença IMT | **Sim** | Aprovação Admin ≠ título IMT |

**A6 actual: insuficiente** para o dever de aceitar só entidades conformes e bloquear quando haja conhecimento/devido (arts. 14.º / 20.º).  
**Não ligar** `ENABLE_VEHICLE_COMPLIANCE_GATES` nesta tarefa.

---

## Contagens (desta matriz)

| Classificação Impacto M2 | Nº (aprox.) |
|--------------------------|-------------|
| `BLOCKER M2` | **11** (L-01…L-06, L-10, L-19…L-22) — **L-26 removido** 2026-09-05 |
| `NECESSÁRIO M2` | **13** (L-09, L-11…L-18, L-23…L-25, L-29) |
| `DEPENDE PARECER` | **5** (L-07, L-08, L-27, L-28, L-30) |
| `FECHADO` *(ex-blocker)* | **1** (L-26) |
| `PODE SER PÓS-PILOTO` | **0** nesta lista obrigatória |

*Nota:* “BLOCKER M2” = bloqueia **go-live TVDE licenciado / intermediação em conformidade**; não reabre M1 técnico já fechado.

---

## O que esta matriz **não** faz

- Não altera A3, A6, flags nem código.
- Arquivo de PDFs oficiais vive em [`LEGAL_SOURCES_INDEX.md`](LEGAL_SOURCES_INDEX.md) / `sources/` (esta matriz só referencia).
- Não afirma conformidade legal global fechada (L1/L2/enforcement/emergência legal continuam abertos conforme linhas).

**Próximo passo sugerido:** (1) parecer art. 13.º (estados / “operar” / enforcement) · (2) retention 2 anos + AMT · (3) IMT L1/L2 quando houver canal técnico oficial · (4) opcional: arquivar PDF síntese INPI 734136 quando descarregável.
