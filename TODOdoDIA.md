# TODO do dia — TVDE

Ficheiro **vivo**: **criar ou actualizar na noite anterior** (5–10 min). Na raiz do repo, junto do [`README.md`](README.md), para abrir logo de manhã.

**Dia vs sessão** — «Dia» no título alinha ao **dia civil** (um ficheiro por data). **Sessão** é cada bloco de trabalho com o assistente: **várias sessões no mesmo dia**, ou uma sessão longa; o **fecho** e o **ritual** aplicam-se ao fim de uma **sessão que entrega** (código/docs) ou ao fim do dia, conforme o hábito.

**Fecho de etapas:** mal uma entrega estiver em `main` (ou um smoke/checklist estiver feito), **actualizar estes painéis sem pedir confirmação** — a lista deve reflectir a verdade operacional e evitar retrabalho.

**PR só com documentação:** preferir **não** abrir micro-PRs só de texto; juntar ao próximo PR com **código** quando `main` estiver protegida, salvo ser **essencial** (revisão obrigatória, política explícita no dia).

### Formato dos painéis (desde **2026-05-14**)

A partir desta data, cada **painel novo** apresenta o trabalho operacional em **tabelas** com colunas canónicas:

`| ID | Item | Estado | Notas |`

**Vocabulário de Estado (fixo — usar só estes valores):**

| Estado | Significado |
|--------|-------------|
| **Por iniciar** | Ainda não há trabalho ou arranque. |
| **Em curso** | Em andamento. |
| **Smoke pendente** | Código em `main` / entrega pronta — falta validação humana ou staging/prod. |
| **Concluído** | Fechado (inclui doc/checklist actualizado, se aplicável). |
| **Bloqueado** | Espera externa ou dependência; explicar **por quê** em Notas. |
| **N/A** | Reservado / não aplicável. |

**Prefixos de ID:** **A-…** — auditoria / gates (ex. `A2-02-1`, `A3-R`); **X-…** — lista EXTRA produto; **TW-…** — tweaks UX motorista (densidade, copy, cores; sem mudar fluxo); **G-…** — pontos screenshot **G01–G27** ([`screenshot-tweaks-g-matrix.md`](docs/ux/screenshot-tweaks-g-matrix.md), fase VAM por cluster); **R-…** — rasto / backlog técnico não bloqueante; **O-…** — opcional / operacional; **S-…** — smokes **produção** (PC + Render, sem staging); **F-…** — fixes / issues de código após smokes ou decisão de produto.

Painéis com data **2026-05-13** ou anteriores mantêm o formato em que foram escritos (histórico).

---

## Painel — 2026-05-19 (**USER_SHELL** — grelha **G01–G27**, Cluster A fechado)

**Marco:** premissas User shell + módulos UI; VAM por cluster com Frank. **Cluster A (cabeçalho)** fechado — build + PR na sessão de código seguinte.

**Grelha completa:** [`docs/ux/screenshot-tweaks-g-matrix.md`](docs/ux/screenshot-tweaks-g-matrix.md).

### VAM Cluster A — decisões (fechado)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **G03** | Header passageiro: sem Perfil/Definições no topo | Concluído (VAM) | **ACERTAR** — igual motorista FIX-002; Menu → Perfil |
| **G04** | Header passageiro: compacto; **sem** texto «PASSAGEIRO» | Concluído (VAM) | **ACERTAR** + **MUDAR** copy; wordmark + data/hora |
| **G-SHELL-1** | Menu inferior 4 ícones (M/P) | Concluído (VAM) | Manter métrica actual |
| **G-SHELL-2** | Faixa de dicas rotativas | Concluído (VAM) | Manter estilo; copy por role |

### Implementação (**USER-SHELL-A**)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **USER-SHELL-A** | `userCompact` em `/passenger` | Concluído | Merge **#321**; smoke OK |
| **USER-SHELL-B** | InfoPanel + HintLine (Cluster B) | Concluído | Merge **#322** |
| **USER-SHELL-C** | ActionPanel + slide 50% + BottomActionStack | Smoke pendente | PR **feat/user-shell-cluster-c** |
| **G-CLUSTER-B** | VAM Cluster B (InfoPanel) | Concluído (VAM) | G05, G07, G09, G11, G15, G16, G20, G23 |
| **G-CLUSTER-C** | VAM Cluster C (ActionPanel) | Concluído (VAM) | G08 slide+Fechar; G13, G17, G18 stack |
| **G-CLUSTER-D** | VAM Cluster D (MapStage) | Por iniciar | G10, G14, G21, G22, G25 |
| **G-CLUSTER-E** | VAM Cluster E (TripSummary) | Por iniciar | G24, G26, G27 |
| **G-CLUSTER-F** | VAM Cluster F (específicos) | Por iniciar | G01, G02, G06, G12, G19 |

_TW-01…06 permanecem no painel **2026-05-15**; mapeiam para clusters B–E (ver grelha G)._

---

## Painel — 2026-05-15 (marco motorista **FIX-007/008** + **TWEAKS_UX**)

**Marco:** fluxo **driver↔passageiro** funcional a 100% em UX (mapa cheio, marcador → painel aceitar, barra 4 ícones em viagem). Merge **`#319`** em `main`. Smoke manual **2026-05-15**: quase perfeito; tweaks visuais na fila **TW-**.

**Não repetir:** re-smoke grelha **S-** nem inventário **A–D** sem delta de deploy.

### Entrega fechada (motorista)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **E-MARCO-1** | Tabelas A–E inventário + FIX-001…008 | Concluído | [`driver-home-inventory.md`](docs/ux/driver-home-inventory.md); PR **#319** |
| **E-MARCO-2** | Smoke manual viagem (telemóvel / local) | Concluído | Frank **2026-05-15**; screenshots para **TW-05** na próxima sessão |
| **E-MARCO-3** | E2E `driver-passenger-flow` | Concluído | 4/4 após FIX-008 (marcador + Continuar) |

### **TWEAKS_UX** (**TW-**)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **TW-01** | Painel aceitar: **SlideToAccept** / CTA — menos altura/largura (gesto OK, ocupa demais) | Por iniciar | [`SlideToAccept.tsx`](web-app/src/components/cards/SlideToAccept.tsx); painel [`DriverDashboard.tsx`](web-app/src/features/driver/DriverDashboard.tsx) |
| **TW-02** | Copy e hierarquia «Pedido no mapa» (título, Fechar, hints) | Por iniciar | D-E-01–07 refinamento |
| **TW-03** | Resumo compacto em viagem (altura, tipo, contraste) | Por iniciar | `ActiveTripSummary` `compact` |
| **TW-04** | Espaçamento acções viagem + barra 4 ícones | Por iniciar | `bottomChrome` FIX-007 |
| **TW-05** | Revisão geral pós-screenshots (~10 prints) | Por iniciar | Frank analisa offline; próxima sessão |
| **TW-06** | Ícone «lista» multi-ofertas sob mapa | N/A | Secundário; inventário Tabela E |

### Operacional / fases seguintes (**O-**)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **O-UX20-1** | Sessão desenho **UX 2.0** (motorista primeiro) | Por iniciar | Stub [`DRIVER_UX_2_0.md`](docs/product/DRIVER_UX_2_0.md); **depois** de TW- prioritários |
| **O-NAV-PP-1** | Barra 4 ícones **passageiro** e **parceiro** (mesma regra que motorista) | Por iniciar | [`driver-ux-fixes-backlog.md`](docs/ux/driver-ux-fixes-backlog.md) TODO |

_Quadro operacional:_ [`docs/todo-em-curso.md`](docs/todo-em-curso.md).

---

## Painel — 2026-05-14 (staging **A2-02** + smokes + EXTRA produto — formato tabela)

**Foco A+L / OPS:** mesmo rumo que o painel **2026-05-13**: fechar **staging** no Render — `GOOGLE_OAUTH_*` em **`tvde-staging-api`**, URIs **Google** (`https://tvde-staging-app.onrender.com` + callback), utilizadores de teste; **smokes assertivos** staging. Actualizar checklist §A3 em [`docs/audit/AUDIT_EXEC_BACKLOG_AL_2026-05.md`](docs/audit/AUDIT_EXEC_BACKLOG_AL_2026-05.md) quando o gate ficar verde.

**URLs staging (fixos):** app `https://tvde-staging-app.onrender.com` · API `https://tvde-staging-api.onrender.com`

### Auditoria / gates (**A-**)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **A2-02-1** | `GOOGLE_OAUTH_*` na API **staging** + URIs Google alinhadas | Em curso | Ver [`docs/todo-em-curso.md`](docs/todo-em-curso.md); host fixo acima |
| **A2-02-2** | Smokes assertivos **staging** (e prod se couber) | Por iniciar | Depende de A2-02-1 onde aplicável |
| **A2-02-3** | Checklist §A2-03 / §A3 no audit exec backlog | Concluído | Tabela §A2-03 e notas §A3 actualizadas nesta PR; **gate** OAuth+smokes staging = A2-02-1 / A2-02-2 (humanos). |

### Lista **EXTRA** produto (**X-**)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **X-1** | Som (~2 s) quando uma viagem «cai» no motorista | Concluído | [`useDriverOfferSounds`](web-app/src/hooks/useDriverOfferSounds.ts) + [`driverSessionSounds.ts`](web-app/src/services/driverSessionSounds.ts) + `public/sounds/offer.wav` em [`DriverDashboard`](web-app/src/features/driver/DriverDashboard.tsx) |
| **X-2** | Modo nocturno automático no ecrã | Concluído | [`ThemeSelector`](web-app/src/design-system/components/app/ThemeSelector.tsx) **Automático (sistema)** + [`useTheme.ts`](web-app/src/hooks/useTheme.ts) (`auto` + `prefers-color-scheme`) |
| **X-3** | Wake lock / ecrã sempre activo em uso | Concluído | [`useScreenWakeLock`](web-app/src/hooks/useScreenWakeLock.ts) com condição **disponível ou viagem** (`!offline \|\| activeTripId`) em [`DriverDashboard`](web-app/src/features/driver/DriverDashboard.tsx) |
| **X-4** | Reservado (lista original) | N/A | Marcado feito pelo autor no painel 2026-05-13 |
| **X-5** | Partner: documentos de veículos e motoristas | Concluído | [`PartnerDriverDetail`](web-app/src/features/partner/PartnerDriverDetail.tsx): bloco **Viatura** (`inspecao_viatura`) + motorista |
| **X-6** | Driver → partner: documentos, caducidade, centralização | Concluído | Parceiro edita **validade** + **nota** + estado; API existente `PATCH …/documents` |
| **X-7** | QR partilhável: **visível na app** (menu passageiro → botão → imagem) | Concluído | Menu [`PassengerSideMenu`](web-app/src/features/passenger/PassengerSideMenu.tsx): «Partilhar app (QR)» + `react-qr-code`; `/download` continua URL auxiliar |
| **X-8** | Driver: deslizar para aceitar oferta | Concluído | **F-1** entregue em código: folha inferior com `max-h` por número de ofertas; REJEITAR compacto slide; `main` sem scroll em `/driver`; gradiente no palco do mapa |
| **X-9** | Driver: repensar ecrã principal (simplicidade) | Concluído | **B5** + mapa-fundo/interacção no mapa ([`DECISOES`](docs/prompts/EXTRA-2026-05-13-DECISOES.md)); copy horas sem `[PLACEHOLDER]` longo; botão **Vista compacta** |

### Rasto / backlog (**R-**)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **R-1** | Rotacional v3 (fontes externas + job/cache) | Concluído | `ROTACIONAL_V3_FETCH_URL` + tabela `rotacional_external_cache` + job em [`cron.py`](backend/app/api/routers/cron.py); merge em [`rotacional.py`](backend/app/api/routers/rotacional.py); [`ROTACIONAL_V2_SPEC.md`](docs/product/ROTACIONAL_V2_SPEC.md) |

### Smokes **produção** (**S-**) — PC + Render **tvde-app**, várias janelas, **sem staging**

**Onde correr:** produção — app estática Render (referência [`GUIA_TESTES.md`](docs/testing/GUIA_TESTES.md): `https://tvde-app-j51f.onrender.com`). Confirmar **sempre** o host na barra de endereço.

**Regra de evidência:** sem print legível, a etapa **não** conta como fechada.

**Janelas sugeridas:** esquerda **passageiro** · centro **motorista** · direita **partner (Frota)** · quarta **admin (staff)** só se fores fechar backoffice.

**Legenda de prints (coluna Notas):** **A** — URL completa visível · **B** — `AppHeaderBar`: pastilha MOTORISTA/PASSAGEIRO/FROTA/STAFF + linha Conta · **C** — rodapé versão + SHA · **D** — pedido passageiro (origem/destino ou equivalente + estado) · **E** — motorista disponível / ofertas · **F** — cartão oferta antes **e** depois de aceitar (dois prints se crítico) · **G** — viagem activa: **dois lados** no mesmo passo quando possível · **H** — ecrã Frota/partner legível · **I** — página `/download` ou `/dl` / `/app` · **J** — ops API: resposta cron `200` + JSON ou traço webhook Stripe; **nunca** segredos na imagem ([`W1_PROD_SMOKE.md`](docs/ops/W1_PROD_SMOKE.md)).

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **S-00** | Âncora: raiz da app prod carrega (sem ecrã branco) | Concluído | Ronda **2026-05-13** prod; trio de janelas |
| **S-01** | Rodapé «Versão da aplicação» (versão + SHA) | Concluído | Mesma ronda; prints **A**+**C** |
| **S-02** | Login **passageiro** (fluxo real em prod) | Concluído | **B** PASSAGEIRO |
| **S-03** | Pedido de viagem — estado **antes** de motorista | Concluído | **D** |
| **S-04** | Login **motorista** | Concluído | **B** MOTORISTA |
| **S-05** | Motorista disponível / recebe oferta | Concluído | **E** |
| **S-06** | Aceitar oferta | Concluído | **F**; em `main` (**#319**): **marcador no mapa → painel** + slide/toque no painel (FIX-008); não lista principal |
| **S-07** | Sincronização: passageiro e motorista com estado coerente | Concluído | **G** |
| **S-08** | Conclusão da viagem + pós-viagem (rating/copy conforme UI) | Concluído | Rating fechado na mesma ronda |
| **S-09** | Login **partner** (Frota) | Concluído | **B** FROTA + **H** |
| **S-10** | Superfície Frota (ex. «Por aceitar», lista coerente, sem 500) | Concluído | **H** |
| **S-11** | Landing **download** (`/download`, redirects se forem checklist teu) | Concluído | Ronda fechada; entrega user-facing correcta do QR = **F-2** (re-smoke da landing isolada dispensável até ao fix) |
| **S-12** | **Admin** (staff): Saúde + Viagens carregam; só acções seguras em prod | Concluído | Verificado em prod **sem print** (critério Frank) |
| **S-13** | Ops: cron prod `200` + JSON; webhook Stripe activo (evidência fora do Git) | Concluído | **Sem delta** em cron / webhook / Stripe / env na API prod desde última verificação — não obriga reexecutar [`W1_PROD_SMOKE.md`](docs/ops/W1_PROD_SMOKE.md); repetir quando houver mudança nessa cadeia |

### Testes automáticos vs smokes (prod)

Prioridade: **alargar Playwright / pytest** onde já há cobertura (ex. `npm run test:e2e:api`, fluxos tocados por PR). **Smoke humano em prod** só **dedicado** quando há **delta** em caminho crítico (viagem, pagamentos, auth, admin sensível) ou deploy que o toca — **não** repetir a grelha **S-** semanalmente se **nada mudou**. Ver também **Notas E2E** em painéis antigos deste ficheiro.

### Fixes e issues (pós-smoke **2026-05-13**)

| ID | Fix / tema | Issue (GitHub) | Estado | Notas |
|----|------------|----------------|--------|-------|
| **F-1** | Motorista: «Deslizar para aceitar» / CTA principal **visível sem scroll** (viewport **360×800**) | — | Concluído | Código: caps da folha (`max-h` 1 vs várias ofertas), REJEITAR compacto em slide, `overflow-hidden` em `main` só `/driver`, gradiente palco mapa; `npm run build` |
| **F-2** | Passageiro: menu → botão → **imagem QR** no ecrã (asset na build, ex. `public/`) | — | Concluído | QR dinâmico no menu passageiro (`react-qr-code`); não exige PNG estático em `public/` |
| **F-3** | *(placeholder — lista Frank 5–6 issues)* | — | N/A | Ver [`MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md`](docs/product/MANEL_E_LEGAL_EXTRA_BACKLOG_2026-05.md) |
| **F-4** | *(placeholder)* | — | N/A | Idem |
| **F-5** | *(placeholder)* | — | N/A | Idem |
| **F-6** | *(placeholder)* | — | N/A | Idem |

_Quadro operacional:_ [`docs/todo-em-curso.md`](docs/todo-em-curso.md).

---

## Painel — 2026-05-13 (staging **A2-02** + smokes + EXTRA produto)

**Foco A+L / OPS:** fechar **staging** no Render — `GOOGLE_OAUTH_*` no **`tvde-staging-api`**, URIs **Google** (`https://tvde-staging-app.onrender.com` + callback), utilizadores de teste; **smokes assertivos** staging (e prod se couber). Actualizar checklist §A3 em [`docs/audit/AUDIT_EXEC_BACKLOG_AL_2026-05.md`](docs/audit/AUDIT_EXEC_BACKLOG_AL_2026-05.md) se o gate ficar verde.

**URLs staging (fixos):** app `https://tvde-staging-app.onrender.com` · API `https://tvde-staging-api.onrender.com`

### Lista **EXTRA** (verificar princípio / estado no código / conversa)

1. [ ] **Som** quando uma viagem «cai» no motorista (ex. wav ~2 s).
2. [ ] **Modo nocturno** automático no ecrã — já está? (testar.)
3. [ ] **Wake lock / ecrã sempre activo** em uso — já está? (testar.)
4. [x] *(Reservado na lista original — marcado feito pelo autor.)*
5. [ ] **Partner:** geração/gestão de documentos de **veículos** e **motoristas** — já está? (testar.)
6. [ ] **Driver → partner:** entrega de documentos (ex. registo criminal, carta); **avisos de caducidade**; **centralização no partner** (driver tem sempre partner). — já está? (testar.)
7. [ ] **QR estático** para download rápido da app (gerar **fora** da app, material partilhável) — **a conversar** (já existe landing `/download` em prod; alinhar peça gráfica).
8. [ ] **Driver:** botão **deslizar para aceitar** oferta.
9. [ ] **Driver:** repensar **ecrã principal** — máxima simplicidade — **a falar**.

_Quadro operacional:_ [`docs/todo-em-curso.md`](docs/todo-em-curso.md).

---

## Painel — 2026-05-12 (rumo **A+L** — fecho sessão noite)

**Foco:** mesmo quadro A+L; sessão incluiu env (`C:\dev\APP\docs\env\ENV_VARS_VERIFICATION.md` + templates, PR **#295** em `main`), OAuth Google **prod** (projecto **tvde-oauth**, cliente **TVDE SPA**), e **stack staging Render**: Postgres **`tvde-staging-db`**, **`tvde-staging-api`** (migrações no Shell), **`tvde-staging-app`** (rewrite SPA, `VITE_API_URL` staging, CORS na API).

**Pendente 2026-05-13:** Google OAuth **na** API staging; smokes; doc §A2-03 com host real (actualizado no audit com o fecho de sessão).

---

## Painel — 2026-05-11 (fecho dia)

**Entregue em `main` (até esta sessão):** **#288** — quadro operacional + ENV; **#289** — **`/download`** para QR; **2026-05-11** — **rotacional v2** (`GET /rotacional/messages`, `ROTACIONAL_FEED_JSON`, `AppHeaderBar`), spec [`docs/product/ROTACIONAL_V2_SPEC.md`](docs/product/ROTACIONAL_V2_SPEC.md); docs **Stripe** — reposto mock (checklist [`docs/env/ENV_SINGLE_REALITY.md`](docs/env/ENV_SINGLE_REALITY.md)).

**Testado (sessão):** **E2E** `npm run test:e2e:api` — **6/6** (`api-flows`, API local). *Smoke produção (QR, passageiro, barra): checklist humano após cada deploy.*

**Pendências operacionais (não bloqueiam):** **`VITE_APP_DOWNLOAD_URL`** só para destino **externo**. **Render:** confirmar `STRIPE_MOCK` / `VITE_STRIPE_MOCK` alinhados ao mock se ainda não aplicaste no dashboard. *Rotacional v3* (fontes externas, ex. [Meteopt](https://www.meteopt.com)) — ver [`docs/todo-em-curso.md`](docs/todo-em-curso.md) rasto.

_Quadro:_ [`docs/todo-em-curso.md`](docs/todo-em-curso.md).

---

## Painel — 2026-05-06 (arquivo)

**Feito:** `main` **#287** — barra inferior passageiro + Frota **«Por aceitar»**; prompts [`docs/prompts/passenger-frota-2026-05-06/`](docs/prompts/passenger-frota-2026-05-06/). Contexto anterior: **#285**, **#282**, **#280**/**#281**.

**Prioridade da altura (fechado ou absorvido no painel 2026-05-11):**

1. [x] **[VALIDAÇÃO]** Smoke **#285** / **#287** — coberto na rolda de produto / sessão seguinte.
2. [x] **[CONFIG]** **`VITE_APP_DOWNLOAD_URL`** — opcional; **#289** cobre QR no mesmo domínio sem variável.
3. [x] **[TESTES] E2E** — `driver-passenger-flow` + **`api-flows`** validados na sessão **2026-05-11** (local).
4. [x] [UX] Frota — **«Por aceitar»** (**#287**).
5. [x] [OPS] **Stripe** — **2026-05-11:** mock reposto em piloto (ver [`docs/env/ENV_SINGLE_REALITY.md`](docs/env/ENV_SINGLE_REALITY.md) + painel **2026-05-10**).

**Pós-implementação:** revisão jurídica de copy/resíduos rating; pipeline documental **upload + OCR**.

_Quadro operacional:_ [`docs/todo-em-curso.md`](docs/todo-em-curso.md).

---

## Painel — 2026-05-10

**REVISÃO (digest [`docs/audit/PROJECT_AUDIT_2026-05-02.md`](docs/audit/PROJECT_AUDIT_2026-05-02.md) — sumário + stack/realtime):**

- **Escala / realtime:** WebSockets e hubs **in-process** não escalam com vários workers; alinha com dívida DEBUG ponto 2 — planear por fase (workers, Redis, etc.), não como remendo num sprint só de UI.
- **Produto vs infra:** MVP web válido em piloto, mas **gap vs Uber** inclui payouts (Stripe Connect), SMS OTP real, observabilidade (APM) e apps nativas — refactor admin profundo não compensa se o trimestre for só motorista/zonas.
- **Risco operacional:** sem segundo ambiente (staging) e deploy manual Render — smokes em prod continuam canónicos para regressões cruzadas.

**Lembrete — Stripe:** **2026-05-11** — reposto **modo mock** em piloto (`STRIPE_MOCK=true` no `tvde-api`, `VITE_STRIPE_MOCK=true` no *build* `tvde-app`). Janela **test mode** anterior: ver histórico no item 7 abaixo (2026-05-09). Checklist operacional: [`docs/env/ENV_SINGLE_REALITY.md`](docs/env/ENV_SINGLE_REALITY.md) § *Repor modo mock Stripe*.

_*Fecho:* janela de piloto **encerrada** + mock reposto — ver painel **2026-05-11**._

---

## Painel — 2026-05-09

**Abertura:** **1.º** — **resto do smoke** (antigo ponto **2**): produção — **motorista** (pedidos/disponível + aceite se couber), **login** (linha versão), **cabeçalho** (papéis). Só anotar falhas.

**Onde correr:** smokes = **produção**; local = PW/dev.

**Progresso smoke (produção — 2026-05-09):** [x] **Motorista** — disponível, GPS ok. [x] **Login** — linha versão **v1.0.0 · c29dd31** visível. [x] **Cabeçalho** — sessão **Frota**: pastilha **FROTA**, **test_partner**, ref conta coerente; primeiro ecrã **Frota (partner)** ok.

1. [x] [OPS] **Smoke restante (sequencial, produção):** motorista, login (versão), cabeçalho (papéis) — **fechado** 2026-05-09 (sessão manhã).

_Nota:_ verificação **local** (`localhost:5173`) no commit **c29dd31**; **confirmado também em Render** (mesma versão, telemóvel — sem print) 2026-05-09.

2. [x] [OPS] **Follow-ups:** **sem falhas** reportadas após smoke **2026-05-09** (motorista, login, cabeçalho/Frota).

### Fecho sessão — 2026-05-09 (noite, smoke com Manel)

- [x] **Smokes produção (fechados por agora):** fluxo real — passageiro, frota **test_partner**, admin, motorista no **telemóvel**; viagem activa visível nos três papéis (detalhe frota ok, ex. `bcc70db8…` / ManelPerez).
- **Campo:** discrepância inicial «Frota sem viagem / Admin com viagem» esclarecida (conta do motorista vs perfil na frota; filtro *assigned* — rótulo **«Por aceitar»** desde **#287** — só mostra estado técnico *assigned*, não *aceite/em curso*).
- **Amanhã (2026-05-10):** retomar **Rasto vivaço** em [`docs/todo-em-curso.md`](docs/todo-em-curso.md); opcional UX — clarificar rótulo **«Só atribuídas»** na Frota; E2E local — se falhar, reiniciar `uvicorn` + Vite (hábito da equipa).

### Depois do smoke (fila)

1. [x] [OPS] **Item 6:** Render — segredos, `DATABASE_URL`, `GET /health`. **Fechado** 2026-05-07.
2. [x] [OPS] **Item 7 · Stripe (Render):** **fechado** na fila OPS — webhook **200** validado em janela **test mode**; **2026-05-11:** reposto **`STRIPE_MOCK=true`** (mock por defeito no piloto). *Isto não desliga o destino de webhook no Stripe Dashboard.*
3. [x] [CÓDIGO] **Item 9 — 1º:** `UI_VISIBILITY` Passo 1 — **#262**. **Fechado** 2026-05-06.
4. [x] [CÓDIGO+TESTES] **Item 9 — 2º:** E2E Playwright **drawer partner** — **merge `main`** 2026-05-09 (**#267**): seed `+351955555502` + `/dev/tokens` → `partner`, inject com `BETA_MODE` activo, spec `partner-shell`, script `npm run test:e2e:api`. **Follow-ups:** ver **Notas E2E** (abaixo).

_Item **8** (docs ENV) **fechado** 2026-05-07._

### Notas E2E (local)

- **`POST /dev/seed`** inclui utilizador partner canónico (`+351955555502`, org `test_partner`); **`POST /dev/tokens`** devolve também **`partner`**.
- **`npm run test:e2e:api`** — projecto só HTTP (`--no-deps`); **`CI=true`** recomendado na suíte completa para o Playwright gerir o Vite.
- **E2E (drawer / backlog Notas):** **(1)** `/dev/seed` + login BETA `dev_admin` (`api-flows`) — suíte **`npm run test:e2e:api`** verde na sessão **2026-05-11**. **(2)** `driver-passenger-flow`: passo 1 home two-step + sync pickup antes de iniciar viagem (ver spec); revalidar após mudanças em shell passageiro (**#287**+) ou motorista.

### Notas

- Baseline BD: [`docs/testing/DEV_BASELINE_ROSTER.md`](docs/testing/DEV_BASELINE_ROSTER.md) — local + Render alinhados **2026-05-08**.

### Refactor `AdminDashboard.tsx` — lista viva (planeamento → execução)

**Fonte:** [`docs/meta/ADMIN_DASHBOARD_REFACTOR_PLAN.md`](docs/meta/ADMIN_DASHBOARD_REFACTOR_PLAN.md)

| Estado | Item |
|--------|------|
| [x] | Plano por etapas + princípios + mapa de risco |
| [x] | Modelo de prompt reutilizável por PR |
| [x] | Prompts **P0**–**P12** redigidas (inventário → orquestrador final) |
| [x] | **Execução P0** (inventário + critérios por tab em [`ADMIN_DASHBOARD_REFACTOR_PLAN.md`](docs/meta/ADMIN_DASHBOARD_REFACTOR_PLAN.md) § P0) |
| [x] | **Execução P1** — fatia 1: `adminDashboardHelpers.ts` + `AdminTripPaymentOpsNotePanel.tsx` (smoke: tab **Viagens**, painel nota operacional pagamento) |
| [x] | **Execução P2** — hook [`useAdminDashboardNavigation.ts`](web-app/src/features/admin/useAdminDashboardNavigation.ts) (smoke: `?tab=health`, `?tab=trips&tripId=`, `?tab=trips&tripsList=history`, recarregar) |
| [x] | **Execução P3** — hook [`useAdminTripLists.ts`](web-app/src/features/admin/useAdminTripLists.ts) (smoke: tab **Viagens** activas/histórico, refresh 8s) |
| [x] | **Execução P4** — hook [`useAdminTripDetailActions.ts`](web-app/src/features/admin/useAdminTripDetailActions.ts) (smoke: detalhe, acções, nota, reconcile super_admin) |
| [x] | **Execução P5** — hook [`useAdminSystemPanels.ts`](web-app/src/features/admin/useAdminSystemPanels.ts) (smoke: tabs **Métricas**, **Saúde**, **Operações** — fetches, timeouts, offer-expiry, phase0) |
| [x] | **Execução P6** — hook [`useAdminAlertsAndAudit.ts`](web-app/src/features/admin/useAdminAlertsAndAudit.ts) (smoke: **Agora** alertas; tab **Utilizadores** trilho audit) |
| [x] | **Execução P7** — hook [`useAdminUsersDirectory.ts`](web-app/src/features/admin/useAdminUsersDirectory.ts) (smoke: **Utilizadores**) |
| [x] | **Execução P8** … **P12** — JSX por tab + orquestrador fino; `npm run build` web-app verde |

_Actualização **semi-dinâmica**: ao fechar o dia ou merge, marcar linhas aqui + nota curta no doc se o alcance mudar._

### Auditoria (registo **2026-05-08**, só leitura)

_Ver secção **painel 2026-05-08 · fechado** abaixo (pontos 1–11)._

---

## Painel — 2026-05-08 · **fechado**

1. [x] [OPS] **Smoke partner (ponto 1):** produção; discover Default fleet — **fechado** 2026-05-08.
2. [x] [OPS] **Follow-ups partner (ponto 3):** sem bloqueador — **fechado** 2026-05-08.
3. [x] [OPS] **Baseline BD:** wipe + seed **local** + **Render**; Gestão utilizadores **10** contas em produção — **fechado** 2026-05-08.

**Continua em 2026-05-09:** smoke restante (motorista, login, cabeçalho); follow-ups desse smoke; itens **7** / **9.2**; lista viva refactor (tabela no **painel 2026-05-09**).

### Vite local — nota operacional (referência)

- **`web-app/.env.local`:** `VITE_API_URL` para Render desvia o proxy **`/api`** local (~ `127.0.0.1:8000`).
- **`backend/.env` (local):** `BETA_MODE=true` se precisares de `GET /admin/users` no backoffice local.
- Baseline / dev_admin: [`DEV_BASELINE_ROSTER.md`](docs/testing/DEV_BASELINE_ROSTER.md); manter **`+351900000000`** em dev.

### Fecho do dia — auditoria de código (só leitura, 2026-05-08)

_Registado para fecho de sessão; **nenhuma alteração de código** feita na auditoria._

1. **Motorista:** `DriverDashboard.tsx` — `setDriverOnline` / `setDriverOffline` com `.catch(() => {})`; falhas de API podem desalinhar estado local vs servidor sem feedback ao utilizador.
2. **Backend:** hubs WebSocket (`DriverOffersHub`, `RealtimeHub`) só em memória por processo — com vários workers Uvicorn, push pode não chegar a todos os clientes (dívida de escala).
3. **Frontend:** `eslint-disable` de `exhaustive-deps` em `MapView.tsx`, `AdminDashboard.tsx`, `usePolling.ts`, `useSmoothedLatLng.ts` — risco de regressão se o pai passar novas referências com o mesmo valor.
4. **Rotas:** `/debug/map` em `routes/index.tsx` sem gate `DEV` — superfície extra em produção (página de debug do mapa).
5. **API saúde:** `system_health` com `stuck_trips` / `orphan_payments` vazios (deprecated) — compatibilidade de contrato, não “bugs” isolados.
6. **Backend:** `trips.py` — fluxo de viagens disponíveis combina ofertas + *legacy assigned*; dois caminhos, possível fonte de edge cases.
7. **Frontend:** `web-app/src/api/client.ts` — alias de timeout `@deprecated` (limpeza menor).
8. **Frontend:** `authStorage.ts` — migração `LS_TOKEN_LEGACY` → token actual (legado temporário).
9. **Backend:** `auth.py` imprime OTP em consola só com `ENV=dev` ou `ENABLE_DEV_TOOLS` — seguro se produção não ligar ferramentas dev por engano.
10. **Config:** `VITE_E2E` + tokens em `localStorage` — build de produção não deve definir `VITE_E2E=true`.

**Ponto 11 — `AdminDashboard.tsx` (monólito):** refactor **agora** implica PR grande, revisão penosa e risco real de **regressão** no backoffice + conflitos com qualquer trabalho paralelo; o tamanho do ficheiro **por si** não corrige um incidente activo. **Quando mexer:** preferir **extracções pequenas** (tab, hooks, API helpers) coladas a uma feature que já obrigue a tocar ali, ou após uma janela em que smokes/piloto estejam estáveis e possas testar admin com calma.

**Triagem DEBUG (painel 2026-05-08) — modo de ataque:**

- **A — Quick win, baixo risco** (quando o path do PR cruza): ponto **4** (`/debug/map` — em **produção** redirecciona para `/`; dev mantém página), **7** `client.ts` deprecado, **8** legado `LS_TOKEN_LEGACY`.
- **B — Design / produto / contrato:** pontos **1**, **5** `system_health`, **6** dois caminhos em `trips.py` — ticket + repro smoke antes de remendar.
- **C — Escala / infra:** ponto **2** WS in-process — alinhar ao PROJECT_AUDIT (realtime); tratamento faseado, não PR único de UI.

---

## Painel — 2026-05-06 · pós-merge **#258** (`main` @ `79d9ff6`)

_Ritmo acordado: **código primeiro** ao longo do dia; **smokes em sequência no fim do dia** (ou mini-smoke pontual se inevitável)._

### Entregue (já em `main`)

- [x] [CÓDIGO] **Partner — menu lateral:** Frota / Viagens / Relatórios / Definições com **dados reais** (métricas, contagens, CSV, últimas viagens, sessão BETA), em vez de placeholders.
- [x] [CÓDIGO] **Motorista:** `StatusHeader` **compacto** quando há pedidos (menos altura em viewport curta); menu: **BETA**, **Zonas** com `MapPin`, **Histórico (viagens)**; viagem concluída: copy pagamento **a processar**, **rating** acima do cartão + scroll suave.
- [x] [CÓDIGO] **Login:** linha **versão + SHA** de build; **AppHeaderBar:** pastilha de **papel** + ref curto de conta.
- [x] [CÓDIGO] **Motorista — sync pós-aceite** — merge **`#260`**: `POST /driver/status/online` não repõe `is_available` com viagem activa; não poll de detalhe antes do accept; interaction logs com `previous_state` correcto.

- [x] [DOCS] **Item 8 (ENV single reality):** `docs/env/ENV_SINGLE_REALITY.md` (hosts tvde-app / tvde-api, nota `STRIPE_MOCK`); `PREPARACAO_RENDER.md` (URLs passos 2–3); `backend/tools/simulator/README.md`.

### Noite 2026-05-07 — item 8 fechado

- [x] [DOCS] **Item 8:** varrimento env/hosts nos docs citados → **PR só docs**.

**Smokes:** **não** são hoje à noite — **2026-05-08 manhã**, **1.º lugar** no painel **2026-05-08** no topo deste ficheiro. Sem bugs a reportar até lá.

### Sessões seguintes — fila até fechar (ordem sugerida)

1. [x] [DOCS] **Item 8:** varrimento docs ENV → [`docs/env/ENV_SINGLE_REALITY.md`](docs/env/ENV_SINGLE_REALITY.md) + deploy/simulator. **Fechado** 2026-05-07.
2. [x] [OPS] **Item 6:** Render — rodar segredos expostos, validar `DATABASE_URL`, `GET /health`. **Fechado** 2026-05-07.
3. [ ] [OPS] **Item 7:** Stripe **test mode** pontual; voltar a **mock** no fim.
4. [x] [CÓDIGO] **Item 9 — 1º:** `UI_VISIBILITY` Passo 1 (**#262**). **Fechado** 2026-05-06.
5. [ ] [CÓDIGO+TESTES] **Item 9 — 2º (opcional):** E2E/PW se couber (ex.: drawer partner).

_Detalhe do plano por sessão: [`docs/todo-em-curso.md`](docs/todo-em-curso.md) § «Plano por sessões»._

---

## Painel rápido da sessão (2026-05-02 noite) — fechado

_Fecho após merge do **shell motorista** (barra inferior, mapa offline §9.2, pills §9.4, strip §9.5, dois passos + passo 1 alinhados). **App Render** com `VITE_DRIVER_BOTTOM_NAV` + `VITE_DRIVER_HOME_TWO_STEP` = `true` (rebuild); experimentação manual **muito boa** — **smokes formais + prints** ficam para **2026-05-03 manhã** (lista guardada; Firefox + Vivaldi incógnito, **um trilho** na app deployada)._

### Feito nesta sessão / vaga (já em `main`)

- [x] [CÓDIGO] Shell motorista — barra inferior, eventos Conta/Definições/Registo, menu §10, CTA zonas esgotadas, E2E `openDriverMenu`, mapa offline + pills, `DriverShellTopChips`, passo 1 com barra inferior.
- [x] [OPS] Render app — flags acima na build estática; teste = **só o que se vê na app** (sem ramos paralelos de checklist).

### Manhã 2026-05-03 (primeiro bloco)

- [ ] [OPS] **Smokes + prints** — lista Frank; mesma URL Render; pasta `smokes/…` (ou equivalente).
- [ ] [OPS] `npm run build` no `web-app` se após smokes quiserem confirmação extra.

### Rasto (não esquecer)

- [x] [DOCS] **Top 3 menu** — onda **fechada** (**#280** 2026-05-06: §10.2 + barra). Permuta §10.4 só **com** ranking/feedback Manel; até lá **sem** item aberto.
- [ ] [OPS] **Auditoria projecto** — `docs/audit/PROJECT_AUDIT_2026-05-02.md` na primeira abertura do dia em que for o foco.

---

## Painel rápido da sessão (2026-05-02) — fechado (smokes 2026-05-03)

_Série de smokes curtos concluída; `npm run build` no `web-app` OK._

### Smokes curtos (ordem sugerida)

1. [x] [OPS] `main` local = `origin/main`; app abre (Render ou local).
2. [x] [OPS] **Motorista** — Menu → secção **Mudança de zona (v1)**: orçamento carrega ou erro legível (API indisponível).
3. [x] [OPS] **Zonas** — Com API+BD: pedir zona → **Cheguei** → **Cancelar intenção** (ou fluxo mínimo que couber no tempo).
4. [x] [OPS] **Regressão leve** — toggle disponível/offline (validado); **preferência navegação** Google → Waze em viagem («Recolha — Waze»); **persistência** após logout/login; histórico já OK. **`DRIVER_MENU_SPEC.md` §7.8** prints **P1–P5** confirmados (2026-05-03).

### Depois dos smokes (não bloqueia o arranque)

- [x] [DOCS] **Portagens** — spec mínima: `docs/product/PORTAGENS_SPEC.md` (2026-05-03).
- [x] [CÓDIGO] **Zonas v1 — extensão prazo** — `POST …/request-extension` + `POST /partner/.../approve-extension` + UI menu; **fica pendente:** geo por `zone_id`, outras extensões partner além do prazo.
- [x] [DOCS] **Top 3 menu** — igual ao rasto 2026-05-02 noite: fechado **#280**; §10.4 documentado como «só após input Manel».
- [ ] [PENSAR] Login social (onda dedicada).

### Opcional

- [ ] [DOCS] Entrada `docs/research/` em `docs/meta/DOCS_INDEX.md`.
- [ ] [PENSAR] **Infos motorista no menu** — com o tempo, deslocar copy densa (rendimentos, zonas, preços estimativa, etc.) para **help / docs / tutoriais**; menu fica acções + atalhos. **Não** é prioridade nesta onda.

---

## Painel rápido da sessão (2026-05-01) — fechado

_Documentação Manel/benchmarks + **entregas código** em `main` (#211 esqueleto zonas, #212 consumo + arrived/cancel, #213 web + `GET /sessions/open` + `.gitignore` `test-results/`)._

### Feito nesta sessão / dia

- [x] [DOCS] Regra **2 zonas** + benchmarks (painel anterior; mantém-se canónico em `DRIVER_MENU_SPEC.md` e `docs/research/driver-app-benchmarks.md`).
- [x] [CÓDIGO] **Zonas v1 (núcleo)** — migração + modelos + `GET /driver/zones/budget/today` + `POST /driver/zones/sessions` + testes pytest (#211).
- [x] [CÓDIGO] **Zonas v1 (consumo)** — `arrived`, `cancel`, consumo na 1.ª `completed` após `arrived_at`; hook em `complete_trip` (#212).
- [x] [CÓDIGO] **Zonas v1 (web)** — `web-app/src/api/driverZones.ts` + bloco no menu motorista; `GET /driver/zones/sessions/open`; `.gitignore` para `test-results/` (#213).

### Fecho noite 2026-05-01

- **Smokes formais:** amanhã (série curta no arranque); hoje código mergeado com CI/ruff/build web verificados em PR.
- **Sessão fechada** — sem novo fio grande até ao «bom dia» + smokes.

### Rasto (não esquecer)

- [x] **Top 3 menu** — onda código+docs fechada **#280**; ajuste de ordem §10.4 = só quando houver resposta Manel (spec), não checklist pendente.

---

## Painel rápido da sessão (2026-04-30) — fechado

_Usar como histórico da sessão anterior._

### Agora

- [x] [DOCS] Respostas do Manuel recebidas e registadas em `docs/partner/MANUEL_DRIVER_QA_2026-04-29.md`.
- [x] [DOCS] Contrato técnico v1 definido em `docs/product/DRIVER_MENU_SPEC.md`: categorias + **«2 mudanças de zona/dia»**.
- [x] [CÓDIGO] Linha rotacional no cabeçalho (`AppHeaderBar` + `headerRotatingHints.ts`, v1 sem APIs).
- [x] [DOCS] Menu motorista — `docs/product/DRIVER_MENU_SPEC.md`.
- [x] [CÓDIGO] Categorias no menu: copy servidor + filtro; label **Elétrico**; título **Histórico**.
- [x] [CÓDIGO] Menu motorista: **Documentos** (copy + admin se `isAdmin`), **histórico** com data/preço/label PT, **rendimentos** com aviso sem `completed`.
- [x] [CÓDIGO] Menu motorista: histórico com **percurso** + **Mostrar mais** (+5) e contador.

### Já em `main` (merge 2026-04-29)

- [x] Token/rating por rota + banner + passageiro (#201).
- [x] Semântica vermelho/verde/azul + faixa 35/5/60 + data e hora no header (#202).
- [x] **Conta** vs **Configurações** + password BETA no perfil (#203).

### Amanhã / ondas

- [x] [CÓDIGO] Menu motorista — detalhe de viagem em modal (com ação de ocorrência) conforme `DRIVER_MENU_SPEC.md`.
- [ ] [PENSAR] Login social — onda dedicada (OAuth + fallback + compliance).

### Backlog

- [ ] [PENSAR] Theming/polish amplo e iconografia final (não bloqueador).
- [ ] [PENSAR] Refactors estruturais fora do fluxo crítico.

---

## Painel 2026-04-29 (fechado)

- [x] [OPS] Smoke curto passageiro + driver após merge (rating + rejeitar + preferência navegação).
- [x] [OPS] PRs de estabilização E2E/CI em `main` (tipagem + retry rate-limit + teste offline).
- [x] [CÓDIGO] Driver: rejeitar oferta; passageiro: rating; Waze/Google + wake lock; bordas light theme.
- [x] [TESTES] Smoke/e2e rejeição + rating + nav; CI E2E estável.
- [x] Semântica UI + faixa + hora no header; Conta vs Config (#201–#203).

---

## Painel 2026-04-28 (fechado)

- [x] Gap passageiro, ACEITAR visível, smoke combinado, PR mergeada, `main` alinhada.

---

## Âncora 2026-04-20 → 2026-04-25 — ALPHA OEIRAS/CASCAIS

**Documento mestre:** [`docs/meta/ALPHA_2026-04-25.md`](docs/meta/ALPHA_2026-04-25.md) — ler antes de qualquer sessão até sábado.

**Ondas (resumo):**

| Dia | Onda | Foco | Tipo |
|---|---|---|---|
| Seg 2026-04-20 | **0** | OPS-BD-PI + OPS-SMOKE-132 + BETA_MODE + contas + convocatória | Operacional (zero código) |
| Ter 2026-04-21 | **1** | Mobile polish core (touch ≥ 44 px, banners, 360 px) + smoke duplo | Código UI + smoke |
| Qua 2026-04-22 | **2** | Admin `AdminDashboard` aba Viagens afinada + smoke Nível 2 | Código UI + smoke. **Freeze 22:00.** |
| Qui 2026-04-23 | **3** | Ensaio com 1–2 testers externos | Execução + log bugs |
| Sex 2026-04-24 | **4** | Só S1+S2; deploy até 18:00; smoke final | Código mínimo |
| Sáb 2026-04-25 | **5** | **Piloto 2 h em Oeiras/Cascais** | Execução; zero deploys |

**Fora do âmbito até sábado:** Stripe real, app nativa, PWA, WebSockets no front, `/driver/offers` REST, `matching/find-driver` na UI, push, Stripe Connect, staging W3, CI de segurança, docs legais. Ver [`ALPHA_2026-04-25.md §2.2`](docs/meta/ALPHA_2026-04-25.md).

**Decisões do Frank (2026-04-20):** sem pagamento real · Oeiras+Cascais · Android web via link Render · reporte WhatsApp + talk. Detalhe em [`ALPHA_2026-04-25.md §1`](docs/meta/ALPHA_2026-04-25.md).

**Super-prompts prontas a colar por sessão:** [`ALPHA_2026-04-25.md §7`](docs/meta/ALPHA_2026-04-25.md).

---

## Fecho sexta 2026-04-24 — D-1 Alpha

_Âncora:_ produção validada em smoke real. Amanhã é execução, prints e relato — não abrir feature nova.

### Feito

- [x] [CÓDIGO] **Destino/recolha por texto** — PRs **#177**, **#178**, **#179** em `main`: fallback Nominatim, Portugal-first, recolha primeiro e texto-first para recolha+destino.
- [x] [SMOKE] **Viagem real D-1** — Frank + parceiro: casa (`Rua Caldas Xavier`) → **Oeiras Parque**; motorista aceitou; **Waze abriu correctamente**; produção <https://tvde-app-j51f.onrender.com>.
- [x] [OPS] **`main` sincronizada** — `origin/main` @ `68acf7c`; working tree limpa antes do PR de docs.

### Amanhã 2026-04-25 — primeira sessão

1. [ ] [OPS] **Oppo Reno 13 5G** — terminar setup; login; permissões de localização; Chrome/Waze prontos.
2. [ ] [DOCS] **Tutorial com prints** — recolha por texto → destino por texto → motorista aceita → Waze abre; guardar prints para handoff/tutorial.
3. [ ] [OPS] **Piloto/relato** — preencher `docs/meta/ALPHA_2026-04-25_RELATO.md` durante a janela; S1 bloqueia, S2/S3 anotar.

### Regra de sábado

- **Zero deploys durante a janela** salvo S1 bloqueador real. Qualquer polish fica para `docs/meta/BACKLOG_POST_PILOTO.md` e retro.
- Credenciais, handouts e prints operacionais ficam em `docs/_local/` / dispositivo; **não comitar segredos**.

---

## Abertura 2026-04-09 — consulta obrigatória

- **Ler primeiro:** [`docs/meta/CONSULTA_OBRIGATORIA_SESSAO_2026-04-09.md`](docs/meta/CONSULTA_OBRIGATORIA_SESSAO_2026-04-09.md) — circuito de implementação, compliance incremental, integrações tipo «import», aceleração (bulk visual + Playwright + telemóvel).
- **Fecho noite 2026-04-09:** E2E Playwright tab **Saúde** (`web-app/e2e/admin-health-tab.spec.ts`); restante inventário / A5 / D1 / smokes telemóvel / OPS — [`docs/meta/PROXIMA_SESSAO.md`](docs/meta/PROXIMA_SESSAO.md) secção **Fecho 2026-04-09 (noite)**.

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
