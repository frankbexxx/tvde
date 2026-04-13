# Documentação ativa (`docs/`)

Estrutura enxuta após arquivo (2026-02): implementação, testes e arquitetura **corrente**.

**`_local/`** — ficheiros pessoais de rascunho (`.md`, imagens de sessão): pasta **`docs/_local/`**, ignorada pelo Git.

| Pasta / ficheiro             | Uso                                                                                                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `architecture/`              | Blueprint, estado técnico, convenções, roadmap de engenharia                                                                                                               |
| `testing/`                   | Protocolos e livros de teste (passageiro, motorista, simulador, sistema completo)                                                                                          |
| `prompts/`                   | Regras fixas, UX em curso, playbooks: `A000`, `A014`, … — **piloto comercial / 4 superfícies:** [`prompts/pilot-commercial/README.md`](prompts/pilot-commercial/README.md) |
| `IMPLEMENTACAO_E_TESTES.md`  | Código, testes, deploy e **Parte II** (logs / buffer / pytest detalhado)                                                                                                   |
| `ESTRUTURA_GUI.md`           | Mapa da GUI                                                                                                                                                                |
| `LOGS_E_TESTES_SINTESE.md`   | Atalho — conteúdo em `IMPLEMENTACAO_E_TESTES.md` Parte II                                                                                                                  |
| `STACK_TECNOLOGICO.md`       | Stack e convenções                                                                                                                                                         |
| `CRON_JOB_ORG_INSTRUCOES.md` | Cron externo                                                                                                                                                               |
| `DEBUG_BETA_RENDER.md`       | Depuração BETA no Render                                                                                                                                                   |
| `visao_cursor.md`            | Visão geral, ideias e checklist de comercialização (handoff Cursor)                                                                                                        |
| `TODO_CODIGO_TVDE.md`        | Árvore TODO código — PROD validation, staging, backups, migrações                                                                                                          |

**Histórico antigo (prompts implementados, snapshots, PDFs):** já não está no clone — ver [HISTORICO_FORA_DO_GIT.md](HISTORICO_FORA_DO_GIT.md).

Índice global do repo: [DOCS_INDEX.md](meta/DOCS_INDEX.md).
