# TVDE — Roadmap pós DEMO smoke

**Estado do documento:** rascunho de trabalho (não final) · **Data:** 2026-07-30  
**Contexto:** pós DEMO_4_PAPEIS, pós BUG-DEMO-1, `main` limpo.

> Documento operacional / planning. Não substitui [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md) nem [`TODOdoDIA.md`](../../TODOdoDIA.md); complementa com detalhe.

---

## 0. Estado base confirmado

| Item | Valor |
|------|--------|
| `main` | `78fbd29` (#517 Partner labels/datas) |
| `origin/main` | alinhado |
| working tree | limpa |
| DEMO_4_PAPEIS smoke | **PASS** |
| Partner smoke pós-#517 | **PASS** (2026-07-31) — pronto demo Manel |
| BUG-DEMO-1 | corrigido e fechado (#513/#514) |
| NAV-3D.2b | **Fechado** (#515) |
| PF3D gates | **OFF** |
| B2 next-trip | espera decisão Manel |
| Stripe live | espera parceiro / conta / docs |
| Bugbot / Cloud automations | **OFF** |

### Fechado recentemente

| PR | O quê |
|----|--------|
| #504 | auth hardening privilegiados/demo |
| #507 | script seguro passwords privilegiadas |
| #508 | handoff P-504-PWD |
| #509 | fix flake Playwright geolocation |
| #510 | sync handoff/TODOdoDIA |
| #511 | runbook DEMO_4_PAPEIS |
| #512 | registo smoke DEMO_4 PASS + BUG-DEMO-1 |
| #513 | fix BUG-DEMO-1 Driver detalhe acima do menu |
| #514 | docs/meta fecho BUG-DEMO-1 |
| #515 | NAV-3D.2b Agora refresh → ErrorBanner |
| #516 | roadmap pós DEMO smoke |
| #517 | Partner status labels + datas demo (+ smoke manual **PASS**) |

### Produção validada no smoke

Health · logins Pax/Driver+online/Partner/Admin-SA · viagem completa (pedir → oferta → accept → start → ongoing → complete → rating) · Partner Home/KPIs/frota/viagens · Admin Agora/Viagens/Saúde — **OK**.

**Resultado geral:** DEMO_4_PAPEIS smoke **PASS**.

---

## 1. Fecho documental pós-BUG-DEMO-1

| | |
|---|---|
| **Estado** | **Concluído** via #514 |
| **Tempo** | 15–30 min |
| **Tipo** | docs/meta |
| **Risco** | muito baixo |
| **Prioridade** | concluída |

Alinhar `TODOdoDIA.md`, `PROXIMA_SESSAO.md`, `DEMO_4_PAPEIS.md` com #513/#514 e smoke PASS.

---

## 2. Demo real / apresentação ao Manel

| | |
|---|---|
| **Tempo** | 30–60 min preparar · 15–20 min executar |
| **Tipo** | operacional/comercial |
| **Risco** | baixo/médio (GPS, matching, Render) |
| **Prioridade** | **muito alta** |

Usar [`DEMO_4_PAPEIS.md`](DEMO_4_PAPEIS.md): 4 papéis, sem improvisar fora de âmbito (B2, PF3D ON, Stripe live, docs reais, payouts).

**Necessidades:** passwords próprias admin/partner · demo pax/driver · GPS Driver · health OK · fallback matching.

---

## 3. NAV-3D.2b — Admin Agora refresh error → ErrorBanner

| | |
|---|---|
| **Tempo** | 30 min–1h30 |
| **Tipo** | polish técnico pequeno |
| **Risco** | baixo |
| **Prioridade** | **concluída** (#515) |

Trocar apresentação do erro `admin-agora-refresh-error` para `ErrorBanner`, preservar `testId`, retry/Atualizar intacto. Contrato Admin: `?tab=` · sem `?group=` · `tripId`/`tripsList`. Sem Trips/Ops.

**Estado:** mergeado em `dc66772`.

---

## 4. Partner UX polish mínimo (demo frota)

| | |
|---|---|
| **Estado** | **Concluído** (#517 · `78fbd29`) + smoke manual **PASS** 2026-07-31 |
| **Tempo** | 0,5–2 dias |
| **Risco** | médio |
| **Prioridade** | concluída para demo |

Labels PT status + datas `formatDateTime` + empty hints. Smoke: login · Home/KPIs · frota · viagens · detalhe (`Concluída` + datas) · nav OK.

**Residual (não bloqueante):** copy `tripDetail.reassignUnavailable` / hint ainda com «`assigned`» literal — polish display-only futuro; **não** bloquear demo Manel.

---

## 5. Driver UX polish pós-demo

| | |
|---|---|
| **Tempo** | 0,5–2 dias |
| **Risco** | médio |
| **Prioridade** | média/alta |

Re-testar BUG-DEMO-1 em prod · Menu → Viagens · layering sheets/dialogs · empty states. **Não** tocar ciclo matching/accept/start/end · evitar refactor `DriverDashboard`.

---

## 6. B2 next-trip while ongoing

| | |
|---|---|
| **Tempo** | 3–7+ dias |
| **Risco** | alto |
| **Prioridade** | **bloqueada** — decisão Manel |

**Não iniciar sem decisão explícita.**

---

## 7. PF3D gates ON / compliance

| | |
|---|---|
| **Tempo** | 2–5 dias smoke controlado (+ mais p/ prod real) |
| **Risco** | alto se ON em prod |
| **Prioridade** | média, perigosa |

Só ambiente controlado/staging. **Não ligar globalmente em produção agora.**

---

## 8. Stripe live / pagamentos reais

| | |
|---|---|
| **Tempo** | 2–5 dias + dependência externa |
| **Risco** | alto |
| **Prioridade** | **bloqueada** |

Parceiro + conta Stripe + docs. Sem colar secrets no chat.

---

## 9. Active trip restore Passenger/Driver

| | |
|---|---|
| **Tempo** | 2–4 dias |
| **Risco** | médio/alto |
| **Prioridade** | alta p/ uso real |

Backend + frontend; estados activos claros; E2E refresh/reopen. Cuidado com regressões no fluxo smoke.

---

## 10. Documentos reais Driver/Partner/Admin

| | |
|---|---|
| **Tempo** | 5–10+ dias |
| **Risco** | alto |
| **Prioridade** | alta comercial · baixa demo curta |

Upload real, revisão, auditoria, RGPD. Ligação futura a PF3D.

---

## 11. Recomendações de ordem

**Apresentação:** (1) Demo Manel → (2) feedback → (3) Partner polish se frota → (4) decisão B2 → (5) ActiveTrip restore ou B2.

**Técnica agressiva:** ActiveTrip restore → Partner polish → PF3D smoke controlado → B2 pós-Manel.

**Mais segura agora:** não mexer em core · demo/feedback · escolher próximo bloco com base no feedback.

---

## 12. Não iniciar sem decisão explícita

- B2 next-trip while ongoing  
- PF3D gates ON em produção  
- Stripe live  
- documentos reais com upload  
- payouts/faturação  
- refactor grande do DriverDashboard  
- NAV-3E / PageHeader grande se o objectivo for demo  

---

## 13. Próximo passo sugerido

Demo real ao Manel com [`DEMO_4_PAPEIS.md`](DEMO_4_PAPEIS.md) — Partner polish #517 + smoke **PASS**. Depois feedback · residual reassign-copy (opcional) · ActiveTrip restore · B2 (se Manel decidir).

---

**Fim.**
