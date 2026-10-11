# DRAFT — Blueprint dossier advogado (não final)

| Campo | Valor |
|-------|--------|
| **Dossier ID** | `EXT-LEG-DRAFT` *(substituir por EXT-LEG-YYYY-MM-DD no envio)* |
| **Estado** | **BLUEPRINT / DRAFT** — não enviar |
| **Confidencialidade** | EXTERNAL-CONFIDENTIAL |
| **Template base** | [`EXTERNAL_DOSSIER_TEMPLATE.md`](EXTERNAL_DOSSIER_TEMPLATE.md) |

> **Aviso:** Mapeamento de IDs e fontes apenas. Contexto final e redacção = trabalho humano antes do envio.

---

## Q-EXT incluídas (PRONTO ENVIO)

| Ordem sugerida | ID | Tema | Prioridade |
|----------------|-----|------|------------|
| 1 | Q-EXT-LEG-001 | Validação IMT + manual temporário | P0 |
| 2 | Q-EXT-LEG-005 | Art. 14.º conhecimento / bloqueios | P0 |
| 3 | Q-EXT-LEG-002 | 10 h / 24 h + cross-platform | P0 |
| 4 | Q-EXT-LEG-003 | SOS / emergência | P0 |
| 5 | Q-EXT-LEG-004 | Contratos + versionamento | P0 |
| 6 | Q-EXT-LEG-007 | Comunicações IMT/AMT (enquadramento legal) | P1 |

**Fora deste dossier (PREPARAR / outro canal):** Q-EXT-LEG-006 (17.º-A) — completar checklist interno primeiro.  
**IMT directo (não duplicar no dossier jurídico como procedimento):** [`Q-EXT-IMT-001`](../../registers/EXTERNAL_CONSULTATIONS.md) — enviar em paralelo ou referenciar resposta técnica quando existir.

---

## Documentos internos — fontes (secções a citar, não copiar)

| Documento | Uso no dossier |
|-----------|----------------|
| [`A3_REQUISITOS_TVDE_SETEMBRO_2026.md`](../../legal/A3_REQUISITOS_TVDE_SETEMBRO_2026.md) | A3-D03-REV1, A3-D04-REV1, gates, driving-hours |
| [`TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md`](../../legal/TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md) | L-01…L-06, L-07, L-10, L-19…L-24, L-29 |
| [`TVDE_59_2026_TECHNICAL_FINDINGS.md`](../../architecture/TVDE_59_2026_TECHNICAL_FINDINGS.md) | Factos técnicos §2–§4 |
| [`DECISIONS.md`](../../registers/DECISIONS.md) | DEC-LEG-003, DEC-LEG-004, DEC-LEG-007, DEC-PROD-002, DEC-LEG-010 |
| [`FINDINGS.md`](../../registers/FINDINGS.md) | FIND-LEG-IMT-*, FIND-LEG-HRS-*, FIND-LEG-SOS-01, FIND-LEG-CTR-01 |
| [`TVDE_DECISOES_PENDENTES_M2_M3_2026-09-25.md`](../../business/TVDE_DECISOES_PENDENTES_M2_M3_2026-09-25.md) | §C2 advogado |
| [`VAMULA_VENTOS_FERTEIS_REGISTO_OFICIAL_2026.md`](../../legal/VAMULA_VENTOS_FERTEIS_REGISTO_OFICIAL_2026.md) | Licença plataforma L-26 *(contexto, sem PII extra)* |

---

## Anexos candidatos (lista curta — a confirmar)

| ID | Candidato | Notas |
|----|-----------|-------|
| A1 | Diagrama auth / roles (link interno) | Só se advogado pedir |
| A2 | Print checklist SOS (fluxo) | Descrição funcional, sem dados reais |
| A3 | Resposta IMT | **Só após** Q-EXT-IMT-001 — referência cruzada |

---

## Dependências abertas (bloqueiam redacção final)

| Dependência | Impacto |
|-------------|---------|
| Resposta **IMT** (Q-EXT-IMT-001) | Informa LEG-001 manual vs integração |
| Dados piloto **O1/O2/O3** (Manel) | Contexto operador/frota/veículos — **não** incluir PII no Git |
| Q-EXT-LEG-006 | Pode integrar segunda vaga dossier P1 |

---

## Secções 6–9

Preencher a partir de [`EXTERNAL_DOSSIER_TEMPLATE.md`](EXTERNAL_DOSSIER_TEMPLATE.md) — **uma subsecção por Q-EXT** listada acima. Texto de pergunta = coluna «Pergunta curta» + detalhe em [`EXTERNAL_CONSULTATIONS.md`](../../registers/EXTERNAL_CONSULTATIONS.md).

**Registo de envio:** vazio até manifesto em [`outbox/`](../outbox/).
