# A3 — Requisitos legais TVDE aplicáveis (Setembro 2026)

**Tipo:** matriz operacional + decisões de produto — **não** é parecer jurídico  
**Data análise inicial:** 2026-09-02 · **Decisões A3-D01…D08:** 2026-09-02 (**DONE**)  
**Revisão legal:** 2026-09-04 — source pack DR/IMT/AMT/EUR-Lex + matriz de impacto  
**IDs:** `S-COMP-04` · `LEGAL-TVDE-001…` · roadmap etapa **A3**  
**Estado:** **PARCIAL** — decisões internas **revistas** (D03-REV1 · D04-REV1); PDFs oficiais P0 ainda a arquivar; implementação M2 pendente  

**Referências novas (2026-09-04):**

- [`LEGAL_SOURCES_INDEX.md`](LEGAL_SOURCES_INDEX.md) — inventário P0/P1/`PENDENTE REGULAMENTAÇÃO`
- [`TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md`](TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md)
- [`research/TVDE_LEGAL_RESEARCH_PERPLEXITY_2026-09-04.md`](research/TVDE_LEGAL_RESEARCH_PERPLEXITY_2026-09-04.md) *(auxiliar — não fonte normativa)*

---

## 0. Revisão 2026-09-04 — o que mudou

A nova validação jurídica (research + confirmação em fontes oficiais + source pack) **revê conclusões de produto** de 2026-09-02.  
**Não apaga** o histórico das decisões A3-D01…D08; marca-as como **revistas por nova base legal de setembro de 2026**.

### Base legal principal (após revisão)

| Diploma / artigo | Papel para a Vamulá |
|------------------|---------------------|
| **Lei n.º 45/2018** na redacção/republicação da **Lei n.º 59/2026** | Regime TVDE aplicável desde **01-09-2026** |
| **Art. 13.º** | Limite **10 h / 24 h**; registo; mecanismos de garantia |
| **Art. 14.º** | Bloqueio perante incumprimento **conhecido / devido** |
| **Art. 17.º-A** | Capacidade tecnológica da plataforma |
| **Art. 20.º** | Validação através da **plataforma IMT** |
| **Art. 20.º-A** | Partilha / comunicação de dados IMT |

### Conclusões antigas que deixam de ser a posição actual

| Conclusão antiga (2026-09-02) | Posição actual (2026-09-04) |
|-------------------------------|-----------------------------|
| Gates viatura podem permanecer OFF por **ausência de base legal** | Base legal de bloqueio/validação **identificada**; flag OFF = **só** implementação incompleta (**A3-D03-REV1**) |
| **WARN + RECORD** suficiente para driving-hours no piloto real | **Insuficiente** para M2; M2 exige **enforcement** (**A3-D04-REV1**) |
| DL 84/2026 / Reg. 561/2006 como questão **central** dos tempos TVDE | **Complementares**; limite TVDE próprio = **art. 13.º** Lei 45/2018 |

### M1

**M1 permanece DONE.** A nova validação legal altera requisitos para **M2 / operação TVDE real**, mas **não invalida** o marco M1 técnico concluído.

---

## 1. Resumo executivo (posição actual)

| Ponto | Conclusão actual |
|-------|------------------|
| Fonte legal principal | Lei **45/2018** (republicada via **59/2026**) — PDFs P0 ainda `A ARQUIVAR` no índice |
| DL 84/2026 no repo | `LEGAL-TVDE-001` — complementar (tacógrafo / tempo móvel); **não** substitui art. 13.º TVDE |
| Titular vs plataforma (**A3-D02**) | Partner/entidade operacional Manel = titular/licenciado da operação TVDE; TVDE-APP = plataforma tecnológica (*terminologia exacta → validação jurídica*) — **inalterado** |
| Documentos ops (**A3-D05**) | Partner/Frota = fonte de verdade **operacional** interna — **não reabrir**; **não** substitui validação IMT |
| A6 / gates (**A3-D03-REV1**) | Requisito **real M2**; flag OFF **temporária** (implementação pendente) — ver §7–8 |
| Driving-hours (**A3-D04-REV1**) | **10 h / 24 h** + registo + **enforcement M2**; A3.8 WARN+RECORD = estado **código actual**, não meta M2 |
| Validação IMT | **Requisito M2** (operador / motorista / veículo) — mecanismo técnico exacto depende IMT |
| Termos + Privacidade (**A3-D07**) | Bloqueantes Marco 2 |
| Recibos/faturação (**A3-D08**) | Após A1/A2 + contabilista |
| Impacto A1 | Considerar contribuição AMT **5%** sobre taxas de intermediação (base IVA a confirmar) — **sem** alterar A1-D01 (15%) |

**Princípio:** obrigação legal ≠ implementação já pronta; flag OFF ≠ decisão de produto de manter OFF em M2.

---

## 1b. Fontes — inventário (A3-D01 em curso)

| Estado | Detalhe |
|--------|---------|
| **No repo** | DL 84/2026 (`LEGAL-TVDE-001`) |
| **Identificadas / a arquivar (P0)** | Lei 59/2026 · Lei 45/2018 consolidada · IMT TVDE / licenciamento / certificação · AMT formulário · RGPD — ver [`LEGAL_SOURCES_INDEX.md`](LEGAL_SOURCES_INDEX.md) |
| **P1** | Portarias 293/2018 · 344/2024/1 · Reg. 561/2006 · Lei 58/2019 |
| **PENDENTE REGULAMENTAÇÃO** | Formação/exame · língua portuguesa · dístico/QR · operacionalização IMT |

---

## 2. Fontes usadas

| ID / doc | Natureza | Uso |
|----------|----------|-----|
| [`LEGAL_SOURCES_INDEX.md`](LEGAL_SOURCES_INDEX.md) | Índice | Inventário P0/P1 + pendentes |
| [`TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md`](TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md) | Matriz gap | BLOCKERS / NECESSÁRIOS M2 |
| Research + source pack 2026-09-04 | Auxiliar / catálogo | **Não** fonte normativa primária |
| [`sources/decreto-lei-84-2026-….pdf`](sources/decreto-lei-84-2026-tvde-transporte-rodoviario.pdf) | Diploma bruto | Complementar tempos/tacógrafo |
| [`PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md`](../ops/PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md) | Arquitectura produto | Base técnica A6 — **insuficiente** sozinha |
| Código driving hours | Implementação | A3.8 = WARN+RECORD; meta M2 = **A3-D04-REV1** |

---

## 3. Matriz de requisitos (histórico 2026-09-02)

*Mantida como registo da análise inicial com base só no DL 84 no repo. **Não** é a posição de produto actual para M2 — ver §0, §7–8 e matriz de impacto 2026-09-04.*

*(Classificações `INCERTO` da análise 02-09 não foram reescritas linha a linha; a revisão legal aponta arts. 13.º/14.º/17.º-A/20.º/20.º-A como base principal.)*

---

## 4. Impacto técnico (app) — facto vs meta M2

| Tema | Estado técnico **actual** (facto) | Meta / decisão produto M2 |
|------|-----------------------------------|---------------------------|
| PF3D / `ENABLE_VEHICLE_COMPLIANCE_GATES` | **OFF** | **ON efectivo** obrigatório em M2 (**A3-D03-REV1**); OFF agora = implementação pendente |
| Gate docs motorista (FE) | Existe | Insuficiente sem IMT + bloqueio BE |
| Driving hours | Compliance ON · Enforcement **OFF** | Enforcement **efectivo** M2 (**A3-D04-REV1**); janela móvel 24 h |
| Integração IMT | **Ausente** | Requisito M2 (consulta/validação) |
| Emergência / RAL / fatura / AMT | **Ausente** / parcial | Ver blockers e necessários M2 |
| RGPD / Termos | Textos incompletos | **A3-D07** bloqueante M2 |

**Não fazer nesta tarefa documental:** activar flags; implementar IMT; alterar código.

---

## 5. Impacto operacional

| Quem | Acção |
|------|--------|
| **Partner (Manel)** | Titular/licenciado (A3-D02); docs internos + conformidade IMT |
| **Plataforma (Vamulá / TVDE-APP)** | Gestor de plataforma electrónica — licença IMT própria (**BLOCKER M2**); validação/bloqueio; 10 h/24 h; emergência |
| **Advogado / IMT** | Detalhes API, “devesse ter conhecimento”, estados que contam para 10 h, fallback IMT down |
| **Contabilista** | Recibos (A3-D08); base IVA da contribuição AMT 5% |
| **Produto/eng** | Implementar blockers M2; **não** declarar conformidade global cross-platform sem fonte IMT |

---

## 6. Pontos ainda **NÃO** decididos

Classificação: **`DEPENDE PARECER / IMT / REGULAMENTAÇÃO`**

1. Definição exacta de “tempo de operação” para as 10 h (quais estados contam).  
2. Regra final para viagem iniciada perto do limite *(política provisória abaixo = `SUJEITA A PARECER JURÍDICO`)*.  
3. Periodicidade da revalidação IMT.  
4. Fallback quando IMT está indisponível.  
5. Acesso aos tempos **cross-platform**.  
6. Detalhes de integração/API IMT (não assumir API pública, webhook, frequência, cache, SLA, consulta pré-viagem).  
7. Significado operacional exacto de “devesse ter conhecimento”.  
8. Base IVA da contribuição AMT **5%**.  
9. Regulamentação nova (formação / língua / dístico).  
10. Política de cache/retry IMT.

---

## 7. A6 — Gates de compliance (**A3-D03-REV1**)

### Histórico (**A3-D03** · 2026-09-02) — **REVISTO**

> Manter `ENABLE_VEHICLE_COMPLIANCE_GATES` **OFF** até validação jurídica suficiente. A6 fora do caminho crítico.

*Motivo antigo:* ausência de base legal clara no repo (só DL 84).  
*Estado:* **revisto por nova base legal de setembro de 2026.**

### Decisão nova — **A3-D03-REV1** (2026-09-04)

**Estado:** `DECIDIDO — IMPLEMENTAÇÃO PENDENTE`

- A6 / vehicle compliance passa a **requisito real para M2**.
- A plataforma deve aceitar/activar apenas entidades **conformes**.
- Veículo (e operador/motorista) não conforme **conhecido/devido** não pode permanecer operacional.
- PF3D existente = base técnica útil, **não suficiente** (falta IMT + bloqueio operacional real).
- `ENABLE_VEHICLE_COMPLIANCE_GATES` continua **OFF AGORA** apenas porque a implementação final **ainda não está pronta**.
- **Não** confundir flag OFF temporária com decisão de produto de manter OFF em M2.
- Para M2, **gates efectivos serão obrigatórios**.

### Validação IMT (requisito M2)

| Entidade | Validar pelo menos |
|----------|-------------------|
| **Operador** | Licença |
| **Motorista** | Habilitação de condução · certificado TVDE **ou** certificado motorista de táxi · estado/registo aplicável |
| **Veículo** | Registo · matrícula · idade · inspeção · seguro TVDE |

A lei confirma **consulta IMT**. O mecanismo técnico exacto **depende do IMT** — não assumir API/webhook/frequência/cache/SLA/consulta antes de cada viagem.

### Bloqueio / override

Entidade bloqueada **não pode:** ficar disponível · matching · atribuição · aceitar viagem · iniciar **nova** viagem.  
Aplicável a: Partner/operador · motorista · veículo.

| Admin pode | Admin **não** pode |
|------------|---------------------|
| Rever falso positivo · corrigir erro interno · pedir nova validação · reactivar após validação oficial **positiva** | Override que permita operação com estado oficial conhecido **inválido / expirado / revogado / suspenso** |

Não apagar histórico de bloqueios/reactivações.

### Implicação roadmap

A6 entra no **caminho crítico M2** (implementação). Flag permanece OFF até gates + IMT/processo estarem prontos.

---

## 8. Decisões A3 — acta

### 8a. Histórico A3-D01…D08 (2026-09-02) — preservado

| ID | Decisão original | Estado |
|----|------------------|--------|
| **A3-D01** | Arquivar fontes legais-base TVDE oficiais; não inventar diplomas | **DONE** *(intenção)* · execução arquivo = **EM CURSO** (índice P0/P1 2026-09-04) |
| **A3-D02** | Partner = titular/licenciado; TVDE-APP = plataforma tecnológica | **DONE** |
| **A3-D03** | Gates OFF até validação jurídica | **DONE** → **revisto** por **A3-D03-REV1** |
| **A3-D04** | Tracking/avisos/registos; sem bloqueio automático até aplicabilidade confirmada; A3.8 WARN+RECORD | **DONE** → **revisto** por **A3-D04-REV1** |
| **A3-D05** | Partner/Frota fonte de verdade operacional docs — não reabrir | **DONE** *(ops interna; não substitui IMT)* |
| **A3-D06** | Validação jurídica externa agora | **DONE** *(decisão)* · execução parecer fino ainda parcial |
| **A3-D07** | Termos + Privacidade bloqueantes M2 | **DONE** |
| **A3-D08** | Recibos após A1/A2 + contabilista | **DONE** |

### 8b. **A3-D03-REV1** — vehicle compliance

Ver §7. Estado: **`DECIDIDO — IMPLEMENTAÇÃO PENDENTE`**.

### 8c. **A3-D04-REV1** — driving-hours (2026-09-04; impl. base 2026-09-04)

**Estado:** `DECIDIDO — IMPLEMENTAÇÃO PARCIAL (fundação M2-L3)`

| Ponto | Decisão |
|-------|---------|
| Limite material | **10 horas** por motorista em cada período de **24 horas** |
| Âmbito | Abrange **todas as plataformas** (obrigação legal confirmada) |
| Plataforma | Deve ter **mecanismos que garantam** o limite + **registo auditável** |
| WARN + RECORD | **Não** suficiente para M2 |
| M2 | Exige **enforcement efectivo** |

**Implementado na fundação (2026-09-04):**

- cálculo **rolling 24h** UTC `[now−24h, now]` — **dia civil Europe/Lisbon removido** do cálculo final;
- segmentos contados = **arriving + ongoing** apenas — marca **`TEMPORARY_POLICY_PENDING_LEGAL_CONFIRMATION`** (não é definição legal final);
- descanso automático fixo **11h removido** da policy TVDE (não exigido pela lei; não reintroduzir);
- `driving_rest_until` = **legado** (dados antigos / override admin deprecated ainda influenciam `limit_reached`);
- `ENABLE_DRIVING_HOURS_ENFORCEMENT` continua **OFF**;
- audits de transição: `warning_reached` · `limit_reached` · `limit_cleared` · `legacy_rest_detected`;
- **cross-platform** continua pendente (IMT).

**Arquitectura decidida (produto — restante):**

- guardar estados temporais granulares (online · espera · pausa…) quando parecer fechar o que conta;
- quando limite **já atingido** e enforcement ON: não elegível para nova atribuição · não aceitar · não iniciar nova viagem.

**Política prudente provisória:** viagem regularmente iniciada **antes** de atingir o limite pode terminar em segurança; após conclusão, impedir nova operação.  
Marca: **`SUJEITA A PARECER JURÍDICO`**.

**Não decidido ainda:** exactamente que estados contam para as 10 h (além da política provisória arriving+ongoing).

### 8d. Cross-platform

| Ponto | Estado |
|-------|--------|
| Obrigação legal cross-platform | **Confirmada** |
| Mecanismo técnico | **Não** confirmado |
| Integração dados outras plataformas no repo | **Ausente** |
| Spec pública IMT localizada | **Não** |

**Estado:** `DEPENDENTE DE IMT / REGULAMENTAÇÃO / PARECER`

**Regra de produto:** Vamulá deve contabilizar correctamente os **seus** tempos; usar informação cross-platform oficial **quando** disponibilizada; **não** declarar que garante o total global sem fonte suficiente.

### 8e. Nota A1 (económico)

A1 deve considerar como custo/regra operacional:

- contribuição AMT = **5%** sobre taxas de intermediação cobradas;
- base exacta relativamente a **IVA** ainda requer confirmação AMT/jurídica.

**Não** alterar **A1-D01** (comissão piloto **15%**). **Não** alterar pricing nesta tarefa.

---

## 9. BLOCKERS e NECESSÁRIOS M2 (confirmados)

Fonte alinhada: [`TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md`](TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md).

### BLOCKERS M2 (12)

1. Validação IMT operador  
2. Validação IMT motorista  
3. Validação IMT veículo  
4. Bloqueio operador  
5. Bloqueio motorista  
6. Bloqueio veículo  
7. Enforcement 10 h / 24 h  
8. Emergência passageiro  
9. Emergência motorista  
10. Chamada em tempo real às autoridades  
11. Partilha de localização em emergência  
12. Licença IMT do gestor da plataforma  

### NECESSÁRIOS M2 (12)

1. Registo de tempos  
2. Retenção actividade **2 anos**  
3. Retenção reclamações **2 anos**  
4. Hard-cap comissão **25%** sem IVA  
5. Breakdown legal de preço/comissão  
6. Fatura electrónica  
7. Reporting mensal AMT  
8. Apuramento contribuição AMT **5%**  
9. Contratos de adesão operadores  
10. Disponibilização contrato ao motorista  
11. Livro de Reclamações / RAL  
12. Processos de comunicação IMT/AMT  

*Não implementar nesta tarefa documental.*

---

## 10. Conclusão A3 → roadmap

| Item | Estado |
|------|--------|
| A3-D01…D08 | **DONE** (histórico) |
| A3-D03-REV1 / A3-D04-REV1 | **DECIDIDO** — A3-D04 fundação rolling 24h **parcial**; enforcement M2 ainda pendente |
| A3.8 (código WARN+RECORD) | **DONE** como implementação da decisão **antiga**; meta M2 = REV1 |
| A3.9 Arquivo PDFs P0 | **EM CURSO** / parcial (índice; PDFs em falta) |
| A6 no crítico M2 | **Sim** (implementação); flag OFF até pronto |
| M1 | **DONE** (não reabrir) |
| Etapa A3 global | **PARCIAL** |

---

**Frase:** Base legal M2 = Lei 45/2018 (59/2026) arts. 13.º/14.º/17.º-A/20.º/20.º-A; A3-D03/D04 **revistos**; M1 intacto; implementação e flags **ainda** não mexidas.
