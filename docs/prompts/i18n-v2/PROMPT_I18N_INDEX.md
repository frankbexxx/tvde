# PROMPT_I18N_INDEX — pacote i18n v2 (resumo)

**Estado:** série **concluída** (`main`, PRs #353 + #354). Prompts de execução arquivados (auditoria docs Lote 2).

## Ordem executada

E0 → X1 → P1P2 → P3 → P4P5 → P6 → X2 → D7 → D1 → D2 → D3 → D4 → D5 → D6 → X0 → R1 → R2 → R3 → R4 → R5 → R6 → Z0

## Namespaces

| Namespace | Uso |
|-----------|-----|
| `common` | Voltar, Fechar, menu shell (X1) |
| `trip` | Estados viagem, pagamento |
| `auth` | Login, landing |
| `passenger` / `driver` / `partner` | Copy por shell |
| `settings` | Idioma, aspeto, activity log |
| `errors` | Só via `apiErrors.ts` |

## Tracker (IDs concluídos)

| ID | Estado | Notas |
|----|--------|-------|
| E0 | Concluído | Login/landing locale (#353) |
| X1 | Concluído | AppMenuShell |
| P1P2–P6 | Concluído | Passageiro map/menu/conta |
| X2 | Concluído | Trip cards partilhados |
| D7, D1–D6 | Concluído | Motorista (legacy menu residual possível) |
| X0 | Concluído | Settings shell |
| R1–R6 | Concluído | Parceiro |
| Z0 | Concluído | build/test/lint |
| X3 | Bloqueado | [`PROMPT_I18N_X3_LEGAL_POLICY.md`](./PROMPT_I18N_X3_LEGAL_POLICY.md) |

## Manutenção EN

Workflow screenshot → chave JSON: [`docs/architecture/I18N_NICHOS_EN.md`](../../architecture/I18N_NICHOS_EN.md).

Arquivo dos prompts individuais: `C:\dev\_archives\APP\docs-2026-06\lote-2\docs\prompts\i18n-v2\`.
