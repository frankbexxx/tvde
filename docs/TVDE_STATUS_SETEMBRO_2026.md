# TVDE-APP — Ponto de situação Setembro 2026

**Data:** 2026-09-04 (revisão legal M2) · actualização executiva G3/M1 2026-09-03 · base analítica 2026-09-01  
**Tip `main`:** alinhar com `origin/main` na sessão de commit  
**Marco 1:** **DONE** — APP TECHNICALLY COMPLETE (G3.1 PASS 2026-09-03) — **não reaberto** pela revisão legal  
**Modo:** pós-M1 · caminho crítico = **Marco 2 (`READY FOR REAL PILOT`)**  
**Fonte de verdade:** código actual + roadmap canónico + [`A3_REQUISITOS`](legal/A3_REQUISITOS_TVDE_SETEMBRO_2026.md) (rev. 2026-09-04)  
**Docs antigos (Maio e anteriores):** só pistas — confrontados com código; itens já implementados marcados **STALE / JÁ RESOLVIDO** e **excluídos** da lista de trabalho

Relacionado (contexto Setembro, não substitui este relatório):

- [`docs/ROADMAP_FINAL_ENTREGA_TVDE_2026.md`](ROADMAP_FINAL_ENTREGA_TVDE_2026.md) — canónico de execução + marcos
- [`docs/legal/A3_REQUISITOS_TVDE_SETEMBRO_2026.md`](legal/A3_REQUISITOS_TVDE_SETEMBRO_2026.md) — A3-D03-REV1 / A3-D04-REV1
- [`docs/legal/TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md`](legal/TVDE_LEGAL_IMPACT_MATRIX_2026-09-04.md)
- [`docs/product/SETEMBRO_2026_TODO_LIBRARY.md`](product/SETEMBRO_2026_TODO_LIBRARY.md)
- [`TODOdoDIA.md`](../TODOdoDIA.md)
- [`docs/ops/DEMO_MANEL_2_SETEMBRO.md`](ops/DEMO_MANEL_2_SETEMBRO.md)

---

## 1. Ponto de situação actual

| Área | Estado | Nota curta |
|------|--------|------------|
| **Geral** | **M1 DONE** / **M2 PARCIAL** | Quatro papéis OK em WEB/PWA; M2 exige blockers legais + live pay + SMS + mobile |
| **Passenger** | **OK** (M1) | Pedido → viagem → rating; emergência / RAL / fatura = **gaps M2** |
| **Driver** | **OK** (M1) · **GAP M2** | Ciclo completo; docs FE; driving-hours **WARN+RECORD** (A3.8) — M2 exige **enforcement** (A3-D04-REV1) |
| **Partner/Frota** | **OK** (M1) · **GAP M2** | Frota/docs; **sem** validação IMT; PF3D gates **OFF** (implementação pendente, A3-D03-REV1) |
| **Admin** | **OK** (M1) | Approve/reject E5; override ilegal contra estado oficial = **proibido** (decisão A3) |
| **Backend/API** | **OK** | FastAPI 4 papéis; **sem** cliente IMT |
| **Autenticação** | **PARCIAL** | OTP sem SMS real → C1 M2 |
| **Pagamentos** | **PARCIAL** | Mock piloto; B1 M2; sem Connect (A1-D05) |
| **Compliance legal** | **PARCIAL** | Base Lei 45/2018 (59/2026) identificada; **12 BLOCKERS M2** documentados; código ainda não alinhado |
| **Matching/dispatch** | **OK** matching · **PENDENTE** B2 | Multi-offer OK; B2 writers zero |
| **Localização/mapas** | **OK** | Tracking existe; **não** ligado a emergência/autoridades |
| **Infra/deploy** | **OK** / **PARCIAL** ops | Render + CI |
| **Testes/CI** | **OK** | Backend + e2e |
| **Docs/operação** | **PARCIAL** | A3-REV + matriz legal 2026-09-04; PDFs P0 ainda a arquivar |

---

## 2. Inventário — método e STALE

### Método

Pesquisado em código/testes/scripts/workflows/docs vivos: `TODO`/`FIXME`/`HACK`/`501`/`NotImplemented`/flags OFF/mocks/stubs/skip/`queued`/Connect/PF3D/B2.  
**Quase zero** `TODO`/`FIXME` literais em `backend/**/*.py` e `web-app/src/**` — a dívida está em **flags**, **schema inerte (B2)**, **política ops** e **biblioteca Setembro**. Stubs Admin `501` approve/reject = **STALE** (E5 DONE #544).

### Exemplos STALE / JÁ RESOLVIDO (não entram na lista final)

| Sinal antigo | Porque STALE |
|--------------|--------------|
| Gaps genéricos de “falta driver reject / ActiveTrip F5 / Partner mapa” (docs Maio–Jul) | Implementados e smoke PASS (`c4690ea`, Partner mapa, restore) |
| “Partner reports future” como ausência total de KPIs | Partner tem métricas + export CSV |
| Inventários Maio de shells/nav incompletos | Inventário UX actual marca bottom nav / earnings / inbox / docs APIs como implementados |
| PF3D “não existe código” | Código de gates existe; produto deliberadamente **OFF** *(até 2026-09-04: OFF = falta base legal; **agora:** OFF = implementação pendente — **A3-D03-REV1** exige gates M2)* |
| B2 “não há decisões” | Decisões + schema feitos (#525–#527); falta lifecycle/UI |

---

## 3. Lista consolidada de pendências reais

Formato: `ID | Área | Item | Prioridade | Dependência`

### Pagamentos / dinheiro

| ID | Área | Item | Prioridade | Dependência |
|----|------|------|------------|-------------|
| **S-PAY-01** | Backend/API | Activar caminho Stripe **live** em prod (`STRIPE_MOCK=false`, `sk_live_*`, webhook live) — hoje bloqueado por política | P0 — Bloqueador | Decisão Francisco + parceiro |
| **S-PAY-02** | Backend/API | Stripe **Connect** + split comissão/motorista (ou partner) + KYC contas | P0 — Bloqueador | S-PAY-01 · modelo BUSINESS/SEP-PAY |
| **S-PAY-03** | Backend/API | Payouts (cadência + beneficiário motorista vs partner) | P1 — Necessário para fechar produto | S-PAY-02 |
| **S-PAY-04** | Backend/API | `ENABLE_CONFIRM_ON_ACCEPT` / 3DS no accept (hoje default OFF) | P1 — Necessário para fechar produto | S-PAY-01 |
| **S-PAY-05** | Backend/API | MB WAY / SIBS / Multibanco (PT) — inexistente no código | P1 — Necessário para fechar produto | Decisão Manel · PSP |
| **S-PAY-06** | Backend/API | Taxa cancelamento ainda **simulada**; `authorization_expires_at` não preenchido | P2 — Melhoria importante | S-PAY-01 |
| **S-PAY-07** | Passenger | Auth placeholder €0,50 até complete — alinhar com preço real | P2 — Melhoria importante | S-PAY-01 |

### Autenticação / notificações

| ID | Área | Item | Prioridade | Dependência |
|----|------|------|------------|-------------|
| **S-AUTH-01** | Backend/API | OTP **sem envio SMS** (só log/OTP fixo non-prod) — provider + envio real | P0 — Bloqueador | Conta SMS / provider |
| **S-AUTH-02** | Backend/API | Google OAuth: só passenger + envs vazios por defeito; staging A2-02 | P2 — Melhoria importante | Credenciais staging/prod |
| **S-NOTIF-01** | Cross-app | Push notifications (FCM/APNs) — **sem** implementação no backend | P0 — Bloqueador | MOBILE / contas push |
| **S-NOTIF-02** | Cross-app | SMS transaccionais (oferta/viagem) além de OTP | P2 — Melhoria importante | S-AUTH-01 |

### Compliance / documentos

| ID | Área | Item | Prioridade | Dependência |
|----|------|------|------------|-------------|
| **S-COMP-01** | Partner/Frota | `ENABLE_VEHICLE_COMPLIANCE_GATES=False` — activar só após dados reais (assign veículos/docs) | P1 — Necessário para fechar produto | Auditoria frota + decisão |
| **S-COMP-02** | Partner/Frota | PF3D-4 UX rica + PF3D-5 admin override (docs) | P2 — Melhoria importante | S-COMP-01 |
| **S-COMP-03** | Driver | Gate documentos motorista OFF (localStorage) — política produto | P2 — Melhoria importante | Decisão ops |
| **S-COMP-04** | Segurança/Compliance | Requisitos Lei 45/2018 (59/2026) + matriz impacto 2026-09-04 → blockers M2 | P0 — Bloqueador | A3-REV · IMT |
| **S-COMP-05** | Segurança/Compliance | Suspensão automática por docs — **só** após validação legal | P2 — Melhoria importante | S-COMP-04 |

### Matching / B2

| ID | Área | Item | Prioridade | Dependência |
|----|------|------|------------|-------------|
| **S-B2-01** | Backend/API | B2 lifecycle (accept→queued, promote, PI) atrás de flag | P2 — Melhoria importante | Decisões B2 já feitas |
| **S-B2-02** | Backend/API | B2 matching janela ETA 12 min | P2 — Melhoria importante | S-B2-01 |
| **S-B2-03** | Driver | UI current+next trip + Pax msg/cancel B2 | P2 — Melhoria importante | S-B2-01 |
| **S-MATCH-01** | Backend/API | Redispatch **imediato** pós-reject (hoje cron/TTL) | P3 — Pós-MVP | — |

### Mobile / distribuição

| ID | Área | Item | Prioridade | Dependência |
|----|------|------|------------|-------------|
| **S-MOB-01** | Cross-app | Spike packaging Android/iOS (PWA/wrapper/Capacitor) — **MOBILE-001** | P0 — Bloqueador | Decisão caminho |
| **S-MOB-02** | Cross-app | Validar GPS background, push, permissões, Waze/Maps, login, lojas | P1 — Necessário para fechar produto | S-MOB-01 |
| **S-MOB-03** | Cross-app | `VITE_APP_DOWNLOAD_URL` / landing stores | P2 — Melhoria importante | S-MOB-02 |

### Produto Driver / Passenger / Partner / Admin

| ID | Área | Item | Prioridade | Dependência |
|----|------|------|------------|-------------|
| **S-DRV-01** | Driver | Preço líquido motorista + fórmula (Manel) | P1 — Necessário para fechar produto | BUSINESS / comissão |
| **S-DRV-02** | Driver | Afinação nav Waze/Maps + NAV-ROUTE-STOPS | P2 — Melhoria importante | — |
| **S-DRV-03** | Driver | Gaps menu/rendimentos/historial/categorias vs PDF Manel | P1 — Necessário para fechar produto | Manel Q6 |
| **S-PAX-01** | Passenger | Copy/clareza pagamento real vs mock na demo comercial | P1 — Necessário para fechar produto | S-PAY-01 |
| **S-PRT-01** | Partner/Frota | Payouts/receitas Partner ainda não Stripe (copy honesta) | P1 — Necessário para fechar produto | S-PAY-03 |
| **S-ADM-01** | Admin | `POST …/drivers/{id}/approve\|reject` | **DONE** (E5 · #544) | — |
| **S-ADM-02** | Admin | Rastos R-ADMIN-ORPHAN / R-AGORA-SNAP / reassign copy | P3 — Pós-MVP | — |

### Negócio / marca / IP / demo

| ID | Área | Item | Prioridade | Dependência |
|----|------|------|------------|-------------|
| **S-BIZ-01** | Documentação/Operação | Validar hipóteses custos/comissões/simulador (**BUSINESS-MANEL-001**) | P0 — Bloqueador | Contabilista/financeiro |
| **S-BIZ-02** | Documentação/Operação | Fechar comissão real (15/12/20 = exemplos) + tarifário | P1 — Necessário para fechar produto | S-BIZ-01 |
| **S-BRD-01** | Cross-app | Decisão logo (shortlist local) + troca controlada em `public/brand` | P1 — Necessário para fechar produto | Francisco/Manel |
| **S-IP-01** | Segurança/Compliance | Titularidade código/design/marca/contas/domínios | P1 — Necessário para fechar produto | Francisco |
| **S-IP-02** | Segurança/Compliance | Origem/licença logos + pesquisa/registo marca | P2 — Melhoria importante | S-IP-01 |
| **S-DEM-01** | Documentação/Operação | Demo Manel 2 — smoke pré-demo + execução Setembro | **DONE** (2026-09-01 · prod) | [`DEMO_MANEL_2_SETEMBRO.md`](ops/DEMO_MANEL_2_SETEMBRO.md) |

### Infra / qualidade / higiene

| ID | Área | Item | Prioridade | Dependência |
|----|------|------|------------|-------------|
| **S-OPS-01** | Infra/DevOps | Checklist ops pós-férias: secrets, SSD, `main` tip, prod health | P0 — Bloqueador | Humano |
| **S-OPS-02** | Infra/DevOps | Staging OAuth / smoke staging (TVDE-STG / A2-02) | P2 — Melhoria importante | Envs staging |
| **S-OPS-03** | Infra/DevOps | Drill restore backup Postgres (runbook existe; execução recorrente) | P1 — Necessário para fechar produto | Render |
| **S-OPS-04** | Infra/DevOps | Observabilidade: confirmar Sentry prod FE/BE cobertos | P2 — Melhoria importante | — |
| **S-QA-01** | Testes/QA | Suite E2E/regression smoke comercial pré-piloto | P1 — Necessário para fechar produto | S-PAY-01 opcional |
| **S-QA-02** | Testes/QA | Testes em telemóveis reais (pós packaging) | P1 — Necessário para fechar produto | S-MOB-02 |
| **S-HYG-01** | Cross-app | Remover/limitar mock GPS prod `?demo=1&sim=1` se risco comercial | P2 — Melhoria importante | — |
| **S-HYG-02** | Cross-app | Dead code: `driverHomeFeatures` two-step false; ramos `!driverBottomNav`; DebugMapPage | P3 — Pós-MVP | — |
| **S-HYG-03** | Infra/DevOps | CI Node 20 warning; limpeza branches locais | P3 — Pós-MVP | — |

---

## 4. Verificações especiais

| Tema | Resultado |
|------|-----------|
| Funcionalidades incompletas | B2 (só schema); Connect; SMS; push; MB WAY |
| Mocks/placeholders expostos | `STRIPE_MOCK` política piloto; `pi_mock_*`; GPS `?demo&sim`; OTP fixo non-prod |
| Código morto a remover | Ramos bottom-nav legacy; DebugMapPage — limpeza P3 |
| Gaps FE/BE | UI pagamento depende de flags; Partner revenue sem payout real; B2 sem UI |
| Stripe | Authorize/capture/webhook OK em código; **live + Connect pendentes** |
| Persistência estados | ActiveTrip restore Pax/Driver **OK** (código + smoke) |
| Admin | Operacional OK; approve/reject drivers **DONE** (E5); não é dispatcher do dia |
| Partner/Frota | Operacional OK; PF3D OFF *(implementação pendente — A3-D03-REV1 exige gates M2)* |
| Docs/KYC | Superfícies existem; gates OFF; OCR fora de scope |
| Notificações | Inbox Partner↔Driver **OK**; **push/SMS real PENDENTE** |
| Segurança | Auth JWT/OTP; Google parcial; driving-hours compliance ON + enforcement OFF (A3.8) — **meta M2 = A3-D04-REV1** |
| Observabilidade | Sentry FE condicional; health Admin |
| Backups/restore | Runbook `TVDE_BKP_RUNBOOK.md` — execução humana recorrente |
| Staging/produção | Prod Render live; staging OAuth/smoke ainda pendente |
| E2E | Playwright presente (flows principais) |
| Mobile | Sem Capacitor/stores — D0 HÍBRIDO; package = M2 |
| Deploy | CI verde em merges M1 (#543/#544); deploy Render existente |
| Dados/config prod | Secrets fora repo; Stripe live não ligado |
| Docs ops | Ricos; tip alinhado `e556a3b` / M1 DONE |
| Preparação comercial / piloto real | **M2** — live pay + SMS + mobile Android + validação negócio/legal |
| **Marco 1 técnico** | **DONE** (G3.1 2026-09-03) |

---

## 5. Totais

### Por prioridade

| Prioridade | Contagem |
|------------|----------|
| **P0 — Bloqueador** | **10** |
| **P1 — Necessário para fechar produto** | **16** |
| **P2 — Melhoria importante** | **14** |
| **P3 — Pós-MVP** | **4** |
| **Total pendências reais** | **44** |

### Por área (subtotais)

| Área | Contagem |
|------|----------|
| Passenger | 2 |
| Driver | 4 |
| Partner/Frota | 4 |
| Admin | 2 |
| Backend/API | 12 |
| Infra/DevOps | 5 |
| Testes/QA | 2 |
| Segurança/Compliance | 4 |
| Documentação/Operação | 3 |
| Cross-app | 6 |

*(Alguns IDs partilham área “Backend” e impacto multi-app — contagem por classificação principal acima.)*

---

## 6. Índice de execução até ao final

Ordem técnica/operacional para chegar a: **TVDE-APP tecnicamente concluída e preparada para operação/produção**.

### ETAPA 01 — Retoma e higiene operacional
- **Objectivo:** Confirmar tip, secrets, prod health, painel alinhado.
- **IDs:** S-OPS-01
- **Depende de:** —

### ETAPA 02 — Demo Manel 2 (âncora comercial Setembro) — **DONE**
- **Objectivo:** Smoke pré-demo + executar guião núcleo seguro.
- **IDs:** S-DEM-01 (**DONE**) · (S-PAX-01 copy se mock ainda ON — fora do fecho desta etapa)
- **Depende de:** ETAPA 01
- **Resultado:** DEMO **PASS** em produção (2026-09-01) — 4 papéis + fluxo principal; 0 novos bloqueadores; 0 novas decisões de produto. Ver [`DEMO_MANEL_2_SETEMBRO.md`](ops/DEMO_MANEL_2_SETEMBRO.md) §9.

### ETAPA 03 — Validação negócio e legal (papel)
- **Objectivo:** Fechar hipóteses financeiras e obrigações DL 84/2026 que condicionam produto.
- **IDs:** S-BIZ-01 · S-BIZ-02 · S-COMP-04 · S-IP-01
- **Depende de:** ETAPA 01

### ETAPA 04 — Auth real (SMS OTP)
- **Objectivo:** Passageiro/motorista recebem OTP real fora de non-prod.
- **IDs:** S-AUTH-01
- **Depende de:** ETAPA 01

### ETAPA 05 — Pagamentos live (sem Connect ainda)
- **Objectivo:** Cobrança real authorize/capture + webhook em prod; copy passageiro alinhada.
- **IDs:** S-PAY-01 · S-PAY-04 · S-PAY-06 · S-PAY-07 · S-PAX-01
- **Depende de:** ETAPA 03 (comissões/modelo) · ETAPA 01

### ETAPA 06 — Marketplace Connect + payouts
- **Objectivo:** Split plataforma/motorista(ou partner) + payouts operacionais.
- **IDs:** S-PAY-02 · S-PAY-03 · S-PRT-01 · S-DRV-01
- **Depende de:** ETAPA 05 · S-BIZ-02

### ETAPA 07 — Métodos PT (MB WAY/SIBS)
- **Objectivo:** Decidir e integrar caminho PT se obrigatório no MVP.
- **IDs:** S-PAY-05
- **Depende de:** ETAPA 05 · decisão Manel

### ETAPA 08 — Compliance frota (dados → flag)
- **Objectivo:** Dados mínimos de veículos/docs; só então considerar gates ON.
- **IDs:** S-COMP-01 · S-COMP-02 · S-COMP-03 · S-COMP-05
- **Depende de:** ETAPA 03 (legal) · decisão produto

### ETAPA 09 — Spike e packaging mobile
- **Objectivo:** Escolher PWA/wrapper/Capacitor e provar fluxos críticos em device.
- **IDs:** S-MOB-01 · S-MOB-02 · S-MOB-03 · S-QA-02 · S-NOTIF-01
- **Depende de:** ETAPA 04 (login) · preferível após ETAPA 05

### ETAPA 10 — Notificações push (+ SMS ops)
- **Objectivo:** Ofertas/estado viagem sem depender só de poll/UI aberta.
- **IDs:** S-NOTIF-01 · S-NOTIF-02
- **Depende de:** ETAPA 09 (para mobile) · pode iniciar BE em paralelo após ETAPA 04

### ETAPA 11 — Fecho produto Driver (piloto)
- **Objectivo:** Líquido, categorias MVP, gaps menu/historial alinhados a Manel.
- **IDs:** S-DRV-01 · S-DRV-03 · S-DRV-02
- **Depende de:** ETAPA 06 · respostas Manel

### ETAPA 12 — Marca e IP
- **Objectivo:** Logo de produção decidido; titularidades inventariadas.
- **IDs:** S-BRD-01 · S-IP-01 · S-IP-02
- **Depende de:** ETAPA 03 (parcial)

### ETAPA 13 — B2 next-trip (opcional pós-núcleo comercial)
- **Objectivo:** Ligar writers/UI atrás de flag; activar só com decisão.
- **IDs:** S-B2-01 · S-B2-02 · S-B2-03
- **Depende de:** ETAPA 05 (PI) · decisão Francisco

### ETAPA 14 — Hardening Admin / matching / higiene
- **Objectivo:** Redispatch; limpar mocks arriscados e dead code (S-ADM-01 approve/reject = **DONE** E5).
- **IDs:** S-ADM-02 · S-MATCH-01 · S-HYG-01 · S-HYG-02 · S-AUTH-02
- **Depende de:** Núcleo comercial (ETAPAS 05–06)

### ETAPA 15 — Infra, backup, staging, QA comercial
- **Objectivo:** Restore drill, staging smoke, E2E comercial, observabilidade.
- **IDs:** S-OPS-02 · S-OPS-03 · S-OPS-04 · S-QA-01 · S-HYG-03
- **Depende de:** ETAPAS 05–11 (quanto mais cedo melhor para S-OPS-03)

### ETAPA FINAL — Pronto para operação comercial
- **Objectivo:** Checklist go-live: live pay + OTP + push/mobile path + compliance acordada + demo/piloto documentado + backups OK.
- **IDs:** todos P0 + P1 críticos das etapas 04–12 e 15
- **Depende de:** ETAPAS 01–12 e 15 (13–14 conforme decisão)

---

## 7. Cinco maiores bloqueadores (agora)

1. **S-PAY-01 / S-PAY-02** — Sem Stripe live + Connect, não há operação comercial com dinheiro real nem split motorista.  
2. **S-AUTH-01** — OTP sem SMS real impede onboarding sério fora de ambientes com OTP fixo.  
3. **S-MOB-01 / S-NOTIF-01** — Sem packaging mobile + push, adopção motorista/passageiro fica presa ao browser.  
4. **S-BIZ-01 / S-BIZ-02** — Sem validação de comissão/tarifário, Connect e “preço líquido” não fecham.  
5. **S-COMP-04** (+ eventual **S-COMP-01**) — Obrigações legais/compliance frota condicionam o que a app pode prometer e activar.

---

## 8. Nota de retoma

- Backup SSD pré-férias: **não** comparado nesta análise (conforme pedido).  
- Não activar B2 / Stripe live / Capacitor **só** porque estão nesta lista — cada um exige decisão explícita.  
- **Excepção documental 2026-09-04:** PF3D/gates e enforcement 10h/24h são **obrigatórios para M2** (A3-D03-REV1 / A3-D04-REV1); flag OFF actual = **implementação pendente**, não “produto decide OFF”.  
- **ETAPA 01** e **ETAPA 02** concluídas (2026-09-01). **M1 DONE** — não reabrir.

---

**Frase:** **M1 técnico DONE** (não reaberto). M2 = piloto real (`READY FOR REAL PILOT`) com **12 blockers legais** (IMT, bloqueio, 10h/24h, emergência, licença plataforma) + live pay + SMS + mobile — sem reescrever as apps.
