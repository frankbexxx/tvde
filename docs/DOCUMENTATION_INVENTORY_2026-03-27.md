# Inventário da documentação e media (Git) — 2026-03-27

Objetivo: **decidir o que permanece no repositório**, o que **fundir** noutros `.md`, e o que **arquivar fora do Git** (`C:\dev\_archives\APP\…`), **sem apagar nada neste passo**.

Método: `git ls-files` filtrado por `*.md` e extensões de imagem. Estado do working tree na data do ficheiro.

---

## Resumo numérico

| Tipo                         | Quantidade (tracked) | Nota                                                            |
| ---------------------------- | -------------------- | --------------------------------------------------------------- |
| Ficheiros `.md`              | **~175**             | inclui tudo em `archive/`                                       |
| `.md` **fora** de `archive/` | **~58**              | candidatos a “espinha dorsal” + `docs/` ativos                  |
| Imagens (png/svg) tracked    | **17**               | quase tudo sob `archive/`; **2** em `web-app/` (assets normais) |

---

## Aviso: índice vs ficheiro por commitar

`DOCS_INDEX.md` aponta para `docs/GITHUB_MANUAL_TVDE.md`, mas esse ficheiro está **por adicionar ao Git** (`git add`). **Decisão pendente:** fazer `git add docs/GITHUB_MANUAL_TVDE.md` **ou** remover a entrada do índice até estar committed.

---

## 1. Raiz do repositório (`/`)

| Ficheiro                       | Função resumida             | Recomendação inicial                                                                                               |
| ------------------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `README.md`                    | Entrada do projeto          | **Manter** — âncora                                                                                                |
| `DOCS_INDEX.md`                | Mapa da documentação        | **Manter** — âncora (actualizar na fase “espinha”)                                                                 |
| `PROJECT.md`                   | Produto, modelo, fluxos     | **Manter**                                                                                                         |
| `PROXIMA_SESSAO.md`            | Handoff entre sessões       | **Manter** (ou fundir num único “estado” se quiseres menos ficheiros)                                              |
| `GUIA_TESTES.md`               | Testes manuais              | **Manter** — canónico operacional                                                                                  |
| `PREPARACAO_RENDER.md`         | Deploy Render               | **Manter**                                                                                                         |
| `TESTE_STRIPE_COMPLETO.md`     | Stripe E2E                  | **Manter**                                                                                                         |
| `VALIDACAO_HUMANA_CAMPO.md`    | Testes em campo             | **Manter**                                                                                                         |
| `INTERACTION_LOGGING.md`       | Telemetria / export de logs | **Manter**                                                                                                         |
| `OPERATION_CHECKLIST.md`       | Checklist operação          | **Feito:** fundido em `PROXIMA_SESSAO.md` Secção F; raiz = stub com link                                           |
| `RELATORIO_PROJETO_ROADMAP.md` | Roadmap / relatório         | **Feito:** fundido em `PROXIMA_SESSAO.md` Secção G + anexo A023–A035 em `TVDE_ENGINEERING_ROADMAP.md`; raiz = stub |
| `AUDIT_RELATORIO_COMPLETO.md`  | Relatório de auditoria      | **Arquivar** fora do Git após confirmar que não há decisões únicas só aqui; manter sumário no índice se necessário |

---

## 2. `docs/` (activos, fora de `archive/`)

### 2.1 Mapa e stack

| Ficheiro                            | Recomendação                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| `docs/README.md`                    | **Manter** — mapa da pasta `docs/`                                                      |
| `docs/STACK_TECNOLOGICO.md`         | **Manter**                                                                              |
| `docs/ESTRUTURA_GUI.md`             | **Manter**                                                                              |
| `docs/architecture/*` (4 ficheiros) | **Manter** — blueprint, roadmap técnico, estado, naming                                 |
| `docs/visao_cursor.md`              | **Manter** ou **fundir** notas em `PROXIMA_SESSAO` / playbook se preferires um só sítio |

### 2.2 Operacional / debug / TODO

| Ficheiro                                                                                              | Recomendação                                                                                                                               |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/DEBUG_BETA_RENDER.md`                                                                           | **Manter**                                                                                                                                 |
| `docs/TODO_CODIGO_TVDE.md`                                                                            | **Manter** até pré-prod estabilizar; depois **arquivar** ou reduzir a checklist no índice                                                  |
| `docs/TVDE_BACKEND_PROXIMOS_PASSOS_OBSERVABILIDADE.md`                                                | **Manter**                                                                                                                                 |
| `docs/CRON_JOB_ORG_INSTRUCOES.md`                                                                     | **Manter** se ainda usas cron nessa org; senão **arquivar**                                                                                |
| `docs/IMPLEMENTACAO_E_TESTES.md`, `docs/LOGS_E_TESTES_SINTESE.md`                                     | **Feito:** Parte II em `IMPLEMENTACAO_E_TESTES.md`; `LOGS_*` = stub                                                                        |
| `docs/PRICING_DECISION.md`                                                                            | **Manter** se decisão ainda vigente                                                                                                        |
| `docs/ROADMAP_TVDE_ATE_PRODUCAO.md`                                                                   | **Feito:** anexo em `TVDE_ENGINEERING_ROADMAP.md`; ficheiro = stub                                                                         |
| `docs/TESTES_A026_OPERACAO.md`, `docs/TESTES_CONSOLIDACAO_TVDE.md`, `docs/A022_RELATORIO_EXECUCAO.md` | **Arquivar** fora do Git (relatórios de sessão); deixar **uma linha** no `DOCS_INDEX` “histórico em arquivo local” se precisares de trilho |

### 2.3 `docs/prompts/` (agentes / implementação)

| Ficheiro                                                          | Recomendação                                                                                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `A000_SYSTEM_RULES.md`, `A033_B_VALIDATION_HARDENING_PLAYBOOK.md` | **Manter** — referência viva                                                                                                                |
| `A014`, `A019_*`, `A020_*`, `A021`, `A022`, `A026_*`, `A032`      | **Manter** enquanto forem usados em Cursor; **arquivar** prompts “fechados” numa só pasta em `archive/` ou fora do Git quando a fase acabar |
| Nomes com encoding estranho (`A019_QA_ EXECU…`, `A020_SESSION…`)  | **Renomear** (sem mudar conteúdo) num PR pequeno — melhora links e grep                                                                     |

### 2.4 `docs/testing/` (test book numerado)

| Ficheiro     | Recomendação                                                                                                                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1_` … `11_` | **Manter** como suite canónica **ou** **fundir** num único `TEST_BOOK.md` com índice interno (trabalho maior); até lá, manter pasta e linkar no `DOCS_INDEX` como bloco único “Test book” |

---

## 3. `archive/` (já marcado como arquivo **dentro** do Git)

Pastas: `archive/docs_2026_03_22/`, `archive/docs_2026_03_26/`, `archive/docs_maint_2026_02_23/`, `archive/docs_nao_essenciais/`, `archive_support/`, etc.

| Recomendação estratégica                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Fase posterior:** cópia completa para `C:\dev\_archives\APP\git-archive-snapshot-AAAA-MM-DD\` e **`git rm -r` do `archive/`** no repo — reduz ruído e tamanho do clone. Só depois de confirmares que não precisas disto em CI nem em links partidos. |
| Até lá: tratar como **read-only**; não reescrever em massa.                                                                                                                                                                                            |

---

## 4. Imagens tracked

| Localização                                               | Recomendação                                                                             |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `web-app/public/vite.svg`, `web-app/src/assets/react.svg` | **Manter** — assets do build                                                             |
| Tudo sob `archive/**` (\*.png)                            | **Sair com o `archive/`** na fase de remoção, **ou** arquivar em disco antes do `git rm` |
| `archive_support/ChatGPT Image …png`                      | Candidato forte a **arquivar fora do Git** / remover do tracking                         |

---

## 5. Outros paths úteis (já “magros”)

| Path                                     | Nota       |
| ---------------------------------------- | ---------- |
| `backend/DATABASE_SCHEMA_RAW.md`         | **Manter** |
| `backend/tools/simulator/README.md`      | **Manter** |
| `scripts/README.md`, `web-app/README.md` | **Manter** |

---

## 6. Próximos passos (ordem acordada)

1. **Rever este inventário** — marca à mão ✓ onde discordares das recomendações.
2. **Espinha dorsal:** actualizar `README.md` + `DOCS_INDEX.md` (secções _Canónico_ / _Legado / arquivo_ / _Ação pendente: commit GITHUB_MANUAL_).
3. **Fundir** pares acordados (roadmaps, relatórios redundantes) em PRs pequenos.
4. **Arquivo físico + `git rm`:** só depois de cópia para `C:\dev\_archives\APP\…` e backup verificado.

---

_Gerado como parte do plano “inventário leve → espinha → arquivo”. Nenhum ficheiro foi removido ao criar este documento._
