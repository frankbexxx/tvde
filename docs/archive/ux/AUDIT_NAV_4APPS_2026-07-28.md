# AUDIT-NAV-4APPS — Contrato de navegação (NAV-0) — 2026-07-28

**Estado:** **NAV-0 PASS** — documentação / contrato (sem código)  
**`main`:** ≥ `8aad43a`  
**Handoff:** [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md)  
**Âncoras código (leitura):** `web-app/src/routes/index.tsx` · `AppMenuShell` · `*BottomNav` / `*SideMenu` / `*MenuNav` · `AdminDashboard.tsx`  
**Relacionados:** [`navigation-inventory.md`](./navigation-inventory.md) · [`shell-menu-ia-canonical.md`](./shell-menu-ia-canonical.md) · [`ambiance-chrome-contract.md`](./ambiance-chrome-contract.md)

---

## 1. Sumário executivo

| Pergunta | Resposta |
|----------|----------|
| App **mais madura** em navegação | **Partner** — shell + hubs + rotas deep (`/drivers/:id`, `/trips/:id`) |
| App **mais irregular** | **Admin** — 10 tabs PT hardcoded, sem i18n, sem bottom/side menu |
| Dívida principal | Passenger/Driver = **1 URL cada** (menus em memória); sem contrato unificado; sem EmptyState / ErrorState / PageHeader partilhados |
| Refactor global | **Evitar** — arriscado para smokes e fluxos validados |
| Primeira fase | **NAV-0** (este doc) |
| Segunda fase | **NAV-1** labels / i18n |

**Modelo actual:** três apps mobile-like (Passenger / Driver / Partner) partilham `AppMenuShell` + bottom nav de 4 tabs; Admin é dashboard ops com tablist. Design-system (temas/chrome) existe; **não** há grammar de navegação unificada.

---

## 2. Matriz de menus por app

| Item (conceito) | Passenger | Driver | Partner | Admin | Observações |
|-----------------|-----------|--------|---------|-------|-------------|
| Início / Home | Sim (bottom) | Sim | Sim | Tab «Agora» | Admin ≠ bottom nav |
| Histórico / Viagens | Sheet | Sheet | Menu hubs | Tab Viagens | Deep-link: Partner + Admin |
| Conta / Perfil | Sim | Sim | Sim | Utilizadores (ops) | Admin = gestão, não «minha conta» |
| Definições / Aparência | Sim | Sim | Sim | Não | Temas partilhados |
| Caixa / Inbox | Não | Sim | Sim | Não | «Caixa» vs «Caixa de entrada» |
| Rendimentos / Relatórios | Não | Sim | Relatórios | Métricas | Conceitos vizinhos |
| Documentos | Não | Próprios | Frota / viaturas | Tab Documentos | Escopos diferentes |
| Frota / motoristas | Não | Não | Hub + deep | Tab Frota | Admin = orgs / assign |
| Zonas / Nav GPS / Categorias | Não | Sim | Não (ops no detalhe) | Não | Driver-specific |
| Partilhar app | Sim | Não | Não | Não | Highlight «trips» odd |
| Pendentes / Saúde / Ops | Não | Não | Não | Sim | Admin-only |

---

## 3. Matriz de profundidade

### Passenger — `/passenger` só

| Nível | Conteúdo |
|-------|----------|
| L0 | Mapa + planner / trip activa |
| L1 | Histórico, Conta, Menu, Settings, Partilhar |
| L2 | Detalhe histórico |
| L3 | Cancel overlay, pagamento, rating |

**Problema:** profundidade só em sheet — **não bookmarkable**; refresh → L0.

### Driver — `/driver` só

| Nível | Conteúdo |
|-------|----------|
| L0 | Mapa, disponibilidade, ofertas, trip activa |
| L1 | Earnings, Inbox, Menu (docs, zones, nav, …) |
| L2 | Trips silenced, sub-zonas, inbox compose |
| L3 | Dialogs / overlays trip |

**Problema:** menu **mais denso**; mesma fragilidade de URL; activity log por evento (fora do union de screens).

### Partner — `/partner` + deep

| Nível | Conteúdo |
|-------|----------|
| L0 | Home + alertas |
| L1 | Bottom fleet/inbox/menu; hubs |
| L2 | Folhas sheet **ou** `/drivers/:id`, `/trips/:id` |
| L3 | Docs viatura, force-online, reassign |

**Melhor equilíbrio** das quatro apps.

### Admin — `/admin?tab=…`

| Nível | Conteúdo |
|-------|----------|
| L0 | Tab Agora |
| L1 | 10 tabs planas |
| L2 | Trip detail inline (`tripId`), filtros |
| L3 | Cancel / assign / reconcile / playbooks |

**Problema:** densidade de 10 tabs; sem hierarquia tipo hubs.

---

## 4. Rotas e ecrãs principais

| Rota | Role | Componente | Finalidade | Gap |
|------|------|------------|------------|-----|
| `/passenger` | Pax | `PassengerDashboard` | Toda a UX | Sem sub-rotas |
| `/driver` | Driver | `DriverDashboard` | Toda a UX | Sem sub-rotas |
| `/partner` | Partner | `PartnerHome` | L0 | Hubs só sheet |
| `/partner/drivers/:userId` | Partner | `PartnerDriverDetail` | Detalhe motorista | UX scroll debt |
| `/partner/trips/:tripId` | Partner | `PartnerTripDetail` | Detalhe viagem | — |
| `/admin` | Admin | `AdminDashboard` | Tudo via query | Sem i18n |
| `/admin/login` | — | → `/admin` | Alias | — |

**Partner sheets (sem URL):** fleet → list/map/add/vehicles · trips → summary/list/export · reports · inbox · profile · settings.

**Admin tabs:** `agora` · `docs` · `pending` · `users` · `frota` · `dados` · `trips` · `metrics` · `ops` · `health` (labels hardcoded PT).

**Ausente:** catch-all `*` · `/auth/google/callback` só no ramo beta não-auth.

---

## 5. Componentes repetidos / candidatos a refactor

| Tipo | Exemplos | Fase |
|------|----------|------|
| Seguro local | Labels Inbox; Partner trips hub PT fixo; share highlight | NAV-1 |
| Partilhado leve | Empty/loading text; PageHeader; ErrorBanner | NAV-2 |
| Global arriscado | Deep links Pax/Driver; redesign Admin 10→IA; unificar map shells | NAV-4 só se necessário |
| Manter específico | Map trip Pax/Driver; Partner force-online/docs; Admin cron/health | — |

**Confirmado:** não existem `EmptyState` / `ErrorState` / `PageHeader` / `ActionBar` partilhados no código (grep zero à data da auditoria).

---

## 6. Inconsistências UX

- Driver: bottom «Caixa» vs menu «Caixa de entrada»
- Partner: `rolePartner`≈«Frota» vs badge «Parceiro» vs `menuTitle.default` «Partner»
- Admin: **0% i18n**; Partner trips hub fora de i18n
- Empty/error: mix `common:loading`, inline, banners, PT hardcoded pontual
- Persistência: Partner deep + Admin query OK; Pax/Driver menu estado **perdido** no refresh

---

## 7. Gap Admin

### Existe
Tablist 10 secções + sync `?tab=&tripId=&tripsList=` · trip support · docs/users/frota/ops/health · `AppHeaderBar`.

### Falta / irregular
Namespace `admin` i18n · agrupamento IA · Empty/Error consistentes · shell alinhado (ou decisão explícita «Admin = ops-desktop»).

### Menus mínimos sugeridos (futuro NAV-3 — sem implementar agora)

1. **Agora**  
2. **Viagens**  
3. **Pessoas** (users + pending + docs)  
4. **Frota**  
5. **Sistema** (ops + health + metrics + dados)

Manter decisão produto: Admin ≠ dispatcher diário.

---

## 8. Proposta de normalização — contrato de shells

| Shell | Apps | Características |
|-------|------|-----------------|
| **map-immersive** | Passenger, Driver | Mapa full-bleed; bottom nav 4; side sheet; menus sobretudo em memória |
| **workspace** | Partner | Home + hubs sheet; **detalhe crítico em URL**; bottom nav 4 |
| **ops-desktop** | Admin | Tablist / grupos; sync query; sem bottom nav mobile |

### Peças partilhadas propostas (fases posteriores)

| Peça | Nota |
|------|------|
| Navigation config por role | Declarativo (Partner já tem `partnerMenuNav`) |
| `PageHeader` | Título + back + actions opcionais |
| `EmptyState` / `ErrorBanner` | Leves + `common:` i18n |
| Detail layout | Partner detail como referência visual |
| Action bar | Só CTA crítico de trip — não forçar global |
| i18n | `admin.json`; limpar hubs/labels |

---

## 9. Plano faseado NAV-0 → NAV-4

| Fase | Scope | Risco | Smokes |
|------|-------|-------|--------|
| **NAV-0** | Este doc — contrato / inventário | Nulo | N/A |
| **NAV-1** | Labels / i18n inconsistentes | Baixo | Visual curto 4 roles |
| **NAV-2** | EmptyState + ErrorBanner + PageHeader leves | Baixo–médio | RTL + smoke leve |
| **NAV-3** | Admin grupos / copy / i18n — **sem** mudar lógica trips/payments | Médio | Admin Ops smoke |
| **NAV-4** | Deep links Pax/Driver; refactor shell profundo | Alto | Só se produto pedir |

---

## 10. Riscos

| Risco | Mitigação |
|-------|-----------|
| Quebrar matching / trips / payments | NAV não toca backend nem lifecycle |
| Refactor gigante dashboards | Proibido em NAV-0…2 |
| Invalidar Availability / Partner / PF3D smokes | Mudanças FE com regressão curta |
| Admin a parecer dispatcher | Respeitar docs Admin ≠ dispatcher |
| B2 / PF3D ON | Fora de scope desta linha |

---

## 11. Recomendação

1. Fechar **NAV-0** (este ficheiro) em `main` via docs PR.  
2. Seguir com **NAV-1** (labels/i18n) — zero risco operacional.  
3. **Não** iniciar NAV-4 nem deep-links Passenger/Driver sem pedido explícito.  
4. B2 e PF3D ON continuam em filas separadas (Manel / atribuição real).

**Frase de fecho:** Contrato de navegação registado. Partner = referência workspace; Admin = ops-desktop a normalizar depois; Pax/Driver = map-immersive sem forçar URLs ainda.

---

## Fora de scope (este doc)

Código · rotas · frontend/backend · env · DB · migrations · B2 · PF3D ON · refactor.

---

*Docs-only. Auditoria 2026-07-28.*
