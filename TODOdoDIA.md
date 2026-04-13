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
   - **Verdade operativa** — [`TODOdoDIA.md`](TODOdoDIA.md) + [`PROXIMA_SESSAO.md`](PROXIMA_SESSAO.md) **sobre o projecto**; o chat desta sessão é continuidade **por defeito**.
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
5. **Documentação de continuidade** — actualizar [`PROXIMA_SESSAO.md`](PROXIMA_SESSAO.md) onde fizer falta; **preparar** a continuidade no [`TODOdoDIA.md`](TODOdoDIA.md) (**Fecho do dia** + **Rasto para amanhã** na mudança de data, ou nota no mesmo dia se ainda for o mesmo `TODOdoDIA`).
6. **Parar** — não abrir fio grande novo na mesma sessão após 5; o que sobrou vai para o **Rasto**.

### Abertura na sessão seguinte (validação pós-fecho)

Depois de **fecho + PR** (quando aplicável), na **primeira sessão útil a seguir** — pode ser **no mesmo dia civil** ou no dia seguinte — fazer um **smoke** mínimo do que ficou acordado: por exemplo abrir o [`README.md`](README.md) e seguir 1–2 links críticos para `docs/`; reler o **Rasto**; se mergiu código, o comando de teste mais estreito ligado à mudança. Isto **substitui** tentar «validar o dia seguinte» só mudando o relógio: valida-se na **nova sessão**, com cabeça fresca.

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

## Hoje — 2026-04-13

_Data: actualizar na noite anterior se o ficheiro for copiado._

### Prioridades

- [x] [PENSAR] **Análise de projecto** — testes vs beta; GPS real vs simulação; o que prova cada camada. _(sessão: esclarecimentos + síntese no chat)_
- [x] [CONVERSA] **Melhores práticas (free / paid)** — onde vale ferramenta paga vs disciplina gratuita (tempo, foco). _(sessão: critérios free/paid + híbrido no chat)_
- [x] [PENSAR] **Análise de código** — _mini-audit_: `app/services/trips.py` (fluxo assigned → accept → ongoing → complete + Stripe). _(sessão: síntese no chat)_
- [x] [CONVERSA] **Modos de conversa com o assistente** — checklist **1–5** na secção «Linha de foco»; **1–5 fechados** (texto base **1** em 2026-04-13). _Perguntas pontuais dentro deste fio._
- [ ] [DOCS] **Limpeza raiz → `docs/`** — _só se for objectivo do dia; senão deixar no backlog._

### Backlog — raiz → `docs/`

Ficheiros `.md` na raiz **fora** do par `README.md` + `TODOdoDIA.md` (para migração futura; actualizar esta tabela quando moveres):

| Ficheiro na raiz               | Destino sugerido (exemplo)          |
| ------------------------------ | ----------------------------------- |
| `DEPLOY_SECRETS.md`            | `docs/deploy/`                      |
| `DOCS_INDEX.md`                | `docs/meta/`                        |
| `GUIA_TESTES.md`               | `docs/testing/` ou `docs/guias/`    |
| `INTERACTION_LOGGING.md`       | `docs/architecture/` ou `docs/ops/` |
| `OPERATION_CHECKLIST.md`       | `docs/ops/`                         |
| `PREPARACAO_RENDER.md`         | `docs/deploy/`                      |
| `PROJECT.md`                   | `docs/meta/`                        |
| `PROXIMA_SESSAO.md`            | `docs/meta/` ou `docs/handoff/`     |
| `RELATORIO_PROJETO_ROADMAP.md` | `docs/meta/`                        |
| `TESTE_STRIPE_COMPLETO.md`     | `docs/testing/` ou `docs/stripe/`   |
| `VALIDACAO_HUMANA_CAMPO.md`    | `docs/testing/`                     |

_Ajustar pastas ao executar; actualizar links no `README.md` e no `DOCS_INDEX` (ou equivalente em `docs/`)._

### Fecho do dia

- **Feito:** Análise de projecto (testes vs beta; GPS vs simulação; o que prova cada camada) — alinhado em sessão. Melhores práticas free/paid (ROI, TODO do dia, híbrido implementação vs docs) — conversa em sessão. Mini-audit de código em `trips.py` (aceitar / completar / idempotência pagamento). **Modos de conversa** — checklist 1–5; ponto **1** (sinais, contexto sequencial vs. tópico novo, TODO/PROXIMA como verdade) acordado e escrito.
- **Não feito / bloqueios:** \_
- **Aprendizados (uma frase):** \_

### Rasto para amanhã

- **Próximo da lista (prioridades):** `[DOCS]` **Limpeza raiz → `docs/`** — só quando **esse** for o objectivo do dia (evita PR gigante misturado com feature); preparar lista curta de ficheiros a mover + actualizar links em `README` / índice de docs.

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
