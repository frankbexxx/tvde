# Anexo A1 — Modelo de papéis (plataforma TVDE)

**Dossier:** EXT-LEG-2026-10-11  
**Audiência:** Advogado  
**Confidencialidade:** EXTERNAL-CONFIDENTIAL  

Este anexo descreve **papéis e relações funcionais** assumidas internamente para a consulta jurídica. **Não** constitui parecer legal nem atribuição definitiva de responsabilidades civis ou administrativas perante terceiros.

---

## 1. Entidades e papéis (visão geral)

| Papel | Quem | Função resumida (modelo interno) |
|-------|------|----------------------------------|
| **Gestor da plataforma** | **Ventos Férteis, Lda.** (marca **VAMULÁ**) | Licenciada como **gestor de plataforma eletrónica TVDE** (licença IMT **n.º 354/2026**); presta **serviço tecnológico** de intermediação entre passageiros e operação TVDE (DEC-LEG-002) |
| **Parceiro / operador TVDE** | Entidade de **frota / operador licenciado** TVDE | Fonte de verdade **operacional** para documentação de motoristas e veículos e relação com motoristas (DEC-LEG-005); **confirmação interna pendente** quanto à identidade exacta no piloto (**O1**) |
| **Motorista** | Condutor TVDE | Utiliza a aplicação para receber e executar viagens; documentação e aprovação sujeitas a fluxos internos e regras do parceiro; **confirmação interna pendente** da associação final frota/motoristas (**O2**) |
| **Passageiro** | Utilizador final | Solicita e paga viagens via aplicação; relação contratual e informação pré/pós-viagem objecto de **Q-EXT-LEG-004** |

---

## 2. Distinções importantes (não confundir)

| Conceito A | Conceito B | Nota |
|------------|------------|------|
| **Licença de gestor de plataforma** (354/2026) | **Integração / validação IMT** de operador, motorista ou veículo | A licença da **plataforma** está documentada internamente; **não** implica canal técnico IMT activo (FIND-LEG-IMT-01…03) |
| **Operador TVDE licenciado** (frota) | **Gestor da plataforma** | DEC-LEG-002: plataforma = tecnologia; operador/frota = titular/licenciado TVDE na cadeia operacional |
| **Motorista** | **Parceiro / frota** | Motorista actua na app; parceiro concentra gestão documental e operacional interna acordada |
| **Veículo** | **Validação IMT veículo** | Registo e documentos na app **≠** validação automática IMT (**Q-EXT-LEG-001**) |

---

## 3. Relações funcionais (esquema narrativo)

1. **Passageiro** ↔ **VAMULÁ (plataforma):** pedido de viagem, pagamento ao prestador de pagamentos da plataforma, informação de viagem (termos/privacidade públicos; contratos in-app parciais — ver **Q-EXT-LEG-004**).
2. **VAMULÁ** ↔ **Parceiro TVDE:** intermediação tecnológica; parceiro como referência operacional para documentação e organização da frota; acertos e regras comerciais **fora** deste anexo (matéria fiscal noutro dossier).
3. **Parceiro TVDE** ↔ **Motorista:** relação operacional e documental gerida pelo parceiro no modelo assumido; plataforma disponibiliza fluxos de registo, envio documental e aprovação **administrativa** interna.
4. **Motorista** ↔ **Passageiro:** execução da viagem TVDE; sem contrato directo plataforma↔passageiro detalhado neste anexo.

---

## 4. Responsabilidades internas assumidas (factos de governação, não parecer)

| Tema | Assunção interna documentada |
|------|------------------------------|
| Papéis plataforma vs parceiro | DEC-LEG-002, DEC-LEG-005 |
| Licença plataforma IMT | DEC-LEG-010; licença **354/2026** |
| Termos e privacidade antes de operação plena | DEC-LEG-007; implementação parcial na app (FIND-LEG-CTR-01 vs gate M2.11 — ver Anexo A2) |
| Validação externa jurídica | DEC-LEG-006 (presente consulta) |

---

## 5. Pontos ainda por confirmar (piloto)

| Ref. interna | Tema | Estado neste anexo |
|--------------|------|---------------------|
| **O1** | Operador TVDE **exacto** das viagens do piloto | **Confirmação interna pendente** |
| **O2** | Motoristas ↔ operador/frota | **Confirmação interna pendente** |
| **O3** | Veículos (identificação, titularidade, seguro) | **Confirmação interna pendente** — **sem** matrículas ou nomes |
| **O8** | Processo humano de validação documental **pré-activação** | **Confirmação interna pendente** |

Nenhum destes pontos é apresentado como fechado neste pacote.

---

## 6. O que este anexo não cobre

- Interpretação do art. 14.º ou critérios de bloqueio (**Q-EXT-LEG-005**)
- Validação IMT ou manual temporário (**Q-EXT-LEG-001**)
- Matéria **fiscal**, comissões, facturação ou **EXT-FIS**
- **Art. 17.º-A** (**Q-EXT-LEG-006** — fora do dossier v1)
- Dados pessoais, contratos assinados ou documentação KYC

---

*Documento de apoio ao dossier EXT-LEG-2026-10-11. Estado dossier: REVIEW — não enviado.*
