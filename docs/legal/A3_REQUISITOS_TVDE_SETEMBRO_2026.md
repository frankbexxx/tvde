# A3 — Requisitos legais TVDE aplicáveis (Setembro 2026)

**Tipo:** matriz operacional a partir de fontes **já no repo** — **não** é parecer jurídico  
**Data análise:** 2026-09-02 · **Decisões A3-D01…D08:** 2026-09-02 (**DONE**)  
**IDs:** `S-COMP-04` · `LEGAL-TVDE-001` · roadmap etapa **A3**  
**Estado:** **PARCIAL** — decisões internas de produto/operação **fechadas**; validação jurídica externa e arquivo de diplomas TVDE clássicos **pendentes**

---

## 1. Resumo executivo

| Ponto | Conclusão |
|-------|-----------|
| Fonte legal bruta no repo | **Só** o DL n.º **84/2026** ([`LEGAL_SOURCES_INDEX.md`](LEGAL_SOURCES_INDEX.md)) |
| O que o DL 84/2026 regula | Tacógrafo; tempos de condução/pausas/repouso (Reg. 561/2006); organização do tempo de trabalho de **trabalhadores móveis** / condutores independentes **no âmbito** desse regime; destacamento; contraordenações |
| O que o DL 84/2026 **não** é | Diploma de **licenciamento de plataforma TVDE**, nem checklist de documentos de viatura/motorista TVDE, nem PF3D |
| Menção a TVDE no PDF | Associações TVDE foram **ouvidas** (consulta) — **não** cria, por si, obrigações de app/plataforma |
| Aplicabilidade a motoristas/veículos TVDE ligeiros | **`INCERTO / VALIDAR`** — Art. 2.º DL 84 · **A3-D06** = validação externa **agora** |
| Lei TVDE “clássica” | **Não arquivada** · **A3-D01** = arquivar fontes oficiais (sem inventar) · **`REQUER PESQUISA/FONTE OFICIAL`** |
| Titular vs plataforma (**A3-D02**) | Partner/entidade operacional Manel = titular/licenciado da operação TVDE; TVDE-APP = plataforma tecnológica (*terminologia exacta → validação jurídica*) |
| Documentos (**A3-D05**) | Partner/Frota = fonte de verdade operacional — **não reabrir** |
| A6 / gates viatura (**A3-D03**) | `ENABLE_VEHICLE_COMPLIANCE_GATES` **OFF** até validação jurídica; A6 **fora** do crítico |
| Driving-hours (**A3-D04** / **A3.8**) | Tracking/avisos/registos **ON**; enforcement bloqueante **OFF** (`ENABLE_DRIVING_HOURS_ENFORCEMENT=false`); rever após parecer jurídico |
| Termos + Privacidade (**A3-D07**) | **Bloqueantes Marco 2**; **não** bloqueiam Marco 1 |
| Recibos/faturação (**A3-D08**) | Após A1/A2 + contabilista; **sem** escolher emissor agora |
| Automatização na app | Obrigação legal **≠** obrigação de a app bloquear/suspender automaticamente |

**Princípio seguido:** não converter hipóteses, checklists ou desejos de produto em obrigação `SIM`.

---

## 1b. Lacuna de fontes — o que falta arquivar (A3-D01)

**No repo hoje:** apenas `LEGAL-TVDE-001` (DL 84/2026).  
**Não há** em `docs/legal/sources/` nem no índice qualquer diploma TVDE de licenciamento/operação com **número oficial** citado de forma normativa.

| O que falta | Estado |
|-------------|--------|
| Diploma(s) oficiais que regem **licença operador TVDE**, veículos, motoristas, seguros e deveres de informação ao passageiro em Portugal | **`REQUER PESQUISA/FONTE OFICIAL`** — Diário da República / IMT / advogado **antes** de arquivar; **não** inventar números de lei; **não** usar blogs |
| PDFs oficiais + entradas em [`LEGAL_SOURCES_INDEX.md`](LEGAL_SOURCES_INDEX.md) (ex. `LEGAL-TVDE-002`…) | Pendente após identificação oficial |
| RGPD: texto consolidado opcional no repo | Útil; não substitui política/DPA (A3-D06/D07) |

*[`PARCEIRO_TVDE_CHECKLIST.md`](PARCEIRO_TVDE_CHECKLIST.md) e auditorias antigas mencionam IMT/licença em linguagem operacional — **não** contam como fonte normativa arquivada.*

---

## 2. Fontes usadas

| ID / doc | Natureza | Uso nesta A3 |
|----------|----------|--------------|
| [`LEGAL_SOURCES_INDEX.md`](LEGAL_SOURCES_INDEX.md) | Índice | Inventário oficial do repo |
| [`sources/decreto-lei-84-2026-tvde-transporte-rodoviario.pdf`](sources/decreto-lei-84-2026-tvde-transporte-rodoviario.pdf) | Diploma bruto | Objeto, âmbito (Arts. 1.º–2.º), temas sociais/tacógrafo/registos |
| [`PARCEIRO_TVDE_CHECKLIST.md`](PARCEIRO_TVDE_CHECKLIST.md) | Checklist **conversa** (não parecer) | Temas típicos — **INCERTO** até validação jurídica |
| [`PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md`](../ops/PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md) | Decisão/arquitectura produto | Gates **OFF** |
| [`PRICING_DECISION.md`](../PRICING_DECISION.md) | Decisão produto | Estimativa vs preço final |
| [`MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md`](../product/MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md) | Backlog produto/[Legal] | Itens a validar |
| Código driving hours | Implementação produto | **A3.8 DONE** — WARN+RECORD; bloqueio só se `ENABLE_DRIVING_HOURS_ENFORCEMENT=true` |

**Não usados como verdade normativa:** auditorias Maio, roadmaps antigos, benchmarks Uber/Bolt, blogs.

---

## 3. Matriz de requisitos

*(Inalterada na classificação; decisões de produto em §8 não transformam `INCERTO` em `SIM` sem parecer.)*

Legenda **Obrigatório?** → `SIM` · `NÃO` · `INCERTO / VALIDAR`  
Legenda **Impacto na APP** → `APP TEM DE IMPEDIR` · `APP TEM DE AVISAR` · `APP TEM DE REGISTAR` · `APP TEM DE MOSTRAR` · `PODE SER PROCESSO OPERACIONAL/HUMANO` · `SEM IMPACTO TÉCNICO` · `INCERTO`

| ID | Requisito | Quem afecta | Obrigatório? | Operação necessária | Impacto na APP | Fonte |
|----|-----------|-------------|--------------|---------------------|----------------|-------|
| R01 | Licenciamento da **plataforma** digital perante autoridades | Plataforma | **INCERTO / VALIDAR** | Esclarecer título próprio vs só operador TVDE | `INCERTO` · ops: A3-D02 (plataforma ≠ titular) | Checklist §1–2 |
| R02 | Licença / autorização **operador TVDE** (parceiro) | Partner/Frota | **INCERTO / VALIDAR** | Manter licença válida; comunicações IMT | `PODE SER PROCESSO OPERACIONAL/HUMANO` | Checklist §2 · A3-D02 |
| R03 | Capacidade / idoneidade do **motorista** TVDE | Driver · Partner | **INCERTO / VALIDAR** | Processo documental e aprovação | `INCERTO` (gates OFF) | Checklist §2 |
| R04 | **Veículo** licenciado / autorizado TVDE | Partner · Driver | **INCERTO / VALIDAR** | Frota controlada pelo operador | `INCERTO` | Checklist §2 |
| R05 | **Documentação** motorista/veículo | Partner · Driver | **INCERTO / VALIDAR** | Inventário/validade pelo operador | `PODE SER PROCESSO` · app `AVISAR` (PF3C) · A3-D05 | Checklist · A3-D05 |
| R06 | **Seguros** adequados | Partner · Plataforma (contrato) | **INCERTO / VALIDAR** | Apólices e sinistros | `PODE SER PROCESSO OPERACIONAL/HUMANO` | Checklist §3 |
| R07 | Validade documental **com bloqueio automático** na app | Partner · Driver · Plataforma | **INCERTO / VALIDAR** | Enforcement humano até parecer | Gates **OFF** (A3-D03) | PF3D · A3-D03 |
| R08 | Tempos/limites condução DL 84 / Reg. 561 | Driver · Partner · Plataforma? | **INCERTO / VALIDAR** | Confirmar âmbito Art. 2.º | Decisão produto A3-D04: `REGISTAR`/`AVISAR` sem `IMPEDIR` até parecer | DL 84 · A3-D04 |
| R09 | **Tacógrafo** | Partner · Driver | **INCERTO / VALIDAR** | Só se no regime tacógrafo | `SEM IMPACTO TÉCNICO` tipicamente | DL 84 |
| R10 | Informação empregador→trabalhador móvel | Partner (se empregador) | **INCERTO / VALIDAR** | Se vínculo no âmbito | `PODE SER PROCESSO` | DL 84 Art. 18.º |
| R11 | Registo tempos de trabalho + conservação | Partner (empregador) | **INCERTO / VALIDAR** | Registos (Art. 19.º se aplicável) | App pode `REGISTAR`; suporte legal = INCERTO | DL 84 Art. 19.º |
| R12 | Identificação motorista/veículo ao passageiro | Plataforma · Passenger | **INCERTO / VALIDAR** | Copy/UX se lei exigir | `INCERTO` | Sem diploma TVDE no repo |
| R13 | Informação prévia preço / tarifário | Plataforma · Passenger | **INCERTO / VALIDAR** | Transparência | Produto: [`PRICING_DECISION.md`](../PRICING_DECISION.md) | Sem diploma TVDE |
| R14 | Pagamentos, faturas/recibos, IVA | Plataforma · Partner · Passenger | **INCERTO / VALIDAR** | Após A1/A2 + contabilista | A3-D08 — sem emissor agora | Checklist §6 · A3-D08 |
| R15 | Cancelamentos | Plataforma · Passenger · Driver | **INCERTO / VALIDAR** | Política | `INCERTO` | Sem diploma no repo |
| R16 | Registos obrigatórios operação TVDE | Plataforma · Partner | **INCERTO / VALIDAR** | Após diploma TVDE arquivado | `INCERTO` | A3-D01 pendente |
| R17 | Conservação de dados (prazos) | Plataforma · Partner | **INCERTO / VALIDAR** | Política retenção | `INCERTO` | Checklist · A3-D06 |
| R18 | Informação / cooperação autoridades | Partner · Plataforma | **INCERTO / VALIDAR** | Processo de resposta | `PODE SER PROCESSO` | Checklist |
| R19 | Reclamações / suporte | Plataforma · Partner | **INCERTO / VALIDAR** | Canal e SLAs | `INCERTO` | Sem fonte no índice |
| R20 | **RGPD** (enquadramento ao tratar dados) | Todos | **SIM** *(enquadramento)* | Responsável, bases, direitos, DPA | `REGISTAR` + processo; textos = A3-D06/D07 | RGPD UE · Checklist §5 |
| R21 | Suspensão/bloqueio automático por docs | Driver · Partner · Plataforma | **INCERTO / VALIDAR** | Não activar | OFF / A3-D03 | PF3D |
| R22 | Auditoria/logs técnicos | Plataforma · Admin | **INCERTO / VALIDAR** | Logs ops | App já regista | Sem diploma específico |
| R23 | Requisitos DL 84 **para a app** como plataforma digital | Plataforma | **NÃO** *(texto analisado)* | Reavaliar se âmbito Art. 2.º for Sim | `SEM IMPACTO TÉCNICO` enquanto INCERTO | DL 84 Arts. 1.º–2.º |

### Contagens (matriz)

| Classificação | N.º |
|---------------|-----|
| **SIM** | **1** (R20) |
| **NÃO** | **1** (R23) |
| **INCERTO / VALIDAR** | **21** |

---

## 4. Impacto técnico (app)

| Tema | Estado técnico actual (facto) | Decisão / próximo |
|------|-------------------------------|-------------------|
| PF3D / `ENABLE_VEHICLE_COMPLIANCE_GATES` | **OFF** | **A3-D03** — manter OFF; **não** alterar flags nesta tarefa |
| Gate docs motorista (FE) | Existe | Sem bloqueio legal fechado; Partner = verdade (A3-D05) |
| Driving hours | `ENABLE_DRIVING_HOURS_COMPLIANCE=true`; `ENABLE_DRIVING_HOURS_ENFORCEMENT=false` | **A3.8 DONE** — aviso/registo sem bloqueio online/accept; enforcement reversível por flag |
| Partner docs / PF3C | Alertas sem hard-block | Alinhado a A3-D03/D05 |
| RGPD / Termos | Superfícies de dados; textos incompletos | **A3-D07** bloqueante **Marco 2** |

**Não fazer nesta tarefa:** activar PF3D; mexer Render; commit.

---

## 5. Impacto operacional

| Quem | Acção |
|------|--------|
| **Partner (Manel)** | Titular/licenciado operação TVDE (A3-D02); docs/seguros/licença como processo humano |
| **Plataforma (TVDE-APP)** | Software; não se apresenta como titular da licença TVDE sem validação jurídica da terminologia |
| **Advogado** | Pacote A3-D06 **agora** (ver §9) |
| **Contabilista** | Recibos/IVA **depois** A1/A2 (A3-D08) |
| **Produto/eng** | Gates OFF; A3.8 driving-hours warn-only; Termos/Privacidade antes do piloto M2 |

---

## 6. Pontos incertos (resumo) — ainda jurídicos

1. Aplicabilidade DL 84 / Reg. 561 a esta operação TVDE.  
2. Texto vinculativo da lei TVDE clássica (**REQUER PESQUISA/FONTE OFICIAL** + arquivo A3-D01).  
3. Terminologia exacta titular/plataforma (A3-D02 → parecer).  
4. Se enforcement documental automático será exigido após parecer.  
5. Pormenores RGPD (retenção, responsável, DPA).  
6. Emissor fiscal de recibos (A3-D08 → pós A1/A2).

---

## 7. A6 — Gates de compliance

### Pergunta (análise)
Obrigações nas fontes do repo suficientes para gates ON? → **AINDA NÃO É POSSÍVEL DETERMINAR** (inalterado).

### Decisão de produto (**A3-D03**)

Manter `ENABLE_VEHICLE_COMPLIANCE_GATES` **OFF** até validação jurídica suficiente.

| Mecanismo | Análise legal (fontes repo) | Decisão actual |
|-----------|----------------------------|----------------|
| `ENABLE_VEHICLE_COMPLIANCE_GATES` ON | Indeterminado | **OFF** (A3-D03) |
| Gate documental Driver (bloqueio) | Indeterminado | Sem activar |
| Suspensão automática | Indeterminado | Sem activar |
| Bloqueio de veículo | Indeterminado | Sem activar |
| Override Admin | Não obrigatório no DL 84 | N/A enquanto gates OFF |

**Implicação roadmap:** A6 **fora** do caminho crítico até parecer (A3.7) + decisão explícita posterior.

---

## 8. DECISÕES A3-D01…D08 — **DONE**

| ID | Decisão | Estado |
|----|---------|--------|
| **A3-D01** | **SIM** — arquivar já no repo as fontes legais-base TVDE aplicáveis e indexá-las como fonte primária. **Não inventar diplomas.** Localizar/confirmar fontes **oficiais** antes de arquivar. | **DONE** *(intenção)* · execução arquivo = **`REQUER PESQUISA/FONTE OFICIAL`** |
| **A3-D02** | Partner/entidade operacional Manel = **titular/licenciado** da operação TVDE; TVDE-APP = **plataforma tecnológica**. Terminologia exacta sujeita a validação jurídica. | **DONE** |
| **A3-D03** | Manter `ENABLE_VEHICLE_COMPLIANCE_GATES` **OFF** até validação jurídica suficiente. | **DONE** |
| **A3-D04** | Manter funcionalidade e registos driving-hours; **sem** bloquear automaticamente disponibilidade/aceitação enquanto aplicabilidade jurídica ao modelo TVDE não estiver confirmada. Objectivo: tracking/avisos/registos; não impedir Driver só com esta regra. **Código alinhado em A3.8.** | **DONE** *(docs + código A3.8)* |
| **A3-D05** | Partner/Frota continua fonte de verdade operacional dos documentos. **Não reabrir.** | **DONE** |
| **A3-D06** | **SIM** — validação jurídica externa **agora** (pacote mínimo antes do piloto real): enquadramento TVDE; DL 84 / Reg. 561 quando aplicável; licenças/docs/seguros; RGPD mínimo; impacto de eventual enforcement automático. | **DONE** *(decisão)* · execução parecer = pendente |
| **A3-D07** | Termos de utilização + Política de Privacidade = **bloqueantes Marco 2**; **não** bloqueiam Marco 1. | **DONE** |
| **A3-D08** | Recibos/faturação: validar com contabilista **depois** de A1/A2. **Não** escolher emissor nesta fase. | **DONE** |

---

## 9. Validações externas ainda pendentes

1. **Pesquisa/fonte oficial** + arquivo diplomas TVDE (A3-D01).  
2. Parecer: aplicabilidade **DL 84/2026 / Reg. 561** ao modelo.  
3. Parecer: enquadramento **licenças / documentação / seguros** TVDE.  
4. Parecer: **RGPD** mínimo (responsável, DPA, retenção) + alinhamento Termos/Privacidade (A3-D07).  
5. Parecer: impacto de **enforcement automático** (gates/suspensão).  
6. Validação terminologia **titular vs plataforma** (A3-D02).  
7. **Contabilista** (recibos/IVA) — **após A1/A2** (A3-D08).

---

## 10. Conclusão A3 → roadmap

| Item | Estado |
|------|--------|
| A3.1–A3.6 (matriz + brief A6) | **DONE** |
| A3-D01…D08 (decisões internas) | **DONE** |
| A3.7 Validação jurídica externa | **Por iniciar** (autorizada por A3-D06) |
| A3.8 Aplicar A3-D04 no código (warn/registo sem bloqueio) | **DONE** — enforcement OFF; warning/record ON; flag reversível |
| A3.9 Arquivar PDFs oficiais + indexar (após fonte oficial) | **Por iniciar** |
| Etapa A3 global | **PARCIAL** (faltam A3.7 externo + A3.9 arquivo) |
| A6 no crítico | **Não** até parecer |
| Próximo Marco 1 | **E5** |

---

**Frase:** Decisões de produto/operação A3 e A3.8 (código) estão fechadas; o que falta para “A3 completo” é **parecer externo** (A3.7) e **fontes oficiais TVDE no repo** (A3.9) — sem activar PF3D.
