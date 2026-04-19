# TODO do dia — TVDE

Ficheiro **vivo**: **criar ou actualizar na noite anterior** (5–10 min). Na raiz do repo, junto do [`README.md`](README.md), para abrir logo de manhã.

**Dia vs sessão** — «Dia» no título alinha ao **dia civil** (um ficheiro por data). **Sessão** é cada bloco de trabalho com o assistente: **várias sessões no mesmo dia**, ou uma sessão longa; o **fecho** e o **ritual** aplicam-se ao fim de uma **sessão que entrega** (código/docs) ou ao fim do dia, conforme o hábito.

---

## Abertura 2026-04-09 — consulta obrigatória

- **Ler primeiro:** [`docs/meta/CONSULTA_OBRIGATORIA_SESSAO_2026-04-09.md`](docs/meta/CONSULTA_OBRIGATORIA_SESSAO_2026-04-09.md) — circuito de implementação, compliance incremental, integrações tipo «import», aceleração (bulk visual + Playwright + telemóvel).

---

## Alinhamento 2026-04-08 — visibilidade, roles, cruzeiro (Frank)

- **Merge `main`:** **#139** — **«Alinhar pagamento (Stripe)»** também no detalhe expandido das listas **Activas** e **Histórico** (Viagens), mesma elegibilidade que o painel órfão (`super_admin`). Pull local: `git pull --ff-only origin main`.
- **Telemóvel = barreira:** o que não couber / não for utilizável **no telemóvel** **não conta** como entregue para validação; viewport móvel no desktop é **apoio**, não substituto do device.
- **Roles:** **admin** — operações correntes **sem** “grande decisão” de sistema (ex.: aceitar utilizador, password a pedido, leituras operacionais). **super_admin** — **omnisciente** / o que o admin **não** resolve (reconcile, stuck profundo, overrides perigosos).
- **Velocidade:** **bulk com juízo** quando vários gaps partilham o mesmo ecrã ou padrão; **Playwright cedo**; smoke **manual** só quando a tua presença for inevitável.
- **Backlog canónico (preencher à medida):** [`docs/meta/UI_VISIBILITY_IMPLEMENTATION_TODO.md`](docs/meta/UI_VISIBILITY_IMPLEMENTATION_TODO.md).
- **Naming** dos `.md` do repo: **não** mexer agora; correcção de nomes fica para outra altura.

### Prioridades cruzeiro (stack com 2026-04-19)

1. [ ] [CÓDIGO+TESTES] **Inventário → implementação** a partir do doc de visibilidade; **Admin** primeiro; cada fio com **Playwright** quando estável.
2. [ ] [OPS] Manter **BD PROD + smoke #132** quando fores a essa abertura — ver bloco **«Hoje / próxima abertura — 2026-04-19»** abaixo (não compete com o inventário UI).
3. [ ] [MOBILE] Passar **smoke essencial** no **telemóvel** após cada PR relevante.

---

## Fecho sessão 2026-04-18 (noite)

- **Merge na `main`:** **#132** (`3458d0b`) — `POST /admin/trips/{trip_id}/reconcile-payment-stripe` + botão **«Alinhar pagamento (Stripe)»** na vista Viagens (`super_admin`): viagem **cancelled/failed** + `payment.processing` alinha ao PI **sem** forçar a viagem para `failed`; `completed` + PI terminal falho mantém regra do lote (trip → failed).
- **Pull local:** `git pull --ff-only origin main` OK (working tree limpa).
- **PROD / BD:** sessão DB **pausa até amanhã** (descanso olhos); **continua** na mesma linha: ~38× `pi_mock` + eventual `SELECT`/`UPDATE` guiado; smoke do botão novo + **Actualizar saúde** quando houver energia.
- **Merge `main` (noite):** **#131** — reconciliação **acima** da lista stuck em Operações; **#135** — tabs `flex-wrap` + `tablist`, paginação **10/pág.** na lista «Pagamentos em processing» (`c70d357`).
- **Docs:** **#136** — `TODOdoDIA` alinhado com os merges acima (`1791071`).
- **Fecho assistente (fim sessão):** sessão encerrada; **amanhã** retomar o bloco abaixo («Hoje 2026-04-19») — prioridades **1–2** (BD + smoke) + rasto se der tempo; no arranque: `git pull --ff-only origin main` (esperado `1791071` ou posterior).

---

## Hoje / próxima abertura — 2026-04-19

_Âncora: **remate BD PROD** (1–2 comandos por passo) + **smoke** pós-#132._

**Código admin (geladeira):** fechado na `main` (#131 + #135); não reabrir neste fio salvo regressão.

### Prioridades (máx. 3)

1. [ ] [OPS] **BD — `pi_mock` + completed + processing** — `SELECT` contagem → `UPDATE` só com `WHERE` explícito (ex. `stripe_payment_intent_id LIKE 'pi_mock_%'`); **não** misturar com `pi_3…` no mesmo bloco sem rever Stripe.
2. [ ] [OPS] **Smoke pós-deploy #132** — Viagem **2853939b-1e99-4dfe-9f69-71ca62b29936** (cancelada): **Alinhar pagamento (Stripe)** → **Actualizar saúde** (stuck vs inconsistent).
3. [x] [CÓDIGO] **Admin UI (geladeira)** — tabs + paginação stuck em Operações (**feito**; **#131** + **#135** na `main`, `c70d357`).

### Rasto (se sobrar tempo)

- Revisitar **80 stuck** vs **38 inconsistent** (origens diferentes na `system_health`); amostrar mais 1–2 `trip_id` se ainda houver ruído.

---

## Próxima sessão — geladeira (fora do código activo de hoje)

Coisas **adiadas**, **«não é hoje»** ou **ADIA**; voltam quando abrires um bloco dedicado (não roubam foco à Onda T1).

| Área                  | Notas                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **T4 — Tickets**      | Sistema de mensagens / pedidos de suporte.                                                                               |
| **Parceiro**          | Checklist legal, papelada humana; fora do fluxo operacional diário.                                                      |
| **M2**                | Perfil «produto»: email, morada, preferências, …                                                                         |
| **M3**                | Documentos motorista + políticas de audit.                                                                               |
| **W3**                | Staging (segundo ambiente API+DB+frontend).                                                                              |
| **SP-B opcional**     | UI rica do audit trail / export CSV.                                                                                     |
| **Pós-super-prompts** | Legal na app, theming PT, vídeos — [`docs/super-prompts/README.md`](docs/super-prompts/README.md) «Depois da sequência». |
| **Admin — tabs**      | **Feito 2026-04-18 noite:** `flex-wrap` + `role="tablist"` — sem `overflow-x-auto`; quebra em **2–3 linhas** em ecrã estreito. |
| **Admin — Operações** | Reconciliação **acima** da lista longa (#131). **Feito 2026-04-18 noite:** lista «Pagamentos em processing» com **paginação 10/página** (Anterior/Seguinte) quando há mais de 10 linhas. |
| **Não fazer ainda**   | Stripe Connect, `ENABLE_CONFIRM_ON_ACCEPT`, push, M4 — ver [`PROXIMA_SESSAO.md`](docs/meta/PROXIMA_SESSAO.md) Secção D.  |

---

## Hoje 2026-04-09

_Âncora: **Onda T1** — purge SQL **guiado** em `ride_db` (Docker local `ride_postgres`), 1–2 comandos por passo com pausa; **não** é sessão para PROD/Render._

### Prioridades (máx. 3)

1. [ ] [OPS] **Onda T1 — inventário + purge** — `psql` em `ride_db`: mapear `users` / `trips`; `DELETE` só com critério acordado; manter contas staff que precisares.
2. [ ] [OPS] **Smoke curto** — Admin **Utilizadores** (lista manejável) + login BETA se alteraste contas.
3. [ ] [OPS] **Smoke W2-E** — quando houver redeploy; guião [`W2_RUNBOOK.md`](docs/ops/W2_RUNBOOK.md).

### Rasto (após T1 estável)

- Seed documentado **10 passageiros + 5 motoristas + staff** (`_test`), mesma ideia em **local e staging** quando aplicares o mesmo desenho.
- **Onda T2** — pytest / E2E sem inflacionar `users`.

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

## Hoje 2026-04-08

_Âncora: **SP-F v2** (#117) + **Desbloquear** (#118) na **`main`**; smoke Render utilizadores **OK** (2026-04-17)._

### Prioridades (máx. 3)

1. [x] [OPS] **PR SP-F v2** — Merge na `main`.
2. [x] [OPS] **Smoke** — Bloquear / desbloquear + motivos SP-F em PROD (capturas validadas).
3. [x] [CÓDIGO] **M1 (micro)** — Dica no login BETA → **#119** em `main`.

### Fecho do dia

- **Feito:** #117 + #118 + #119 em `main`; smoke utilizadores OK.
- **Aprendizados:** `AdminGovernanceReasonBody` antes das rotas no `admin.py`.

### Rasto para a próxima sessão

- **M1** restante — «Hoje 2026-04-17» (password + perfil no ecrã); smoke **super_admin** alargado se útil.
- **Pós-SP (nexo)** — legal na app + theming PT/ícone + vídeos/checklist: ver [`docs/super-prompts/README.md`](docs/super-prompts/README.md) secção **«Depois da sequência»** (não entra no «Hoje» até M1 estabilizar).

---

## Hoje 2026-04-18

_Âncora: **super-prompts** (sequência **B → A** fechada em `main` + testado em PROD); seguir **SP-G** antes de reabrir peso das **Ondas M1** salvo decisão no arranque. Ver [`docs/super-prompts/README.md`](docs/super-prompts/README.md)._

### Prioridades (máx. 3)

1. [x] [CÓDIGO] **SP-G — Estado agora (30 s)** — Tab **Agora** no admin (URL sem `tab` → Agora): saúde + contagens + atalhos Viagens/Saúde/Operações/Métricas; spec em [`docs/super-prompts/SP-G-estado-agora.md`](docs/super-prompts/SP-G-estado-agora.md).
2. [x] [CÓDIGO] **SP-D — Anti-stuck (Saúde)** — Guias «O que é · 3 passos» por classe de anomalia; banner + atalho Operações; ponto na tab Saúde; lembrete na tab Agora; [`docs/super-prompts/SP-D-anti-stuck.md`](docs/super-prompts/SP-D-anti-stuck.md).
3. [x] [OPS] **pytest admin** — `tests/test_admin_audit_trail.py` + `tests/test_admin_sp_a.py` no venv (7 testes OK em 2026-04-17).

### Fecho do dia

- **Feito (herança — encerramento sessão noite):** merges na `main` (SP-B auditoria + SP-A API, botões **→ arriving** / **→ ongoing** no admin, doc SP-A API vs UI); smoke humano **OK**; tweaks a listar na próxima abertura.
- **Feito (2026-04-17 manhã):** merge **SP-C** partner na `main`; arranque **SP-E** (payloads `before`/`after` + trilho na tab Utilizadores; ver PR quando existir).
- **Não feito / bloqueios:**
- **Aprendizados:**

### Rasto para a próxima sessão

- **SP-F** (evolução da matriz + mais motivos) após merge do v1; **tweaks** pós-merge quando listares.
- **Ondas M1** — retoma quando SP-G (e tweaks imediatos) estiverem claros; tabela em [`PROXIMA_SESSAO.md`](docs/meta/PROXIMA_SESSAO.md) Secção D.
- **SP-B opcional** — UI rica do audit trail / export CSV (não bloqueia SP-G).
- **Parceiro / W3 / Connect / push / `ENABLE_CONFIRM_ON_ACCEPT`** — **fora** até decisão explícita (ver **Não fazer ainda** em `PROXIMA`).

---

## Hoje 2026-04-17

_Âncora: **Ondas M** (conta / password / admin), alinhado a [`docs/meta/PROXIMA_SESSAO.md`](docs/meta/PROXIMA_SESSAO.md) Secção D. **Ecrã-first:** cada prioridade fecha com algo **visível** na web-app ou no admin._

### Prioridades (máx. 3)

1. [x] [PENSAR + CÓDIGO] **M1 — Password + perfil mínimo** — Na `main`: `GET/PATCH /auth/me` + **Conta (BETA)** (#121); canal «esqueci-me» = **admin** (repor password só com `super_admin`, dentro de **Editar** na UI desta sessão).
2. [x] [CÓDIGO] **M1 — Admin cauteloso** — Secções nome / telefone / password (password só ao abrir **Editar** + só `super_admin`); `formatAdminApiDetail` para erros legíveis; **PR #123**.
3. [ ] [OPS] **Smoke pós-deploy (W2-E)** — Frank: após redeploy, guião W2-E (Saúde → Viagens órfã, `.env` mascarado, bloqueio / bulk).

### Fecho do dia

- **Feito:** M1 admin cauteloso na web-app (**PR #123**); BD Docker: um só `super_admin` (OPS).
- **Não feito / bloqueios:** Smoke W2-E (prioridade 3) — manual quando houver redeploy / energia.
- **Aprendizados:** `super_admin` no JWT via `parseJwtPayload` para mostrar secção «Repor palavra-passe» no admin.

### Rasto para a próxima sessão

- **Onda T1** — ver bloco **«Hoje 2026-04-09»** no topo deste ficheiro (purge guiado `ride_db`).
- [x] **Onda T0** — #124 + #125 na `main` (selecção no refresh; limpeza ao sair da tab Utilizadores).
- **Geladeira** — tabela **«Próxima sessão — geladeira»** no topo deste ficheiro (tickets, parceiro, M2/M3/W3, SP-B, pós-SP, «não fazer ainda»).

---

## Hoje 2026-04-16

_Nova sessão — `main` com **W2** A–D conforme merges; smoke manual no fim da sessão._

### Prioridades (ordem sugerida)

1. [x] [OPS] **Pós-merge + smoke** — `main` = `origin/main`; smoke no **GitHub**: [`README.md`](README.md) → [`docs/meta/DOCS_INDEX.md`](docs/meta/DOCS_INDEX.md) → [`docs/diagrams/README.md`](docs/diagrams/README.md) → [`docs/legal/PARCEIRO_TVDE_CHECKLIST.md`](docs/legal/PARCEIRO_TVDE_CHECKLIST.md).
2. [x] [DOCS] **Diagramas — expansão** — [`04_REALTIME.md`](docs/diagrams/04_REALTIME.md): sequences passageiro (polling), motorista (polling + WS ofertas), admin WS; [`03_PAYMENTS.md`](docs/diagrams/03_PAYMENTS.md): tabela `event_type` Stripe; novo [`07_AUTH_OTP.md`](docs/diagrams/07_AUTH_OTP.md); índice em [`docs/diagrams/README.md`](docs/diagrams/README.md).
3. [x] [CÓDIGO] **W2-B — Deep links Admin** — `?tab=` / `tripId=` na web-app; ver [`W2_RUNBOOK.md`](docs/ops/W2_RUNBOOK.md) cabeçalho e [`W2_RUNBOOK_UI_DESIGN.md`](docs/ops/W2_RUNBOOK_UI_DESIGN.md) §4.

### Fecho — merge PR #98 (W2-E) + handoff

- **Feito (código na `main`):** PR **#98** — painel **Viagens** para `tripId` em URL **fora** da lista activa; **Saúde** com «Mais recentes» / «Ordem API» + «Mostrar mais»; **Utilizadores** com paginação + **Bloquear** / **bulk** (`BLOQUEAR_<n>`); **Operações** — validar `.env` **mascarado** até revelar; Stripe — sem links de dashboard para mock / `pi_test_123`.
- **Tua vez:** redeploy + smoke admin quando fizer sentido ([`W2_RUNBOOK.md`](docs/ops/W2_RUNBOOK.md)).
- **Continuidade:** **Ondas M** + **«Hoje 2026-04-17»** acima; pormenor em [`PROXIMA_SESSAO.md`](docs/meta/PROXIMA_SESSAO.md) Secção D.

### Parceiro / legal — **fora do TODO_right_now** (**ADIA**)

_Não conta para as 3 linhas de «Hoje» até haver informação reunida (retornos externos)._ **ADIA** — sem tarefas neste fio até decidires retomar. Quando avançar: [`docs/legal/PARCEIRO_TVDE_CHECKLIST.md`](docs/legal/PARCEIRO_TVDE_CHECKLIST.md) §2–§9. **Não bloqueia** W2 nem deploy.

### W2-A — Runbook v0 (**fechado** em docs)

- [x] [DOCS] **[`docs/ops/W2_RUNBOOK.md`](docs/ops/W2_RUNBOOK.md)** — Passos literais **Admin-only** (readiness, viagens, saúde, timeouts, pagamento+Stripe, motorista, métricas, fecho).

### W2-B — Deep links (**fechado** em código + docs)

- [x] [CÓDIGO] Query `tab` + `tripId` em **`/admin`**; preservação da query no login admin e no redirect raiz → admin.

### W2-C — Saúde → Viagens (**fechado** em código)

- [x] [CÓDIGO] Na tab **Saúde**, cada linha de anomalia com viagem identificável tem **«Abrir em Viagens»** (deep link W2-B); listas `missing_payment_records` e `inconsistent_financial_state` também na UI.

### W2-D — Picker + pagamentos Operações (**fechado** em código + API)

- [x] [CÓDIGO] **Operações:** lista **Recuperar** a partir de `drivers_unavailable_too_long` (saúde); UUID manual em `<details>`.
- [x] [CÓDIGO] **Operações:** card **Pagamentos em processing** com **Abrir em Viagens** + links Stripe (live/test) quando há `pi_…`.
- [x] [CÓDIGO] API `system_health` — `stuck_payments` inclui `stripe_payment_intent_id`.

### W2-E — Admin visual (Saúde → Viagens, utilizadores, .env) (**fechado** nesta sessão)

- [x] [CÓDIGO] Tab **Viagens**: painel destacado quando `tripId` está na URL mas a viagem **não** está na lista de activas — detalhe, Debug, links Stripe (só PI reais), Atribuir/Cancelar conforme estado.
- [x] [CÓDIGO] Tab **Saúde**: blocos de anomalias com **«Mais recentes» / «Ordem API»** e **«Mostrar mais»** (paginação visual).
- [x] [CÓDIGO] Tab **Utilizadores**: `limit`/`offset` na API já usados; **Carregar mais**; filtro + ordenação; **Bloquear** (conta) + **Bloquear seleccionados** com confirmação `BLOQUEAR_<n>` (soft, reversível); API `POST /admin/users/{id}/block` e `POST /admin/users/bulk-block`.
- [x] [CÓDIGO] **Operações — Validar .env:** textarea em modo **mascarado** por defeito + botão **Mostrar para editar** (valores sensíveis ocultos no ecrã).
- [x] [CÓDIGO] `stripeDashboard`: não gerar links para `pi_test_123` / IDs com `mock`.

### W1 — smoke PROD (**fechado**)

Guião: [`docs/ops/W1_PROD_SMOKE.md`](docs/ops/W1_PROD_SMOKE.md) · Playbook: [`docs/prompts/A033_B_VALIDATION_HARDENING_PLAYBOOK.md`](docs/prompts/A033_B_VALIDATION_HARDENING_PLAYBOOK.md).

- [x] [OPS] **W1a — Cron** — Pedido manual à API PROD → **200** + JSON (`timeouts` / `offers` / `cleanup`); agendador externo (cron-job.org) com GET periódico → **200** consistente.
- [x] [OPS] **W1b — Webhook Stripe** — Dashboard: entrega **200** para `payment_intent.succeeded` em `/webhooks/stripe`, resposta `{"status":"ok"}`; assinatura com `STRIPE_WEBHOOK_SECRET`; coerência BD (evidência no Stripe + logs API). _Não documentar URLs com `secret=` nem segredos no Git._

**Nota:** `system_health` pode continuar a sinalizar `stuck_payments` / estado financeiro legado — **fora do critério W1**; tratar em sessão de limpeza ou W2/W4.

**Próximo roteiro:** **W3** — staging (segundo ambiente API+DB+frontend, Stripe test) — ver [`TODOdoDIA.md`](TODOdoDIA.md) roteiro acelerado e [`docs/meta/PROXIMA_SESSAO.md`](docs/meta/PROXIMA_SESSAO.md).

### Fecho de sessão (W2-B + TODO)

- **Feito:** Deep links Admin (`/admin?tab=…`, `tripId=`); testes unitários do parser; runbook + desenho actualizados; parceiro **retirado** das 3 prioridades «agora» (bloco _fora do TODO_right_now_). PR desta sessão (merge na `main` quando verdes).
- **Não feito / bloqueios:** —
- **Smoke teu (fora de sessão, quando puderes):** com sessão admin em PROD ou staging, colar `…/admin?tab=health` e `…/admin?tab=trips&tripId=<uuid_de_viagem_activa>`; confirmar tab e Detalhe; login a partir do link directo com query preservada.

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

**W1 smoke PROD (registado após execução humana)** — Env críticos confirmados no Render; cron manual e agendador externo com **200** + JSON; webhook Stripe (`payment_intent.succeeded`) **entregue** com **200** e `status: ok`. Evidências mantidas fora do Git (Stripe + Render). _ChatGPT / resumo externo: OK como rascunho; canónico continua a ser este ficheiro + `W1_PROD_SMOKE.md`._

**2026-04-15 (fecho de sessão)**

- **Feito:** Smoke **GitHub** no percurso combinado (README → DOCS_INDEX → PROXIMA F → stubs/cross-links → refs); **Render** com **4 painéis** e hábito **redeploy manual** do último commit antes de ausências (dupla disciplina: ambiente = Git + teste contínuo). **Docs:** [`docs/legal/PARCEIRO_TVDE_CHECKLIST.md`](docs/legal/PARCEIRO_TVDE_CHECKLIST.md) + pasta [`docs/diagrams/`](docs/diagrams/) (Mermaid) + entradas em `DOCS_INDEX` / `docs/README`. **Git:** PR **#88** (`feat/docs-diagrams-mermaid` — diagramas + TODO 2026-04-16 + `PROXIMA`); PR **#87** checklist legal em paralelo se ainda aberto.
- **Não feito / bloqueios:** —
- **Aprendizados:** Links `.md` resolvem no **GitHub** ou no **IDE**; abrir em **host aleatório** → 404 (normal).

**2026-04-13 (arquivo)**

- **Feito:** Análise de projecto; melhores práticas free/paid; mini-audit `trips.py`; **modos de conversa** (checklist 1–5); **docs** — canónicos para `docs/meta|deploy|testing|ops`; smokes de links ok; PR #86 depois mergeado.

### Rasto para a próxima sessão

- **Âncora dura:** **Ondas M** (M1 → M2 → M3) — conta, password simples, correcções admin **ecrã-first**; ver [`PROXIMA_SESSAO.md`](docs/meta/PROXIMA_SESSAO.md) Secção D (tabela M1–M4).
- **Âncora paralela (não diluir M1):** **W3** — staging (A027) — roteiro acelerado; só se no arranque acordares **explícita** intenção de avançar W3 na mesma sessão que M1.
- **Fechado:** **W2** A–E na `main` (incl. PR **#98**); **W1** fechado. [`W2_RUNBOOK.md`](docs/ops/W2_RUNBOOK.md).
- **Parceiro** **ADIA** (fora do «agora»).
- **Handoff longo:** [`docs/meta/PROXIMA_SESSAO.md`](docs/meta/PROXIMA_SESSAO.md) Secção D + E.
- **Hábito (manter):** 4 vistas Render + **BD única** + **manual deploy** último commit quando quiseres paridade máxima com `main`.
- **Side project** — n8n/Telegram/etc. **fora** deste TODO TVDE até decisão explícita.
- **Ideias (só conversa)** — alertas operacionais → admin app; pricing no accept — sem implementação até decisão em `PROXIMA`.

---

## Roteiro acelerado (comercialização / teste real)

Objectivo: sequência **curta** de ondas (meia sessão a ~2 sessões cada), priorizando o que desbloqueia **piloto com pessoas reais** e **dinheiro com controlo**, sem misturar com side project. Detalhe técnico: [`docs/TODO_CODIGO_TVDE.md`](docs/TODO_CODIGO_TVDE.md), [`docs/visao_cursor.md`](docs/visao_cursor.md) §4, [`docs/meta/PROXIMA_SESSAO.md`](docs/meta/PROXIMA_SESSAO.md) Sec. D/F.

| Onda   | Foco                                | Entregável verificável                                                                                                                                                                                                                                                                                        |
| ------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **W1** | **Operação PROD confiável**         | Cron externo a bater `GET /cron/jobs` com segredo correcto; efeitos de timeouts verificáveis; webhook Stripe em ambiente escolhido com assinatura + idempotência **validados** (checklist em [`docs/prompts/A033_B_VALIDATION_HARDENING_PLAYBOOK.md`](docs/prompts/A033_B_VALIDATION_HARDENING_PLAYBOOK.md)). |
| **W2** | **Runbook humano**                  | Um `.md` curto em `docs/ops/` (1–2 páginas): pagamento preso / disputa, viagem presa em estado intermédio, «quem faz o quê» em 24h — liga a `system-health` e logs que já tens.                                                                                                                               |
| **W3** | **Staging (A027)**                  | Segundo ambiente (API+DB+frontend) com Stripe **test** + webhook test; smoke repetível antes de tocar em live.                                                                                                                                                                                                |
| **W4** | **Dados (A028)**                    | Backup PG automático + **um** exercício de restore documentado (mesmo que manual na primeira vez).                                                                                                                                                                                                            |
| **W5** | **Piloto numerado**                 | Lista fechada de beta testers; critérios de saída («o que fica para V2»); export partner + admin para reconciliação; **Stripe live** só após checklist financeiro e acordo teu ([`docs/testing/TESTE_STRIPE_COMPLETO.md`](docs/testing/TESTE_STRIPE_COMPLETO.md)).                                            |
| **W6** | **Pacote confiança mínimo**         | Paralelo **humano**: preencher [`docs/legal/PARCEIRO_TVDE_CHECKLIST.md`](docs/legal/PARCEIRO_TVDE_CHECKLIST.md); termos/privacidade **redigidos por advogado** (o repo não substitui isso — ver `visao_cursor` §4.2).                                                                                         |
| **W7** | **Pós-piloto (não bloquear W1–W6)** | Alerting (uptime / erros); mais Mermaid se faltar fluxo; `ENABLE_CONFIRM_ON_ACCEPT` **só** após decisão explícita em `PROXIMA`; PWA/push conforme `visao_cursor` §4.1 — **não** antecipar antes de W5 estável.                                                                                                |

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
