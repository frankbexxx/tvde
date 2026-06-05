# Histórico fora do Git

O repositório **já não contém** as pastas `archive/` nem `archive_support/`, nem alguns relatórios pontuais que estavam tracked. Isto reduz o tamanho do clone e o ruído para agentes e devs.

## O que foi retirado do Git (2026-03-27)

| Conteúdo                           | Nota                                                                 |
| ---------------------------------- | -------------------------------------------------------------------- |
| `archive/`                         | Documentação e imagens históricas (prompts antigos, snapshots, etc.) |
| `archive_support/`                 | Runbooks / manuais desatualizados                                    |
| `AUDIT_RELATORIO_COMPLETO.md`      | Relatório de auditoria pontual                                       |
| `docs/TESTES_A026_OPERACAO.md`     | Relatório de testes A026                                             |
| `docs/TESTES_CONSOLIDACAO_TVDE.md` | Relatório consolidação                                               |
| `docs/A022_RELATORIO_EXECUCAO.md`  | Relatório execução A022                                              |

## Onde está a cópia de segurança (máquina de desenvolvimento)

Na máquina onde foi feita a remoção, cópia completa em:

**`C:\dev\_archives\APP\repo-removed-from-git-2026-03-27\`**

(Contém `README_SNAPSHOT.txt`, `archive/`, `archive_support/` e os `.md` listados acima em `docs/` ou raiz.)

**Outros clones / CI:** este caminho **não existe** — quem precisar do histórico deve usar o backup acima, um zip partilhado, ou `git show <commit>:archive/...` antes da remoção.

## O que foi retirado do Git (2026-06 — auditoria Lote 1)

| Conteúdo | Nota |
| -------- | ---- |
| `docs/prompts/pilot-commercial/**` (65 placeholders) | Só texto «aguardando redacção»; índice em `PILOT_COMMERCIAL_PLACEHOLDER_INDEX.md` |
| `docs/build/` (7 ficheiros) | Ondas A–D + ambiance — concluídas; contratos em `docs/ux/` |
| Stubs | `LOGS_E_TESTES_SINTESE`, `ROADMAP_TVDE_ATE_PRODUCAO`, `RELATORIO_PROJETO_ROADMAP`, `OPERATION_CHECKLIST`, `DOCUMENTATION_INVENTORY_2026-03-27` |
| `docs/snapshots/SNAPSHOT_2026-04-*.md` | Abril 2026 |

**Cópia:** `C:\dev\_archives\APP\docs-2026-06\lote-1\` (`README_SNAPSHOT.txt` + espelho de pastas).

## O que foi retirado do Git (2026-06 — auditoria Lote 2)

| Conteúdo | Nota |
| -------- | ---- |
| `docs/prompts/EXTRA-2026-05-13-*` (8) | Lista EXTRA driver/passageiro — **feito** em `main`; decisões absorvidas em `docs/ux/` e painéis |
| `docs/prompts/ambiance/` (7) | Prompts DOC; contratos vivos em `docs/ux/` |
| `docs/prompts/passenger-frota-2026-05-06/` (3) | PR **#287** entregue |
| `docs/prompts/manel-legal-extra-2026-05/` (4) | Prompts pontuais Manel — entregues ou absorvidos |
| `docs/prompts/i18n-v2/PROMPT_I18N_*.md` (22) | Série concluída; mantidos `PROMPT_I18N_INDEX.md`, `PROMPT_I18N_X3_LEGAL_POLICY.md` + [`I18N_NICHOS_EN.md`](architecture/I18N_NICHOS_EN.md) |
| `CRUISE_PROMPTS_2026-04-28`, `UX_MINI_ROADMAP_E_PROMPTS`, `PROMPT_ZONES_V1_*` | Roadmaps/prompts históricos |

**Cópia:** `C:\dev\_archives\APP\docs-2026-06\lote-2\` (`README_SNAPSHOT.txt` + espelho de pastas).

## O que foi retirado do Git (2026-06 — auditoria Lote 3)

| Conteúdo | Nota |
| -------- | ---- |
| `docs/todo-em-curso.md` | Triple handoff eliminado — fonte única: `TODOdoDIA.md` + `PROXIMA_SESSAO.md` |
| Corpo histórico `TODOdoDIA.md` | Painéis Abril–Maio truncados (~1180 linhas → ~100) |
| Corpo histórico `PROXIMA_SESSAO.md` | Fechos Abril/Alpha/duplicados truncados (~895 linhas → ~70) |

**Cópia:** `C:\dev\_archives\APP\docs-2026-06\lote-3\` (`TODOdoDIA.md`, `PROXIMA_SESSAO.md`, `todo-em-curso.md`, `README_SNAPSHOT.txt`).

## Referências úteis que continuam no repo

- Roadmap técnico + anexo A023–A035: `docs/architecture/TVDE_ENGINEERING_ROADMAP.md`
- Handoff e operação: `docs/meta/PROXIMA_SESSAO.md` (Seção F e G)
- Confirmação Stripe (decisão futura): no snapshot, `archive/docs_nao_essenciais/STRIPE_CONFIRMACAO_FUTURA.md`
- Roadmap histórico texto: no snapshot, `archive/docs_2026_03_22/ROADMAP.md`
