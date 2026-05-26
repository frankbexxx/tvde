# Inventário UI — Parceiro / Frota (maio 2026)

**Modo:** READ-ONLY · Só features **visíveis no ecrã**.

**Rotas:** `/partner`, `/partner/drivers/:userId`, `/partner/trips/:tripId`

---

## 1. FEATURES IMPLEMENTADAS VISÍVEIS

| FEATURE | ONDE APARECE NO UI | FLUXO USER | ESTADO | FICHEIROS | NOTAS |
|---------|-------------------|------------|--------|-----------|-------|
| Dashboard frota | `/partner` | Login tab Frota | IMPLEMENTADA | `PartnerHome.tsx` | |
| Métricas 6 KPIs | Home grelha | Automático load | IMPLEMENTADA | idem | |
| Precisa de atenção | Home card | Heurísticas client | PARCIAL | idem | Estados EN na API |
| Adicionar motorista | Home secção | Discover q≥2 → Adicionar | IMPLEMENTADA | idem | |
| Lista motoristas + filtros | Home | Chips todos/online/offline | IMPLEMENTADA | idem | |
| Lista viagens + filtros | Home | Chips estado | IMPLEMENTADA | idem | |
| Pesquisa listas | Home input | Nome/tel/trip id | PARCIAL | idem | Label promete mais do que filtra |
| Export CSV viagens | Home + menu | Download real | IMPLEMENTADA | `api/partner.ts` | |
| Side menu 4 ecrãs | Drawer | Frota/Viagens/Relatórios/Definições | IMPLEMENTADA | `PartnerSideMenu.tsx` | Resumos, não rotas |
| Detalhe motorista | `/partner/drivers/:id` | Docs, zona, status | PARCIAL | `PartnerDriverDetail.tsx` | |
| Aprovar/rejeitar docs metadata | Detalhe motorista | Chips estado | PARCIAL | idem | Sem ver PDF |
| Grant +1 zona budget | Detalhe motorista | Confirm → POST | IMPLEMENTADA | idem | |
| Ativar/desativar frota | Detalhe motorista | PATCH status | IMPLEMENTADA | idem | Só approved/rejected |
| Online/offline forçado | Detalhe motorista | PATCH availability | IMPLEMENTADA | idem | Só approved |
| Detalhe viagem | `/partner/trips/:id` | Ver estado + timestamps | PARCIAL | `PartnerTripDetail.tsx` | Sem moradas |
| Reassign motorista | Detalhe viagem | Select + Reatribuir | PARCIAL | idem | Só `assigned` |
| Conta BETA | Fundo home | Nome + password | IMPLEMENTADA | `BetaAccountPanel.tsx` | |
| Atualizar dados | Home rodapé | Reload API | IMPLEMENTADA | `PartnerHome.tsx` | |

---

## 2. FEATURES VISÍVEIS MAS NÃO IMPLEMENTADAS

| FEATURE | ONDE APARECE | O QUE PROMETE | O QUE FALTA | FICHEIROS | PRIORIDADE |
|---------|--------------|---------------|-------------|-----------|------------|
| Relatórios avançados | Menu → Relatórios | Analytics | «ficam para fases seguintes» | `PartnerHome.tsx` | Média |
| Definições menu | Menu → Definições | Settings frota | Só leitura nome/tel sessão | `PartnerSideMenu.tsx` | Baixa |
| Pesquisa passageiro | Placeholder home | ID ou passageiro | Só trip_id | `PartnerHome.tsx` | Média |
| Estados PT viagem/motorista | Listas e fichas | Labels PT | Valores API EN crus | Vários | Média |
| Upload documentos | Detalhe motorista | Ver ficheiros | Só metadata + validade | `PartnerDriverDetail.tsx` | Alta |

---

## 3. FEATURES NÃO VISÍVEIS MAS EXISTENTES NO CÓDIGO

| FEATURE | EXISTE ONDE | PORQUE NÃO CONTA | COMO TORNAR VISÍVEL |
|---------|-------------|------------------|---------------------|
| Remover motorista frota | Admin API | Partner sem UI | Botão + DELETE partner scope |
| Mapa live frota | — | Não implementado | Nova view mapa |
| Zone extension approval | Backend partner | UI em falta | Tab ou modal aprovação |
| Criar viagem / cancelar | — | Não existe FE | N/A partner |
| OCR suggested expiry | Tipo API | Campo não renderizado | Mostrar sugestão na ficha |

---

## 4. FEATURES ESPERADAS TIPO UBER/BOLT QUE FALTAM

| FEATURE | APP | EXISTE? | GAP | PRIORIDADE |
|---------|-----|---------|-----|------------|
| Gestão motoristas | Partner | Parcial | Sem remover da frota | Alta |
| Gestão frota mapa live | Partner | Não | Zero mapa | Alta |
| Métricas | Partner | Sim | KPIs básicos | — |
| Exports CSV | Partner | Sim | Client-side list | — |
| Documentos | Partner | Parcial | Metadata only | Alta |
| Reassignment | Partner | Parcial | Só assigned | Alta |
| Alertas operacionais | Partner | Parcial | Heurística «atenção» | Média |
| Comissões/faturação | Partner | Não | — | Alta |
| Escalas/turnos | Partner | Não | — | Baixa |
| Aprovar extensão zona | Partner | Não | Backend only | Média |
| Bulk actions | Partner | Não | — | Média |
| Filtros server-side | Partner | Não | Client only | Média |
| Moradas viagem na UI | Partner | Não | — | Alta |
| Disputes | Partner | Não | — | Média |
| Logs acções parceiro | Partner | Não | — | Média |

---

## 5. MATRIZ FINAL (Parceiro)

| APP | FEATURE | VISÍVEL? | FUNCIONAL? | ESTADO | PRIORIDADE | BLOQUEIA FEATURE-COMPLETE? |
|-----|---------|----------|------------|--------|------------|----------------------------|
| Partner | Lista motoristas + add | Sim | Sim | IMPLEMENTADA | — | Não |
| Partner | Docs motorista | Sim | Parcial | PARCIAL | Alta | Sim (compliance) |
| Partner | Viagens + CSV | Sim | Parcial | PARCIAL | Média | Não |
| Partner | Reassign | Sim | Parcial | PARCIAL | Alta | Não |
| Partner | Mapa ops | Não | Não | — | Alta | Sim (frota média) |
| Partner | Financeiro | Não | Não | — | Alta | Sim (comercial) |
