# TODO do dia — TVDE

Ficheiro **vivo**: **criar ou actualizar na noite anterior** (5–10 min). Na raiz do repo, junto do [`README.md`](README.md), para abrir logo de manhã.

**Dia vs sessão** — «Dia» no título alinha ao **dia civil** (um ficheiro por data). **Sessão** é cada bloco de trabalho com o assistente: **várias sessões no mesmo dia**, ou uma sessão longa; o **fecho** e o **ritual** aplicam-se ao fim de uma **sessão que entrega** (código/docs) ou ao fim do dia, conforme o hábito.

---

## Método simples (cada dia civil ou arranque de sessão)

1. **Abrir** `README.md` + este ficheiro — orientação sem dispersão.
2. **Escolher** no máximo **3** resultados **verificáveis** no bloco «Hoje» (se só couber **um**, óptimo).
3. **Etiquetar** cada linha: `[PENSAR]` | `[CONVERSA]` | `[CÓDIGO]` | `[DOCS]` | `[OPS]` — para sabermos se é reflexão, alinhamento, implementação, papelada ou infra.
4. **Trabalhar** uma coisa de cada vez; no **fim da sessão** ou do dia, preencher **Fecho do dia** e **Rasto para amanhã** (copiar para o próximo `TODOdoDIA.md` quando mudar a data).
5. **Com o assistente:** foco e verdade directa; sem lisonja. **Linha de foco** (secção abaixo): manter o fio, não empatar em A/B cegos. Git segundo [`.cursor/rules/`](.cursor/rules/) quando aplicável.
6. **Ordem do dia:** por defeito segue a secção **«Ordem sugerida (assistente)»** abaixo; se expressares **intenção contrária** no início da sessão, essa ordem manda.

---

## Regras iniciais (fixas)

- **Poucos itens** — lista longa = nada prioritário. **1–3** linhas no corpo «Hoje».
- **Resultado verificável** — cada item permite dizer «feito / não feito» sem ambiguidade.
- **Testes vs beta** — CI verde não substitui telemóvel real; beta não substitui regressão. Não misturar conclusões entre ambientes.
- **`.env` e segredos** — o assistente **não** altera nem recria `.env` por iniciativa; só com **pedido explícito** teu.
- **Raiz do repo (meta)** — objectivo: na raiz ficarem **só** `README.md` e `TODOdoDIA.md`; os outros `.md` (e auxiliares) migrar para [`docs/`](docs/) com **árvore por nexo** — nomes de pastas são convénio; o essencial é **subdivisão coerente**, não um `other` literal (era placeholder).
- **Disciplina (com nuance)** — objectivo: **não perder a linha do foco** nem **decidir às escuras**. Se a conversa fugir do item activo **sem** alinhamento (nem tu pediste mudança nem houve troca de prós/contras), o assistente **chama à ordem** e propõe voltar ao fio ou **explicitar** o desvio. Isto **não** é «só A ou B»: pode haver **C, D, …** — o que importa é ficar **claro** o que estamos a fazer e porquê.
- **Side project** — referências visuais ou de conversa (Docker Desktop, n8n, Telegram, `occams.*`, `ride_postgres`, etc.) a **outro** repositório ou stack **não** entram no código nem nos rituais **deste** repo salvo **decisão explícita** de integrar; tratamos como **contexto paralelo** («não contaminar»).

---

## Linha de foco e ramos (A, B, C, …)

Metáfora: condução com ramificações reais (prioridades, bloqueios, oportunidades). **Duas hipóteses fixas** não chegam para o longo prazo; o risco é **decidir sem espaço** ou **implementar sem falar**.

- **TODO dinamicamente fixo** — o bloco «Hoje» é **âncora**; quando surgir um desvio útil (ex.: Playwright «fora do roteiro» mas na altura certa), **actualiza-se o TODO** (item novo, ou nota no Fecho / Rasto) para o desvio ficar **registado**, não só na conversa.
- **Linha de foco** — é o **fio** do objectivo corrente (o que fecha o dia ou o merge), não «apenas uma das duas letras». Dentro do fio, **desvios oportunos** são válidos quando **reduzem risco ou trabalho futuro** e quando **alinhámos** em voz (mesmo que breve) prós e contras.
- **Ramos C / outros** — o assistente pode trazer **por defeito** um próximo passo **e** alternativas com **uma frase** de trade-off cada; tu escolhes ou pedes outro ramo. **Sem** mudanças grandes de scope «em silêncio» — figurativo: nada de avançar sem **conversa** quando o impacto ou o risco o justificam.
- **Regras fundamentalmente fixas** — as que estão neste ficheiro e nas [`.cursor/rules/`](.cursor/rules/) (segredos, testes antes de merge, etc.) **mantêm-se**; dentro delas há **liberdade** para corrigir rumo **com** alinhamento.
- **Modos de conversa** — checklist **1–5** abaixo; **1–5 fechados** em sessão (2026-04-13); o **1** pode **afinar-se** ao longo do tempo sem reabrir o debate inteiro.

### Modos de conversa — checklist

1. **Compreensão mútua** — **fechado (texto base 2026-04-13):**
   - **Sinais explícitos** — «certo» / «sim» = concordo com o que foi dito; **desacordo** = reacção **efusiva** cedo → tratar como **não alinhado** até esclarecer (não assumir consenso).
   - **Correcção rápida** — preferido: corrigir o assistente **logo** com uma frase.
   - **Verdade operativa** — [`TODOdoDIA.md`](TODOdoDIA.md) + [`PROXIMA_SESSAO.md`](docs/meta/PROXIMA_SESSAO.md) **sobre o projecto**; o chat desta sessão é continuidade **por defeito**.
   - **Contexto (sequencial vs. tópico novo)** — se **nada** indicar o contrário, o assistente segue o fio **sequencial** do chat (esta sessão / iteracções recentes). Se **entrares com algo novo**, o foco passa a **esse tópico** — continua a ser **do projecto**, mas **não** obrigatoriamente contínuo com o fio anterior («not related, but related»); não forçar encaixe no sub-tópico que estava aí antes sem o dizeres.
   - **Motivo numa linha (opcional)** — ajuda a pesar prós/contras.
   - **Recap quando muda o dia ou o foco da sessão** — no arranque, uma linha do que muda evita puxar contexto errado.
2. **Desvio no TODO** — **fechado:** quando o desvio **muda entregável** (ficheiros, PR, dependência, ou o que amanhã continua), regista já em «Hoje», **Fecho** ou **Rasto**; troca curta só de significado pode ficar no chat.
3. **Onde ser proactivo** — **fechado:** o assistente propõe **ramos / riscos / próximo passo** nos **cantos** do trabalho (fim de um passo, antes de código sensível, antes de merge) — não a interromper cada frase.
4. **Sem silêncio em scope grande** — **fechado:** mudança relevante em auth, pagamentos, contrato de API ou muitos ficheiros → **uma frase de alinhamento** antes de executar (mesmo que seja «seguimos assim?»).
5. **Ritual de merge (passos 2–5)** — **fechado:** a sequência **audits → correcções → merge/PR → PROXIMA + TODO** mantém-se como definida; não entra em «negociação C/D» — só **quando** e **o quê** dentro de cada passo.

---

## Ritual de fecho de sessão (antes de merge na main)

**Quando:** fim da **sessão** ou do **dia civil** que **entrega** código (ou docs com PR).

1. **Testes** — `pytest` / `npm run test` / `npm run test:e2e` conforme o que mudou; ou confirmar **checks verdes** no PR antes de merge.
2. **Audits** — lint/typecheck do que tocaste; smoke rápido se for área sensível (auth, pagamentos, estado de viagem).
3. **Correcções** — só o necessário para 1–2 ficarem verdes; **sem** scope creep.
4. **Merge / PR** — fluxo em [`.cursor/rules/git-commit-and-pr.mdc`](.cursor/rules/git-commit-and-pr.mdc) e alinhamento `main` em [`.cursor/rules/git-main-sync.mdc`](.cursor/rules/git-main-sync.mdc).
5. **Documentação de continuidade** — actualizar [`PROXIMA_SESSAO.md`](docs/meta/PROXIMA_SESSAO.md) onde fizer falta; **preparar** a continuidade no [`TODOdoDIA.md`](TODOdoDIA.md) (**Fecho do dia** + **Rasto para amanhã** na mudança de data, ou nota no mesmo dia se ainda for o mesmo `TODOdoDIA`).
6. **Parar** — não abrir fio grande novo na mesma sessão após 5; o que sobrou vai para o **Rasto**.

### Abertura na sessão seguinte (validação pós-fecho)

Depois de **fecho + PR** (quando aplicável), na **primeira sessão útil a seguir** — pode ser **no mesmo dia civil** ou no dia seguinte — fazer um **smoke** mínimo do que ficou acordado: por exemplo abrir o [`README.md`](README.md) e seguir 1–2 links críticos (ex.: [`docs/meta/DOCS_INDEX.md`](docs/meta/DOCS_INDEX.md)); reler o **Rasto**; se mergiu código, o comando de teste mais estreito ligado à mudança. Isto **substitui** tentar «validar o dia seguinte» só mudando o relógio: valida-se na **nova sessão**, com cabeça fresca.

---

## Ordem sugerida (assistente)

Ordem por defeito para **desbloquear** o dia sem repetir trabalho:

1. **Esclarecimentos** — perguntas concretas; alinhar definições antes de mexer em código.
2. **Análise de projecto** — onde estamos, risco, decisão «fazemos / não fazemos».
3. **Análise de código** — ficheiros ou domínio, só depois de 1–2 estarem claros.
4. **Melhores práticas (free / paid)** + **Conversa para aprofundar** — podem intercalar com 2–3 se forem curtas.
5. **Limpeza raiz → `docs/`** — bloco separado; só quando for **o** resultado do dia (evita PR gigante misturado com feature).
6. **Último: fecho** — reflexões do dia + **rasto para amanhã** (já no próprio ficheiro). Se houve **código** a caminho de merge, seguir antes o **[Ritual de fecho de sessão](#ritual-de-fecho-de-sessão-antes-de-merge-na-main)** (secção acima).

Se o dia for **só pensar**, os passos 2–4 encolhem para `[PENSAR]` / `[CONVERSA]` e não há `[CÓDIGO]` — o ritual 1–4 reduz-se a «nada a testar» ou só verificação mental; **5–6** mantêm-se (PROXIMA + TODO + parar).

---

## Hoje 2026-04-16

_Nova sessão — `main` alinhada com `origin/main` após merges **#87** + **#88**._

### Prioridades (ordem sugerida)

1. [x] [OPS] **Pós-merge + smoke** — `main` = `origin/main`; smoke no **GitHub**: [`README.md`](README.md) → [`docs/meta/DOCS_INDEX.md`](docs/meta/DOCS_INDEX.md) → [`docs/diagrams/README.md`](docs/diagrams/README.md) → [`docs/legal/PARCEIRO_TVDE_CHECKLIST.md`](docs/legal/PARCEIRO_TVDE_CHECKLIST.md).
2. [x] [DOCS] **Diagramas — expansão** — [`04_REALTIME.md`](docs/diagrams/04_REALTIME.md): sequences passageiro (polling), motorista (polling + WS ofertas), admin WS; [`03_PAYMENTS.md`](docs/diagrams/03_PAYMENTS.md): tabela `event_type` Stripe; novo [`07_AUTH_OTP.md`](docs/diagrams/07_AUTH_OTP.md); índice em [`docs/diagrams/README.md`](docs/diagrams/README.md).
3. [ ] [CONVERSA / DOCS] **Parceiro (fora do Cursor)** — Preencher com parceiro/advogado o [`PARCEIRO_TVDE_CHECKLIST.md`](docs/legal/PARCEIRO_TVDE_CHECKLIST.md) (§2–§6 + §9 «Registo de decisões»).

### Sessão encerrada — 2026-04-15 (resumo)

- Entregue: smoke docs + Render; [`docs/legal/PARCEIRO_TVDE_CHECKLIST.md`](docs/legal/PARCEIRO_TVDE_CHECKLIST.md); pasta [`docs/diagrams/`](docs/diagrams/) (`README` + `01`–`06`); índices actualizados. **PRs:** checklist legal **#87** (se ainda por mergear); diagramas + handoff **#88**.

---

## Hoje 2026-04-15 (arquivo de sessão)

**Ordem acordada:** manhã parceiro / papelada; tarde Mermaid.

### Prioridades (todas concluídas nesta sessão)

- [x] [OPS] **Git remoto** — PR **#86** mergeado; `main` ↔ `origin/main` alinhados (sessão 2026-04-13).
- [x] [OPS / Smoke] **Pós-PR86** — Smoke **docs no GitHub** (espinha 1–4, cruzamentos nexo 5–8, `docs/README` §9, refs 10–12: **CERTO**). **Render:** regresso contínuo com **4 vistas** (mesmo deploy, **BD única**); **manual deploy** do último commit antes de ausências (ex.: passeio) = **dupla métrica** (paridade Git↔ambiente + disciplina de teste).
- [x] [PENSAR / DOCS] **Diagramas** — Pasta [`docs/diagrams/`](docs/diagrams/) com **README índice** + `01`–`06` (viagem, ofertas, pagamentos, realtime, cron, roles); **expandir** por PR quando o código ganhar novos fluxos.
- [x] [DOCS] **Parceiro — licença e papelada** — [`docs/legal/PARCEIRO_TVDE_CHECKLIST.md`](docs/legal/PARCEIRO_TVDE_CHECKLIST.md): tabelas + checklists para conversa com o titular TVDE (IMT, seguros, contratos, RGPD, Stripe/faturação); **não** é aconselhamento jurídico.
- [x] **Surpresa (5)** — Smoke **visual** em **produção Render**: vista **passageiro** (mapa, estados «Motorista a caminho» / «Viagem em curso», pagamento a processar, distância, **Cancelar**) e vista **admin** (viagens activas, `accepted` / `arriving`, Detalhe / Cancelar, lista lateral). Confirma o produto **no ar** e o fio que falámos (acção remota / telemóvel).

### Backlog — raiz → `docs/` (**feito** em 2026-04-13)

Na raiz ficam **`README.md`** + **`TODOdoDIA.md`**. O restante canónico foi para `docs/meta/`, `docs/deploy/`, `docs/testing/`, `docs/ops/` — ver [`docs/meta/DOCS_INDEX.md`](docs/meta/DOCS_INDEX.md). `DEPLOY_SECRETS.md` continua **fora do Git** (`.gitignore`).

### Fecho do dia

**2026-04-15 (fecho de sessão)**

- **Feito:** Smoke **GitHub** no percurso combinado (README → DOCS_INDEX → PROXIMA F → stubs/cross-links → refs); **Render** com **4 painéis** e hábito **redeploy manual** do último commit antes de ausências (dupla disciplina: ambiente = Git + teste contínuo). **Docs:** [`docs/legal/PARCEIRO_TVDE_CHECKLIST.md`](docs/legal/PARCEIRO_TVDE_CHECKLIST.md) + pasta [`docs/diagrams/`](docs/diagrams/) (Mermaid) + entradas em `DOCS_INDEX` / `docs/README`. **Git:** PR **#88** (`feat/docs-diagrams-mermaid` — diagramas + TODO 2026-04-16 + `PROXIMA`); PR **#87** checklist legal em paralelo se ainda aberto.
- **Não feito / bloqueios:** —
- **Aprendizados:** Links `.md` resolvem no **GitHub** ou no **IDE**; abrir em **host aleatório** → 404 (normal).

**2026-04-13 (arquivo)**

- **Feito:** Análise de projecto; melhores práticas free/paid; mini-audit `trips.py`; **modos de conversa** (checklist 1–5); **docs** — canónicos para `docs/meta|deploy|testing|ops`; smokes de links ok; PR #86 depois mergeado.

### Rasto para a próxima sessão

- **Âncora:** secção **Hoje 2026-04-16** (acima) — item **3** (parceiro humano) ou saltar para **Roteiro W1** (cron + webhook) se quiseres priorizar teste real antes do papel.
- **Handoff longo:** [`docs/meta/PROXIMA_SESSAO.md`](docs/meta/PROXIMA_SESSAO.md) Secção D (arranque imediato + recomendações anteriores).
- **Hábito (manter):** 4 vistas Render + **BD única** + **manual deploy** último commit quando quiseres paridade máxima com `main`.
- **Side project** — n8n/Telegram/etc. **fora** deste TODO TVDE até decisão explícita.
- **Ideias (só conversa)** — alertas operacionais → admin app; pricing no accept — sem implementação até decisão em `PROXIMA`.

---

## Roteiro acelerado (comercialização / teste real)

Objectivo: sequência **curta** de ondas (meia sessão a ~2 sessões cada), priorizando o que desbloqueia **piloto com pessoas reais** e **dinheiro com controlo**, sem misturar com side project. Detalhe técnico: [`docs/TODO_CODIGO_TVDE.md`](docs/TODO_CODIGO_TVDE.md), [`docs/visao_cursor.md`](docs/visao_cursor.md) §4, [`docs/meta/PROXIMA_SESSAO.md`](docs/meta/PROXIMA_SESSAO.md) Sec. D/F.

| Onda | Foco | Entregável verificável |
| ---- | ---- | ------------------------ |
| **W1** | **Operação PROD confiável** | Cron externo a bater `GET /cron/jobs` com segredo correcto; efeitos de timeouts verificáveis; webhook Stripe em ambiente escolhido com assinatura + idempotência **validados** (checklist em [`docs/prompts/A033_B_VALIDATION_HARDENING_PLAYBOOK.md`](docs/prompts/A033_B_VALIDATION_HARDENING_PLAYBOOK.md)). |
| **W2** | **Runbook humano** | Um `.md` curto em `docs/ops/` (1–2 páginas): pagamento preso / disputa, viagem presa em estado intermédio, «quem faz o quê» em 24h — liga a `system-health` e logs que já tens. |
| **W3** | **Staging (A027)** | Segundo ambiente (API+DB+frontend) com Stripe **test** + webhook test; smoke repetível antes de tocar em live. |
| **W4** | **Dados (A028)** | Backup PG automático + **um** exercício de restore documentado (mesmo que manual na primeira vez). |
| **W5** | **Piloto numerado** | Lista fechada de beta testers; critérios de saída («o que fica para V2»); export partner + admin para reconciliação; **Stripe live** só após checklist financeiro e acordo teu ([`docs/testing/TESTE_STRIPE_COMPLETO.md`](docs/testing/TESTE_STRIPE_COMPLETO.md)). |
| **W6** | **Pacote confiança mínimo** | Paralelo **humano**: preencher [`docs/legal/PARCEIRO_TVDE_CHECKLIST.md`](docs/legal/PARCEIRO_TVDE_CHECKLIST.md); termos/privacidade **redigidos por advogado** (o repo não substitui isso — ver `visao_cursor` §4.2). |
| **W7** | **Pós-piloto (não bloquear W1–W6)** | Alerting (uptime / erros); expansão Mermaid (`07_` auth, sequences); `ENABLE_CONFIRM_ON_ACCEPT` **só** após decisão explícita em `PROXIMA`; PWA/push conforme `visao_cursor` §4.1 — **não** antecipar antes de W5 estável. |

**Regra de ouro:** uma onda **fechada** (merge + smoke) antes de abrir a seguinte, salvo trabalho humano (W6) em paralelo com W3–W5.

---

## Modelo mínimo (copiar na noite anterior)

```markdown
## Hoje — AAAA-MM-DD

### Prioridades

- [ ] [PENSAR] …
- [ ] [CÓDIGO] …

### Fecho do dia

- **Feito:**
- **Não feito / bloqueios:**
- **Aprendizados:**

### Rasto para amanhã

- …
```
