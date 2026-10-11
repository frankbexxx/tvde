# Documentação externa — TVDE

| Campo | Valor |
|-------|--------|
| **id** | EXT-POLICY-001 |
| **title** | Política de documentação externa |
| **type** | REGISTER |
| **created** | 2026-10-11 |
| **updated** | 2026-10-11 |
| **status** | ACTIVO |
| **owner** | Frank |
| **audience** | INTERNAL |

Documento **canónico** para dossiers, manifestos e resumos de resposta enviados a advogado, contabilista, seguradora, IMT, AMT, Stripe e outros terceiros.

**Índice de perguntas:** [`registers/EXTERNAL_CONSULTATIONS.md`](../registers/EXTERNAL_CONSULTATIONS.md) (`Q-EXT-*`)  
**Governance geral:** [`meta/DOCUMENT_GOVERNANCE.md`](../meta/DOCUMENT_GOVERNANCE.md)

---

## 1. Princípio

1. **Interno = fonte de verdade** — specs, decisões e estado vivem no repo (`docs/`, `registers/`, código documentado).
2. **Externo = representação controlada** — derivado para uma **audiência** e **finalidade** definidas; nunca substitui a documentação interna.
3. **Dossier externo ≠ canónico** — o destinatário recebe o mínimo necessário; o detalhe completo permanece nos paths internos referenciados.
4. **Resposta externa não altera o projecto automaticamente** — só após **DECISION interna datada** em [`DECISIONS.md`](../registers/DECISIONS.md) (e actualização de [`FINDINGS.md`](../registers/FINDINGS.md) quando aplicável).
5. **Cadeia:** `FINDING / decisão pendente` → `Q-EXT-*` → dossier + manifesto → envio → resposta → resumo interno → `DEC-*` → implementação/fecho.

---

## 2. O que entra no Git

### Pode entrar

- Templates ([`templates/`](templates/)).
- **Manifestos** de envio ([`outbox/`](outbox/)).
- **Resumos internos** de resposta ([`responses/`](responses/)).
- IDs `Q-EXT-*`, `EXT-*`, hashes/nomes/datas de ficheiros **externos** (sem conteúdo sensível).
- Referências a documentos internos (links, IDs `DEC-*`, `FIND-*`).
- Estado do envio e rastreabilidade.

### Não deve entrar **por defeito**

- Emails completos.
- Contratos assinados.
- Documentos pessoais / identificação.
- IBAN, NIF de pessoas singulares.
- Anexos com PII.
- Respostas confidenciais **integrais** de advogado/contabilista.
- PDFs sensíveis ou dossiers finais com dados operacionais reais.

Excepção: só com decisão explícita do responsável e plano de redacção; preferir sempre resumo interno + original fora do Git.

---

## 3. Storage externo (original enviado/recebido)

O **original** (PDF, email arquivado, portal) pode viver **fora do Git** em storage controlado (fornecedor **não** escolhido nesta fase).

O repo deve permitir saber:

| Campo | Onde registar |
|-------|----------------|
| O que foi enviado | Manifesto [`outbox/`](outbox/) |
| Quando / a quem / versão | Manifesto |
| Perguntas incluídas | `Q-EXT-*` no manifesto + dossier |
| Onde está a cópia externa | Campo **localização externa** no manifesto |
| Resposta recebida | Resumo [`responses/`](responses/) + data no manifesto |
| DECISION que incorporou | Manifesto + resumo → [`DECISIONS.md`](../registers/DECISIONS.md) |

---

## 4. Confidencialidade (níveis)

| Nível | Uso |
|-------|-----|
| **INTERNAL** | Manifestos, resumos de resposta, política, templates preenchidos para uso interno |
| **EXTERNAL-CONFIDENTIAL** | Dossier destinado a advogado, contabilista, seguradora, etc. |
| **PUBLIC** | Materiais já publicados (site, páginas legais) — referência apenas |

Por defeito: dossier advogado/contabilista = **EXTERNAL-CONFIDENTIAL**; response summaries e manifestos = **INTERNAL**.

---

## 5. Estrutura de pastas

```text
docs/external/
├── README.md                 ← esta política
├── templates/                ← modelos reutilizáveis + DRAFT blueprints
├── outbox/                   ← manifestos de envio (EXT-*)
└── responses/                ← resumos internos pós-resposta
```

| Artefacto | Template |
|-----------|----------|
| Dossier | [`templates/EXTERNAL_DOSSIER_TEMPLATE.md`](templates/EXTERNAL_DOSSIER_TEMPLATE.md) |
| Manifesto | [`templates/EXTERNAL_SEND_MANIFEST_TEMPLATE.md`](templates/EXTERNAL_SEND_MANIFEST_TEMPLATE.md) |
| Resumo resposta | [`templates/EXTERNAL_RESPONSE_SUMMARY_TEMPLATE.md`](templates/EXTERNAL_RESPONSE_SUMMARY_TEMPLATE.md) |

Blueprints (não finais): [`DRAFT_LEGAL_DOSSIER.md`](templates/DRAFT_LEGAL_DOSSIER.md) · [`DRAFT_FISCAL_DOSSIER.md`](templates/DRAFT_FISCAL_DOSSIER.md)

---

## 6. Fluxo operacional (resumo)

1. Seleccionar `Q-EXT-*` em estado `PRONTO ENVIO` / `PREPARAR` ([`EXTERNAL_CONSULTATIONS.md`](../registers/EXTERNAL_CONSULTATIONS.md)).
2. Copiar template dossier → preencher **sem PII** desnecessária; exportar PDF **fora do repo** se necessário.
3. Criar manifesto em `outbox/` (`EXT-LEG-YYYY-MM-DD.md`, etc.).
4. Após envio: actualizar manifesto (`ENVIADO`); **não** mudar `Q-EXT` para `ENVIADO` sem manifesto datado (registo canónico).
5. Resposta: resumo em `responses/`; depois `DEC-*`; manifesto `INCORPORADO` / `FECHADO`.

---

## 7. Fase actual (2026-10-11)

- Estrutura e templates **criados**.
- **Nenhum** dossier final enviado; **nenhum** `Q-EXT` marcado como `ENVIADO`.
- Dossiers reais = trabalho pós-validação (Fase 5) + dados Manel onde aplicável.
