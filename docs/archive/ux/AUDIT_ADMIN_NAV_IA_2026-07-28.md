# AUDIT Admin NAV / IA — NAV-3A — 2026-07-28

**Tipo:** docs-only (NAV-3A)  
**Base código (leitura):** `main` ≥ `fe6bbe5`  
**Âncoras:** `AdminDashboard.tsx` · `useAdminDashboardNavigation.ts` · `adminDashboardQuery.ts` · `tabs/AdminTab*.tsx` · `routes/index.tsx`  
**Pré-requisitos:** NAV-0 (`AUDIT_NAV_4APPS_2026-07-28.md`) · NAV-1 labels · NAV-2A/B/C EmptyState/ErrorBanner (Partner)

---

## 1. Sumário executivo

| Achado | Detalhe |
|--------|---------|
| Problema principal | **Organização**, não falta de features |
| Sintoma | 10 tabs L1 planas; labels **PT hardcoded**; **zero hierarquia** |
| Shell (NAV-0) | Admin = **ops-desktop** (tablist + query; sem bottom nav) |
| Risco de mexer | **Médio–alto** se rewrite de `AdminDashboard` ou mudança de lógica trips/ops |
| Abordagem segura | **docs → i18n → agrupamento visual** (sem mudar handlers / `?tab=`) |

Admin já cobre viagens, frota, health, cron, users, docs. O custo actual é **encontrar** e **não partir deep links**.

---

## 2. Inventário das tabs actuais

Labels L1 em `AdminDashboard.tsx` (`TABS`); IDs em `adminDashboardQuery.ts` (`ADMIN_DASHBOARD_TAB_IDS`).

| key | Label PT | Componente | Finalidade | Acções principais | Risco operacional | Futuro |
|-----|----------|------------|------------|-------------------|-------------------|--------|
| `agora` | Agora | `tabs/AdminTabAgora.tsx` | Snapshot operacional + atalhos | Refresh; links → outras tabs | Baixo | **L1** landing |
| `docs` | Documentos | `tabs/AdminTabDocs.tsx` | Docs motorista | Estados docs; links frota/users/ops | Médio | Sub **Pessoas** |
| `pending` | Pendentes | `tabs/AdminTabPending.tsx` | Pedidos de role | **Aprovar** | Médio | Sub **Pessoas** |
| `users` | Utilizadores | `tabs/AdminTabUsers.tsx` | Directório contas | Patch; block; promote/demote; delete; audit | **Alto** | Sub **Pessoas** |
| `frota` | Frota | `tabs/AdminTabFrota.tsx` | Orgs partner + assign | Criar org/manager; assign/unassign | Médio–alto | **L1** grupo Frota |
| `dados` | Dados | `tabs/AdminTabDados.tsx` | Visibilidade IDs (copy) | Search + copiar UUID | Baixo | Sub **Sistema** |
| `trips` | Viagens | `tabs/AdminTabTrips.tsx` | Activa/histórico + detalhe | Assign; cancel; reconcile; transição; notas | **Muito alto** | **L1** grupo Viagens |
| `metrics` | Métricas | `tabs/AdminTabMetrics.tsx` | Contadores / usage | Refresh; link histórico | Baixo | Sub **Sistema** |
| `ops` | Operações | `tabs/AdminTabOps.tsx` | Cron, timeouts, reconcile batch, env, recover | Jobs SA; dry-run; export logs | **Muito alto** | Sub **Sistema** |
| `health` | Saúde | `tabs/AdminTabHealth.tsx` | Anomalias health | Refresh; open trip | Médio | Sub **Sistema** |

**Decisão produto (mantém-se):** Admin ≠ dispatcher diário; assign diário → Partner fleet / matching.

---

## 3. Contrato obrigatório de query params

Implementação: `parseAdminDashboardQuery` + `useAdminDashboardNavigation` (estado derivado da URL).

| Param | Papel |
|-------|--------|
| `?tab=` | Tab activa; valor inválido / ausente → **`agora`** |
| `?tripId=` | Detalhe viagem; **força** tab `trips` |
| `?trip_id=` | Alias aceite de `tripId` |
| `?tripsList=` | `active` (default) \| `history` |
| `?trips_list=` | Alias aceite de `tripsList` |

| Rota | Papel |
|------|--------|
| `/admin` | Única shell Admin |
| `/admin/login` | Redirect → `/admin` |

**Deep links internos (preservar):**

- Agora / Docs / Metrics / Health / Ops → `syncAdminUrl({ tab, tripId… })`
- Health / Ops → `tab=trips&tripId=…` (abrir suporte viagem)

**Regra NAV-3:** qualquer mudança visual **não** pode quebrar este contrato (cobertura: `adminDashboardQuery.test.ts`).

---

## 4. Proposta de agrupamento — 5 áreas

Tabs **continuam** a existir como keys `?tab=` (não apagar). Agrupamento = chrome visual, não merge de lógica.

| Grupo | Tabs | Label PT | Label EN | Descrição | Risco UI | Prioridade |
|-------|------|----------|----------|-----------|----------|------------|
| **A. Agora** | `agora` (+ cards) | Agora | Now | Situação + saltos | Baixo | Alta |
| **B. Viagens** | `trips` | Viagens | Trips | Listas + detalhe suporte | Alto (não tocar lógica) | Alta |
| **C. Pessoas** | `pending`, `users`, `docs` | Pessoas | People | Aprovações, contas, docs | Médio | Média |
| **D. Frota** | `frota` | Frota | Fleet | Orgs / assign Admin | Médio | Média |
| **E. Sistema** | `health`, `ops`, `metrics`, `dados` | Sistema | System | Saúde, jobs, métricas, IDs | Alto em ops | Média–baixa |

---

## 5. Proposta futura (sem código nesta fase)

| Fazer | Não fazer |
|-------|-----------|
| Manter query params | Sidebar completa já |
| Tabs agrupadas / cards em Agora | Novas rotas `/admin/trips` |
| ops-desktop explícito | Rewrite `AdminDashboard` |
| i18n tabs depois (NAV-3B) | Mudar assign / cancel / reconcile |
| Empty/Error Admin depois (NAV-3D) | Mudar ops / cron / reconcile batch |

---

## 6. i18n Admin

| Achado | Estado |
|--------|--------|
| `web-app/src/i18n/locales/*/admin.json` | **Não existe** |
| Tabs L1 | Hardcoded PT em `TABS` |
| Títulos / botões / empty | Hardcoded nos `AdminTab*` |

**NAV-3B** = i18n mínimo (`admin.json` PT/EN + labels tabs / headings principais).  
**Não** misturar i18n com agrupamento visual (NAV-3C) na mesma PR grande.

---

## 7. Plano faseado

| Fase | Escopo | Risco |
|------|--------|-------|
| **NAV-3A** | Este documento (IA + contrato query) | Nenhum código |
| **NAV-3B** | `admin.json` PT/EN + labels tabs / headings | Baixo |
| **NAV-3C** | Agrupamento visual **sem** mudar handlers / query | Médio-baixo |
| **NAV-3D** | EmptyState / ErrorBanner em empties/erros Admin óbvios | Baixo |
| **NAV-3E** | Melhorias profundas (só com smoke + decisão produto) | Alto |

---

## 8. Riscos

| Risco | Mitigação |
|-------|-----------|
| Quebrar `?tab=` / `tripId=` / `tripsList=` | Não alterar `adminDashboardQuery` / nav hook cedo |
| Assign / cancel / reconcile / transição | Fora de NAV-3A–C |
| Cron / env / reconcile batch (ops) | Só copy UI; sem mudar botões SA |
| Deep links health→trips | Smoke URL após qualquer mudança nav |
| Confundir Admin com dispatcher | Respeitar decisão produto |

---

## 9. Recomendação final

1. **NAV-3A** (este doc) — fechado como contrato IA Admin.  
2. **Próximo:** **NAV-3B** i18n mínimo Admin.  
3. **Adiar:** sidebar, rewrite dashboard, PageHeader Admin, mudanças trips/ops, NAV-3E.

**Frase de fecho:** Admin precisa de IA + i18n, não de features novas. Preservar query params. Primeira implementação segura após docs = NAV-3B labels.

---

## Âncoras de código (leitura)

| Área | Paths |
|------|--------|
| Shell / tabs L1 | `web-app/src/features/admin/AdminDashboard.tsx` |
| URL sync | `useAdminDashboardNavigation.ts` · `adminDashboardQuery.ts` |
| Tabs | `web-app/src/features/admin/tabs/AdminTab*.tsx` |
| Rotas | `web-app/src/routes/index.tsx` |
| Trips (alto risco) | `useAdminTripDetailActions.ts` · `AdminTabTrips.tsx` |
| Health links | `healthTripLinks.ts` · `AdminHealthAnomalyBlocks.tsx` |

## Fora de scope (NAV-3A)

Sem código · sem `web-app` changes · sem backend/env/DB · sem rotas · sem operações Admin · sem B2 · sem PF3D ON.
