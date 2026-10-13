# Anexo A2 — Resumo de conformidade operacional (contexto)

**Dossier:** EXT-LEG-2026-10-11  
**Audiência:** Advogado  
**Confidencialidade:** EXTERNAL-CONFIDENTIAL  

**EXEMPLO DE CONTEXTO INTERNO / NÃO PARECER JURÍDICO**

> Este anexo descreve o **estado interno do produto** e **lacunas identificadas** pela equipa. **Não** constitui interpretação jurídica nem conclusão de conformidade.

Fontes de referência interna (sem alteração de registos): FIND-LEG-* · TVDE_59_2026_TECHNICAL_FINDINGS (repo) · matriz legal (linhas citadas no dossier).

---

## Tabela por pergunta jurídica

| Tema | Estado interno actual (produto / registo) | Lacuna ou risco identificado internamente | Pergunta | Nota |
|------|-------------------------------------------|-------------------------------------------|----------|------|
| **Validação operador TVDE** | Registo e fluxos documentais; **sem** cliente/API IMT operador | FIND-LEG-IMT-01; FIND-LEG-GATE-01 (gate licença frota ausente) | **Q-EXT-LEG-001** | Upload/aprovação admin **≠** validação IMT |
| **Validação motorista** | Registo, documentos, aprovação **administrativa** parcial | FIND-LEG-IMT-02; FIND-LEG-DRV-01 | **Q-EXT-LEG-001** | Processo manual temporário **não** fechado juridicamente |
| **Validação veículo** | Dados de viatura na viagem; gates documentais viatura configuráveis | FIND-LEG-IMT-03 | **Q-EXT-LEG-001** | **Confirmação interna pendente** (O3) sobre frota real |
| **Dever de diligência / bloqueios** | Bloqueios técnicos e approve admin previstos; política de «conhecimento» **não** fechada | FIND-LEG-GATE-01, FIND-LEG-DRV-01 | **Q-EXT-LEG-005** | Art. 14.º — interpretação **objecto da consulta** |
| **10 h / 24 h — registo** | Foundation driving-hours (segmentos, rolling 24h) e registo activos | — | **Q-EXT-LEG-002** | Registo **≠** bloqueio automático |
| **10 h / 24 h — enforcement** | Bloqueio automático **desactivado** na configuração actual | FIND-LEG-HRS-01 | **Q-EXT-LEG-002** | DEC-LEG-004: bloqueio efectivo antes de operação plena |
| **Cross-platform** | **Sem** agregação de tempos entre plataformas TVDE | FIND-LEG-HRS-02 | **Q-EXT-LEG-002** | Parecer desejado antes de activar enforcement |
| **SOS / emergência** | SOS passageiro/motorista: **112**, snapshot, partilha/resumo viagem | FIND-LEG-SOS-01 — validação externa **pendente**; matriz L-19…L-22 **PARCIAL** | **Q-EXT-LEG-003** | Foundation implementada; **suficiência legal não concluída** |
| **Termos / privacidade públicos** | Páginas institucionais (`/legal/`, `/privacidade/`) | — | **Q-EXT-LEG-004** | Contexto público; não substitui minutas pedidas |
| **Gate termos + privacidade (M2.11)** | Registo e **reaceitação versionada** no fluxo de conta (decisão DEC-PROD-002; M2.11 fechado internamente) | Cobre **termos de utilização e política de privacidade** no onboarding/login | **Q-EXT-LEG-004** | **Não** equivale a contratos de adesão plataforma↔operador↔motorista |
| **Contratos de adesão in-app** | **Incompleto** / ausente como pacote contratual B2B | FIND-LEG-CTR-01 (**ABERTO**) | **Q-EXT-LEG-004** | **Não harmonizar** com M2.11 — são camadas distintas |
| **Comunicações IMT / AMT (produto)** | **Sem** reporting automatizado AMT; comunicações formais **não** mapeadas como workflow fechado no produto | FIND-LEG-AMT-01 (reporting); apuramento AMT fora de scope jurídico detalhado aqui | **Q-EXT-LEG-007** | **Não** afirmar obrigações legais neste anexo — são **objecto da pergunta** |
| **Retenção actividade (contexto)** | FIND-LEG-RET-01: período **2 anos** registado internamente; implementação **parcial** | Conformidade plena **não** fechada | — (contexto dossier) | Adequação jurídica **não** concluída no dossier |
| **Livro Reclamações / RAL** | L-25 **fechado** na matriz interna (implementação registada) | Sem Q-EXT dedicada | — (contexto dossier) | Resumo operacional **não** incluído no v1 |

---

## Q-EXT-LEG-004 — duas camadas (explicitamente distintas)

| Camada | Referência interna | O que está fechado / parcial | O que **não** está fechado |
|--------|-------------------|------------------------------|----------------------------|
| **Termos de utilização + política de privacidade** (aceitação utilizador) | M2.11 · DEC-PROD-002 | Gate de registo/reaceitação versionada | Minutas e obrigações **entre** entidades |
| **Contratos de adesão** (plataforma ↔ operador ↔ motorista ↔ passageiro) | FIND-LEG-CTR-01 | — | Minutas, prova e arquitectura contratual **incompletas** |

A equipa **não** trata estas camadas como equivalentes; o parecer jurídico é necessário para **Q-EXT-LEG-004** global.

---

## Q-EXT-LEG-007 — limites deste anexo

- Descreve-se apenas que o **produto** não implementa hoje um calendário ou canal fechado de **comunicações regulatórias** automatizadas.
- **Não** se conclui incumprimento legal por ausência de reporting AMT ou comunicações IMT.
- A identificação de **comunicações legalmente obrigatórias**, prazos e documentos é **precisamente** o pedido **Q-EXT-LEG-007** (enquadramento legal, separado de Q-EXT-AMT-* procedimental).

---

## Dependências externas cruzadas

| Dependência | Relação |
|-------------|---------|
| **Q-EXT-IMT-001** | Pode **informar** factos sobre canal IMT; **não** substitui **Q-EXT-LEG-001** |
| **O1 / O2 / O3 / O8** | Factos operacionais piloto — **confirmação interna pendente**; não preenchidos neste anexo |

---

*Documento de apoio ao dossier EXT-LEG-2026-10-11. Estado dossier: REVIEW — não enviado.*
