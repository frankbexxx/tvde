# Governance documental — TVDE

| Campo | Valor |
|-------|--------|
| **id** | GOV-DOC-META |
| **title** | Governance documental TVDE |
| **type** | REGISTER |
| **created** | 2026-10-11 |
| **updated** | 2026-10-11 |
| **status** | ACTIVO |
| **owner** | Frank / equipa TVDE |

Documento **canónico** das regras de documentação interna. Complementa [`DOCS_INDEX.md`](DOCS_INDEX.md) (navegação CURRENT) e [`../registers/DECISIONS.md`](../registers/DECISIONS.md) (decisões registadas).

---

## 1. Princípios

1. **Interno = fonte de verdade** — o repo (docs acordados) é a referência para estado, decisões e procedimentos.
2. **Externo = representação controlada** — dossiers para advogado, contabilista ou terceiros são derivados, com audiência e finalidade definidas.
3. **Resposta externa** só altera o estado do projecto quando incorporada numa **decisão interna datada** (registo em `DECISIONS.md` ou documento DECISION dedicado).
4. **Decisão / decision-like** tem sempre **data** (e, quando aplicável, responsável, estado, evidência).
5. **Snapshots não competem** com documentos vivos — auditorias e PASS datados são histórico fechado, não painel do dia.
6. **Histórico é preservado** — classificado ARCHIVE / LEGACY / REVIEW; separação clara mesmo antes de mover pastas (`docs/archive/`).
7. **Prompts não são documentação canónica** — instruções a agentes; não enviar a externos como spec ou parecer.
8. **Fontes legais primárias** (`legal/sources/`, índice oficial) **≠** research ou interpretação interna (matriz, A3, findings).

**Estrutura (GOV-DOC-001):** domínios actuais (`architecture/`, `legal/`, …). **Não** usar `docs/current/`. Adicionar progressivamente `registers/`, `external/`, `archive/` conforme fases de migração.

---

## 2. Tipos documentais

| Tipo | Uso |
|------|-----|
| **DECISION** | Escolha datada; estado DECIDIDO / OBSOLETO com `superseded_by` |
| **REGISTER** | Índice ou registo oficial (decisões, findings, consultas) |
| **PLAN** | Plano mestre ou carril de execução vivo |
| **RUNBOOK** | Procedimento repetível (inclui checklists operacionais) |
| **AUDIT** | Snapshot imutável — auditoria, smoke PASS, readiness datado |
| **FINDING** | Item atómico rastreável (índice em `FINDINGS.md` + doc fonte) |
| **EXTERNAL DOSSIER** | Derivado para audiência externa (manifesto no Git; PDF sensível preferencialmente fora) |

CHECKLIST integra **RUNBOOK** ou **AUDIT**, sem tipo próprio.

---

## 3. Estados

| Estado | Significado |
|--------|-------------|
| **RASCUNHO** | Em elaboração |
| **ACTIVO** | Documento vivo em uso |
| **DECIDIDO** | Decisão fechada internamente |
| **PENDENTE EXTERNO** | Aguarda advogado / fiscal / IMT / Stripe / etc. |
| **VALIDADO EXTERNO** | Resposta externa incorporada |
| **FECHADO** | Trabalho concluído (ex.: auditoria); não reabrir salvo errata |
| **OBSOLETO** | Substituído; manter link `superseded_by` |

---

## 4. Metadata mínima

**Obrigatória** (novos docs e canónicos tocados em governance):

- `id`, `title`, `type`, `created`, `updated` (vivos), `status`, `owner`

**Opcional:**

- `version`, `audience`, `confidentiality`, `supersedes`, `superseded_by`, `related_decisions`, `related_findings`, `evidence`, `source_of_truth`

Não converter retroactivamente todos os ficheiros do repo.

---

## 5. Documento vivo vs snapshot

| | Vivo | Snapshot |
|---|------|----------|
| **Filename** | Estável (sem data) | Datado (`_YYYY-MM-DD`) |
| **Conteúdo** | Estado actual; `updated` evolui | Imutável após FECHADO |
| **Papel** | Fonte de verdade operacional | Evidência / fotografia |

Exemplo futuro: readiness Stripe vivo `STRIPE_LIVE_READINESS.md` vs auditoria [`STRIPE_LIVE_READINESS_2026-10-08.md`](../architecture/STRIPE_LIVE_READINESS_2026-10-08.md) (AUDIT).

---

## 6. Classificação CURRENT / ARCHIVE / LEGACY / REVIEW

| Classe | Significado |
|--------|-------------|
| **CURRENT** | Válido hoje como fonte de verdade, runbook, plano ou registo |
| **ARCHIVE** | Histórico válido encerrado (smoke PASS, plano substituído, status mensal) |
| **LEGACY** | Desactualizado ou incompatible; manter só rastreabilidade |
| **REVIEW** | Validar humanamente antes de CURRENT ou ARCHIVE |

A classificação pode constar de **banner/metadata** antes de mover ficheiros fisicamente.

---

## 7. Fontes de verdade (Fase 1 — 2026-10-11)

| Domínio | Documento |
|---------|-----------|
| Estado operacional diário | [`TODOdoDIA.md`](../../TODOdoDIA.md) |
| Plano mestre | [`ROADMAP_FINAL_ENTREGA_TVDE_2026.md`](../ROADMAP_FINAL_ENTREGA_TVDE_2026.md) |
| Governance | Este ficheiro |
| Arquitectura (entry) | [`architecture/README.md`](../architecture/README.md) |
| Ambiente | [`env/ENV_SINGLE_REALITY.md`](../env/ENV_SINGLE_REALITY.md) |
| Decisões (índice) | [`registers/DECISIONS.md`](../registers/DECISIONS.md) |
| Findings (índice) | [`registers/FINDINGS.md`](../registers/FINDINGS.md) |
| Consultas externas (índice) | [`registers/EXTERNAL_CONSULTATIONS.md`](../registers/EXTERNAL_CONSULTATIONS.md) |

**Arquivados (Fase 2B):** handoff [`PROXIMA_SESSAO.md`](../archive/plans/PROXIMA_SESSAO.md) · status Set [`TVDE_STATUS_SETEMBRO_2026.md`](../archive/plans/TVDE_STATUS_SETEMBRO_2026.md) — operação só [`TODOdoDIA.md`](../../TODOdoDIA.md).

---

## 8. Fases de implementação

| Fase | Conteúdo |
|------|----------|
| **1** | Governance + índice CURRENT + banners (esta fase) |
| **2** | Arquivo físico snapshots / smokes |
| **3** | Popular registos (decisões, findings, consultas) |
| **4** | `docs/external/` — manifestos de envio |
| **5** | Actualizar referências quebradas; rename PLAN se aprovado |

---

_Ver decisões GOV-DOC-001…009 em [`../registers/DECISIONS.md`](../registers/DECISIONS.md)._
