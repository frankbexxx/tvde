# Plano de refactor — `AdminDashboard.tsx` (só planeamento e prompts)

**Estado:** P0–**P3** em código: **P2** `useAdminDashboardNavigation`; **P3** `useAdminTripLists` (activas + histórico). **P4+** por PR.  
**Última actualização:** 2026-05-11.

**Tabs canónicas** (URL `?tab=`): `agora` · `docs` · `pending` · `users` · `frota` · `dados` · `trips` · `metrics` · `ops` · `health` (ver `adminDashboardQuery.ts`).

---

## Princípios

| Regra | Motivo |
|--------|--------|
| Um PR = uma fatia testável | Evitar regressões massivas no backoffice |
| Sem mudar contratos API nem query URL | `parseAdminDashboardQuery` e deep links são sensíveis |
| Extrair primeiro dados (hooks), depois JSX (painéis) | Menor risco do que mover 2000 linhas de UI de uma vez |
| Manter `eslint` verde; evitar novos `eslint-disable` | O ficheiro já tem um; não expandir o padrão sem necessidade |
| Validar com `npm run build` + smoke manual da tab tocada | Playwright admin existente se aplicável |

---

## Mapa de etapas (ordem sugerida)

| ID | Entrega | Risco | Dependências |
|----|---------|-------|--------------|
| **P0** | Inventário + critérios de aceitação por tab | Baixo | — |
| **P1** | Leaf components + helpers puras para ficheiros adjacentes | Baixo | P0 |
| **P2** | Hook de sincronização URL (`syncAdminUrl`, estado inicial) | Médio | P1 |
| **P3** | Hook listagens viagem (activas / histórico) | Médio | P2 |
| **P4** | Hook detalhe viagem + debug + acções (reconcile, assign, transitions) | Alto | P3 |
| **P5** | Hooks saúde + métricas + usage + phase0 | Médio | P1 |
| **P6** | Hook alertas + audit trail (se agrupado no ficheiro) | Médio | P5 |
| **P7** | Hook utilizadores (filtro, paginação, bulk) | Alto | P1 |
| **P8** | Painel JSX tab **Viagens** (`trips`) | Alto | P4 |
| **P9** | Painéis JSX **Health** + **Ops** + **Metrics** | Médio | P5–P6 |
| **P10** | Painéis JSX **Users** + **Pending** + **Frota** + **Dados** | Alto | P7 |
| **P11** | Painéis JSX **Agora** + **Docs** | Médio | P2 |
| **P12** | `AdminDashboard.tsx` fino (orquestração); revisão final | Médio | P8–P11 |

---

## P0 — Inventário + critérios de aceitação por tab (**executado**)

Referência URL: `parseAdminDashboardQuery` em `adminDashboardQuery.ts`. **Invariantes:** `tripId` na query força `tab=trips`; `tripsList` só aplica em `trips` (`history` vs activas); tab inválida ou ausente → `agora`. **Aceitação geral por PR:** `npm run build`; smoke manual da tab tocada; sem mudança de query API nem semântica de query string.

| Tab | Fetches ao entrar / mudar foco (resumo) | Conteúdo / risco | Smoke mínimo |
|-----|-------------------------------------------|------------------|--------------|
| **agora** | `fetchActiveTrips`, `fetchMetrics`, `fetchHealth`, `fetchAdminAlerts` | Resumo operacional, sinais de saúde | Abrir `?tab=agora`; cards carregam ou erro legível; refresh não parte layout |
| **docs** | Dados de utilizadores + registo local de estados de documentos | Matriz docs por motorista | Alternar estados; contagens «aprovados»; persistência registry local |
| **pending** | `fetchPending` (também no intervalo global) | Fila de papéis pedidos | Lista consistente após aprovar/rejeitar |
| **users** | `fetchUsers` + paginação; acções PATCH/DELETE | Bulk block, edição nome/telefone, BETA | Filtro, página seguinte, mensagens `formatAdminApiDetail` em erro |
| **frota** | `ensureDataLoaded` (partners/drivers) | Atribuir/remover motorista, criar org | Listagens; atribuição com motivo SP-F |
| **dados** | `fetchDataVisibility` | Visibilidade / phase0 admin | Toggle ou dados carregam conforme API |
| **trips** | Activas: `fetchActiveTrips`; histórico: `fetchHistoryTrips`; detalhe por `tripId` | Lista + painel detalhe, reconcile, nota operacional pagamento | `?tab=trips&tripId=…` abre detalhe; `tripsList=history`; painel nota (super_admin + elegível) inalterado |
| **metrics** | `fetchMetrics`, `fetchUsage` | Gráficos / contagens | Dados ou estado vazio estável |
| **ops** | `fetchHealth` + acções cron/validação CSV | Operações pesadas (muitas gated super_admin) | Health base carrega; acções críticas só com papel certo |
| **health** | `fetchHealth` | Tabelas de anomalias + playbooks | Paginação por bloco; links para viagens |

---

## Modelo de prompt (copiar para cada PR)

Cola isto no início de cada pedido ao assistente e preenche os campos `[ … ]`.

```markdown
## Contexto
- Repo: TVDE web-app (`web-app/`).
- Ficheiro monolítico: `web-app/src/features/admin/AdminDashboard.tsx`.
- Política: **uma alteração de comportamento = zero**; só mover/extrair e reorganizar.
- Deep linking admin: `web-app/src/features/admin/adminDashboardQuery.ts` — **não alterar semântica**.

## Objectivo desta PR (P[X])
[ Frase única: ex. "Extrair hook useAdminTripsList com os mesmos estados e fetchers". ]

## Ficheiros que podes criar ou editar
- [ listar paths novos e existentes ]

## Invariantes (não violar)
- URLs `?tab=…&tripId=…&tripsList=history` comportam-se igual.
- Papéis `admin` vs `super_admin` e desactivação de botões (403) mantêm-se.
- Tokens: usar o mesmo `apiFetch` / headers que hoje.
- Estilos: classes Tailwind equivalentes (especialmente `min-h-11 touch-manipulation` onde já aplicado).

## Fora de âmbito desta PR
- [ listar ]

## Passos esperados
1. [ … ]
2. Correr `cd web-app && npm run build`.
3. [ smoke manual: qual tab / fluxo ]

## Critérios de aceitação
- [ ] `npm run build` sem erros
- [ ] Diff focado; sem refactor "de vizinhança"
- [ ] Comportamento da(s) tab(s) afectada(s) indistinguível do utilizador
```

---

## Prompt P0 — Inventário e gates (read-only + doc)

**Contexto** — igual ao modelo; comportamento: **não alterar código de produção** nesta tarefa.

**Objectivo** — Produzir um **checklist em comentário ou anexo** que mapeie: (a) cada `tab` → blocos JSX aproximados (linhas no `AdminDashboard.tsx` actual), (b) `useState` / `useCallback` que pertencem a cada tab, (c) efeitos `useEffect` que dependem de `tab`. Opcional: listar funções `fetch*` e handlers que só uma tab usa.

**Ficheiros** — Só leitura de `AdminDashboard.tsx`, `adminDashboardQuery.ts`. Saída pode ser secção nova **neste** `.md` ou comentário no topo de um ficheiro de plano.

**Invariantes** — Nenhum ficheiro `.tsx` alterado para comportamento.

**Fora de âmbito** — Qualquer refactor.

**Validação** — N/A (documento apenas).

**Critérios de aceitação** — Checklist cobre as 10 tabs + modo `tripsList` activo/histórico + deep link com `tripId`.

---

## Prompt P1 — Leaf components e helpers puras

**Objectivo** — Mover para módulos adjacentes **sem alterar UI**:

1. Componente `AdminTripPaymentOpsNotePanel` → `web-app/src/features/admin/AdminTripPaymentOpsNotePanel.tsx` (export nomeado). **Feito 2026-05-10.**
2. Funções puras / helpers no topo → `web-app/src/features/admin/adminDashboardHelpers.ts` (`emptyDriverDocs`, `docsApprovedCount`, `approvedDriverDocs`, `tripDetailEligibleSinglePaymentReconcile`, `formatAdminApiDetail`, `adminErrDetail`, `sessionJwtIsSuperAdmin`, `maskSensitiveEnvDisplay`, `readInitialAdminQuery`, `countHealthSignalRows`, `healthRowTimestamp`, `promptGovernanceReason` com side-effects `window`). **`isBackofficeStaffRole` passou a import de `AuthContext` (sem duplicar).** **Feito 2026-05-10.**

**Ficheiros** — `AdminDashboard.tsx`, novos sob `features/admin/`.

**Invariantes** — Mesmos `data-testid` / ids de textarea se existirem; mesmas strings PT.

**Fora de âmbito** — Extrair o componente principal; hooks.

**Validação** — `npm run build`; abrir tab **Viagens** com detalhe e painel de nota operacional.

---

## Prompt P2 — Hook sincronização URL e tab

**Entrega (2026-05-11)** — `web-app/src/features/admin/useAdminDashboardNavigation.ts`: `tab`, `tripsListMode`, `selectedTripId`, `syncAdminUrl`, `selectTripsListMode`; `setTab` não exposto (actualização só via `parseAdminDashboardQuery` + `adminQs`). Efecto `paymentOpsNoteText` por `selectedTripId` mantém-se no dashboard.

**Objectivo (original)** — Extrair `useSearchParams`, `parseAdminDashboardQuery`, `syncAdminUrl` e estado derivado da URL para um hook reutilizável com a **mesma semântica** que o dashboard tinha inline.

**Ficheiros** — `AdminDashboard.tsx`, novo hook em `features/admin/`.

**Invariantes** — Comportamento de `useEffect` que reage a `selectedTripId` e sincroniza URL mantém-se; não duplicar fonte de verdade.

**Fora de âmbito** — Fetch de viagens; alterar `adminDashboardQuery.ts` (só se bug óbvio — preferir PR separado).

**Validação** — Deep link `?tab=health`, `?tab=trips&tripId=<uuid>`, `?tab=trips&tripsList=history`; recarregar página preserva estado.

---

## Prompt P3 — Hook listagens de viagens (activas + histórico)

**Entrega (2026-05-11)** — `web-app/src/features/admin/useAdminTripLists(token)`: `activeTrips`, `historyTrips`, `historyTripsError`, `fetchActiveTrips`, `fetchHistoryTrips`.

**Objectivo** — Extrair estado e funções `fetchActiveTrips`, `fetchHistoryTrips`, listas `activeTrips`, `historyTrips`, loading/erro associados para `useAdminTripLists.ts`.

**Ficheiros** — `AdminDashboard.tsx`, `api/admin.ts` apenas imports.

**Invariantes** — Paginação / “carregar mais” se existir; mesmas condições de refetch ao mudar tab.

**Fora de âmbito** — Detalhe de viagem, debug, reconcile.

**Validação** — Tab **Viagens**: alternar activas/histórico; lista popula como antes.

---

## Prompt P4 — Hook detalhe de viagem e acções administrativas

**Objectivo** — Agrupar `fetchTripDetail`, `fetchTripDebug`, `tripDetail`, `tripDebug`, `handleAssignTrip`, `handleAdminTripTransition`, `handleCancelTrip`, `handleReconcileSingleTripPayment`, `handlePaymentOpsNote`, estados `tripActionLoading`, reconcile, etc. em `useAdminTripDetailActions.ts` (ou dividir em dois hooks se >400 linhas — documentar no PR).

**Ficheiros** — `AdminDashboard.tsx`, possivelmente tipos de `api/admin.ts`.

**Invariantes** — `promptGovernanceReason` para acções SP-F; mensagens de erro com `formatAdminApiDetail`.

**Fora de âmbito** — Listagens P3.

**Validação** — Fluxo completo numa viagem de teste: abrir detalhe, ver debug, cancelar governado (se aplicável), nota operacional, reconcile (mock Stripe).

---

## Prompt P5 — Hooks saúde, métricas, phase0, usage

**Objectivo** — Extrair `fetchHealth`, `fetchMetrics`, `fetchUsage`, `phase0`, `runTimeouts`, `runOfferExpiry`, estados relacionados para um ou dois hooks (`useAdminSystemPanels.ts`).

**Ficheiros** — `AdminDashboard.tsx`.

**Invariantes** — Tab **Ops** vs **Health** partilham dados conforme hoje; botões desactivados para `admin` sem `super_admin` mantêm-se.

**Fora de âmbito** — Utilizadores; viagens.

**Validação** — Tabs **Métricas**, **Saúde**, **Operações** (e chamadas que não escrevem em prod sem confirmação).

---

## Prompt P6 — Alertas e audit trail admin

**Objectivo** — Se `fetchAdminAlerts`, `fetchAdminAuditTrail`, estados e UI de alertas estiverem misturados, extrair hook `useAdminAlertsAndAudit.ts` e limitar props ao painel que os consome.

**Ficheiros** — `AdminDashboard.tsx`.

**Invariantes** — Intervalos de refresh / `useEffect` existentes.

**Fora de âmbito** — Métricas globais P5.

**Validação** — Alertas visíveis na tab **Agora** ou onde estiverem hoje; audit abre.

---

## Prompt P7 — Utilizadores (filtros, paginação, bulk)

**Objectivo** — Extrair lógica de lista de utilizadores, filtro, ordenação, `USERS_PAGE_SIZE`, selecção em massa, PATCH/block/password para `useAdminUsersDirectory.ts`.

**Ficheiros** — `AdminDashboard.tsx`.

**Invariantes** — Preservar `sessionStorage` ou estado de filtro se já existir no código; bulk actions e confirmações.

**Fora de âmbito** — Frota.

**Validação** — Tab **Utilizadores**: filtrar, carregar mais, operação bulk em ambiente seguro.

---

## Prompt P8 — Componente tab Viagens (JSX)

**Objectivo** — Mover o bloco `{tab === 'trips' && (…)}` para `AdminTabTrips.tsx`. Props: tudo o que o painel precisa (listas, handlers, `syncAdminUrl`, `tripsListMode`, etc.). **Zero** lógica nova — apenas passagem de props.

**Ficheiros** — `AdminDashboard.tsx`, `AdminTabTrips.tsx`.

**Invariantes** — Lista activa/histórico; painel órfão de deep link; detalhe inline; botões `min-h-11`.

**Fora de âmbito** — Alterar P3–P4 se já extraídos (apenas imports).

**Validação** — Regressão completa tab **Viagens** (o maior risco).

---

## Prompt P9 — Componentes tabs Health, Ops, Metrics (JSX)

**Objectivo** — Extrair três blocos `tab === 'health'|'ops'|'metrics'` para `AdminTabHealth.tsx`, `AdminTabOps.tsx`, `AdminTabMetrics.tsx` (ou um ficheiro com três exports se preferires reduzir ficheiros — justificar no PR).

**Ficheiros** — `AdminDashboard.tsx`, novos em `features/admin/tabs/` (opcional pasta).

**Invariantes** — Copy PT; estados disabled; cron/validações super_admin.

**Validação** — Smoke rápido às três tabs.

---

## Prompt P10 — Componentes Users, Pending, Frota, Dados (JSX)

**Objectivo** — Extrair `tab === 'users'|'pending'|'frota'|'dados'` para componentes dedicados; props explícitas.

**Ficheiros** — `AdminDashboard.tsx`, novos componentes.

**Invariantes** — Fluxos partner/frota e criar org; painel **Dados** e visibilidade.

**Validação** — Quatro tabs; criar partner apenas em dev/staging se for destrutivo.

---

## Prompt P11 — Componentes Agora e Docs (JSX)

**Objectivo** — Extrair `tab === 'agora'|'docs'`; o tab **Agora** costuma agregar resumos + alertas — manter ordem visual.

**Ficheiros** — `AdminDashboard.tsx`, novos componentes.

**Invariantes** — Links rápidos para health/trips se existirem.

**Validação** — Tab inicial padrão e **Docs**.

---

## Prompt P12 — Orquestrador final e limpeza

**Objectivo** — `AdminDashboard.tsx` contém apenas: composição de hooks, barra de tabs, render condicional `<AdminTab… />`; **alvo** \< 400–500 linhas. Remover imports mortos; garantir um único `useEffect` “tab sync” bem nomeado.

**Ficheiros** — `AdminDashboard.tsx` + revisão de todos os ficheiros criados.

**Invariantes** — Suite build; sem alteração de rotas.

**Fora de âmbito** — Novas features.

**Validação** — `npm run build`; passagem manual **todas** as tabs + deep links; opcional `npm run test` / Playwright admin se existir.

---

## Seguimento no `TODOdoDIA.md`

O painel do dia mantém checkboxes **planeamento vs execução** (actualizado quando cada P[N] for mergeado). Este ficheiro é a **fonte de verdade** dos prompts; o painel só aponta estados.

---

_Este documento não substitui testes; execução faseada conforme risco do negócio._
