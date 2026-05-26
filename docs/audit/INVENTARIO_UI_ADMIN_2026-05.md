# Inventário UI — Admin (maio 2026)

**Modo:** READ-ONLY · Só features **visíveis no ecrã**.

**Rota:** `/admin` → `AdminDashboard.tsx` · 10 tabs via `?tab=`

---

## 1. FEATURES IMPLEMENTADAS VISÍVEIS

| FEATURE | ONDE APARECE NO UI | FLUXO USER | ESTADO | FICHEIROS | NOTAS |
|---------|-------------------|------------|--------|-----------|-------|
| Nav 10 tabs | Barra topo | ?tab= agora…saúde | IMPLEMENTADA | `AdminDashboard.tsx` | |
| Tab Agora (KPIs) | Tab Agora | Resumo + links | IMPLEMENTADA | `AdminTabAgora.tsx` | Poll ~8s |
| Aprovar user pendente | Tab Pendentes | Aprovar por telefone | PARCIAL | `AdminTabPending.tsx` | Só BETA_MODE |
| CRUD users (nome/tel) | Tab Utilizadores | Editar → guardar | IMPLEMENTADA | `AdminTabUsers.tsx` | |
| Bloquear/desbloquear | Tab Utilizadores | Por user / bulk | PARCIAL | idem | super_admin API |
| Promote motorista/passageiro | Tab Utilizadores | Botões | PARCIAL | idem | UI admin; API super_admin |
| Eliminar user | Tab Utilizadores | Confirm | PARCIAL | idem | super_admin |
| Audit trail user | Tab Utilizadores | details lazy | IMPLEMENTADA | `useAdminAlertsAndAudit.ts` | |
| Criar frota + gestor | Tab Frota | 3 passos forms | IMPLEMENTADA | `AdminTabFrota.tsx` | |
| Assign/remove motorista frota | Tab Frota | Select/manual UUID | IMPLEMENTADA | idem | |
| Pesquisa dados (users/partners/drivers) | Tab Dados | Filtro + copiar IDs | IMPLEMENTADA | `AdminTabDados.tsx` | |
| Viagens activas + histórico | Tab Viagens | Sub-tabs | IMPLEMENTADA | `AdminTabTrips.tsx` | Hist 404 legado msg |
| Detalhe viagem + acções | Tab Viagens | assign/transition/cancel | IMPLEMENTADA | `useAdminTripDetailActions.ts` | |
| Stripe reconcile viagem | Detalhe viagem | super_admin | PARCIAL | idem | Condicional |
| Nota ops pagamento | Detalhe viagem | POST nota | IMPLEMENTADA | `AdminTripPaymentOpsNotePanel.tsx` | |
| Métricas + usage | Tab Métricas | Cards + weekly inline | IMPLEMENTADA | `AdminTabMetrics.tsx` | |
| Cron / timeouts / offer expiry | Tab Operações | Botões destructive | PARCIAL | `AdminTabOps.tsx` | super_admin |
| Export logs CSV | Tab Operações | Download | PARCIAL | idem | super_admin |
| Reconcile Stripe bulk | Tab Operações | Preview + run | PARCIAL | idem | super_admin |
| Validar .env | Tab Operações | Textarea validate | PARCIAL | idem | Não grava |
| Recover driver | Tab Operações/Saúde | Lista + UUID manual | IMPLEMENTADA | `AdminTabOps.tsx` | |
| Driving rest override | Tab Operações | datetime | IMPLEMENTADA | idem | |
| System health | Tab Saúde | Status + warnings | IMPLEMENTADA | `AdminTabHealth.tsx` | |
| Anomalias 6 tipos + playbooks | Tab Saúde | Lista paginada | IMPLEMENTADA | `AdminHealthAnomalyBlocks.tsx` | |
| Abrir viagem desde saúde | Links | ?tripId= | IMPLEMENTADA | `healthTripLinks.ts` | |

---

## 2. FEATURES VISÍVEIS MAS NÃO IMPLEMENTADAS

| FEATURE | ONDE APARECE | O QUE PROMETE | O QUE FALTA | FICHEIROS | PRIORIDADE |
|---------|--------------|---------------|-------------|-----------|------------|
| Tab Documentos | Tab Documentos | Gestão docs motorista | **localStorage** `tvde_admin_driver_docs_registry_v1` | `AdminTabDocs.tsx` | Alta |
| Aviso «Módulo em implementação» | Tab Documentos | Docs admin | PLACEHOLDER explícito | idem | — |
| Aprovar/rejeitar motorista (docs) | Tab Documentos botões | Persist server | MOCK localStorage | idem | Alta |
| Debug viagem | Detalhe viagem | Trip debug JSON | super_admin; admin vê falha silenciosa | `useAdminTripDetailActions.ts` | Baixa |
| Rejeitar user pendente | Tab Pendentes | — | Só Aprovar existe | `AdminTabPending.tsx` | Média |
| Disputes | — | — | Tab/fluxo inexistente | — | Alta |

---

## 3. FEATURES NÃO VISÍVEIS MAS EXISTENTES NO CÓDIGO

| FEATURE | EXISTE ONDE | PORQUE NÃO CONTA | COMO TORNAR VISÍVEL |
|---------|-------------|------------------|---------------------|
| Driver approve/reject API | `admin.py` 501 | Sem UI funcional | Implementar backend + tab |
| WS admin trips | `/ws/admin/trips` | Sem consumer FE | Wire dashboard live |
| GET /admin/reports/weekly | `api/admin.ts` | Função não chamada | Botão em Métricas |
| DevTools export CSV | `DevTools.tsx` | Fora admin tabs | N/A |

---

## 4. FEATURES ESPERADAS TIPO UBER/BOLT QUE FALTAM

| FEATURE | APP | EXISTE? | GAP | PRIORIDADE |
|---------|-----|---------|-----|------------|
| Dashboards ops | Admin | Parcial | 10 tabs; docs mock | — |
| Disputes | Admin | Não | Zero UI | Alta |
| Refunds | Admin | Parcial | Stripe reconcile só | Alta |
| Logs/admin actions | Admin | Parcial | Audit user; não global | Alta |
| Métricas | Admin | Sim | — | — |
| Frota/partners | Admin | Sim | Tab Frota | — |
| Promo codes | Admin | Não | — | Média |
| Surge/tarifas/área | Admin | Não | — | Alta |
| Support tickets | Admin | Não | — | Alta |
| Suspend/ban (UI clara) | Admin | Parcial | Block exists | Média |
| KYC workflow | Admin | Não | — | Alta |
| Anti-fraude dashboard | Admin | Não | — | Média |
| Trip timeline replay | Admin | Parcial | Debug super_admin | Média |
| Push/SMS mgmt | Admin | Não | — | Baixa |
| MFA admin | Admin | Não | — | Alta |

---

## 5. MATRIZ FINAL (Admin)

| APP | FEATURE | VISÍVEL? | FUNCIONAL? | ESTADO | PRIORIDADE | BLOQUEIA FEATURE-COMPLETE? |
|-----|---------|----------|------------|--------|------------|----------------------------|
| Admin | Trips ops (assign/cancel) | Sim | Sim | IMPLEMENTADA | — | Não |
| Admin | Users directory | Sim | Parcial | PARCIAL | Média | Não |
| Admin | Health/anomalias | Sim | Sim | IMPLEMENTADA | — | Não |
| Admin | Documentos | Sim | Não | MOCK | Alta | Sim (compliance) |
| Admin | Disputes/refunds | Não/Parcial | Não | — | Alta | Sim (comercial) |
| Admin | Live trips WS | Não | Não | — | Média | Não |
