# PROXIMA_SESSAO.md — Handoff

Contexto curto para a próxima sessão. **Lista operacional:** painel **PRÓXIMA SESSÃO** em [`TODOdoDIA.md`](../../TODOdoDIA.md).

**Histórico completo (fechos Abril–Maio, Seções A–E):** `C:\dev\_archives\APP\docs-2026-06\lote-3\PROXIMA_SESSAO.md`

**Plano operacional Julho:** [`FORWARD_PLAN_2026-07.md`](../ops/FORWARD_PLAN_2026-07.md)

---

## Contexto actual (**2026-08-07** — tip `c22331d` · **pré-férias** · MODO FÉRIAS **OFF**)

### Modo operacional

| Fase | Estado |
|------|--------|
| **Agora** | **Pré-férias** — PC principal activo |
| **MODO FÉRIAS** | **OFF** até gatilho 13/14 ago |
| **Modelo** | [`MODO_FERIAS_2026.md`](../ops/MODO_FERIAS_2026.md) |

### Checkpoint Git

| Item | Estado |
|------|--------|
| **`main`** | `c22331d` (#534 MODO FÉRIAS docs) |
| **origin/main** | alinhado |
| **prod build** | ≥ `c4690ea` Recusar |
| **working tree** | sync docs limpeza leve MJ por commit |
| **API prod (Render)** | Live; #504/#507 aplicados |
| **CI** | verde em `main` |

### Calendário

| Item | Estado |
|------|--------|
| Até ~13 ago | PC principal = máquina normal |
| **13/14 ago** | Gatilho: refresh SSD + cifrar `TVDE_SECRETS` + confirmar MJ → **MODO FÉRIAS ON** |
| Férias | **14–31 agosto** — portátil MJ activo · GitHub verdade · SSD backup cifrado |
| **DEMO MANEL 1** | **COMPLETA** |
| **DEMO MANEL 2** | **Setembro** — guião [`DEMO_MANEL_2_SETEMBRO.md`](../ops/DEMO_MANEL_2_SETEMBRO.md) |

### Foco (1 carril) — pré-férias

1. Operação normal no PC (sem abrir frentes grandes)  
2. Kit viagem: **cifrar `TVDE_SECRETS` (pendente)** · no 13/14 **actualizar SSD**  
3. Em férias: branches pequenas + push · docs/FE leve · prod no browser  
4. Pós-férias: reconciliar branches no PC · smoke · fechar modo  

**Fora:** B2 ON · Stripe live · PF3D · Docker/backend no portátil MJ · desinstalar ou mexer VPN/Office/OneDrive/Power BI/Autenticação.Gov/Brother.

### Pré-férias — risco / kit

| Feito | Falta (antes viagem) |
|-------|----------------------|
| SSD clone + secrets fora repo (#530) | **Cifrar `TVDE_SECRETS`** (pendente) |
| Portátil MJ smoke leve (#531) | Refresh SSD **13/14** + tip alinhado |
| Guião Manel 2 (#532) · checklist (#533) · MODO FÉRIAS doc (#534) | Entrada oficial MODO FÉRIAS |
| Limpeza leve portátil MJ (**2026-08-07**) | Opcional: PhoneExperienceHost via Definições |

Canónico: [`MODO_FERIAS_2026.md`](../ops/MODO_FERIAS_2026.md) · detalhe SSD: [`SSD_FERIAS_READINESS.md`](../ops/SSD_FERIAS_READINESS.md).  
Se PC falhar: **GitHub + prod + SSD** — sem backend local no MJ.

### SSD / férias — checkpoints

#### A) Origem / SSD (**2026-08-04**)

| Item | Estado |
|------|--------|
| SSD (PC origem) | Disco **H:** |
| Clone | `H:\TVDE_BACKUP\APP` · `main` · tip então **`939b8a4`** · limpo |
| Secrets | Fora do repo: `H:\TVDE_SECRETS\` (`backend.env`, `web-app.env.local`) — **sem** envs dentro do clone |
| Cifragem | **Pendente** antes da viagem |

#### B) Portátil Maria João Claudino (**2026-08-05**) — smoke **leve PASS**

| Item | Estado |
|------|--------|
| Pessoa / PC | Maria João Claudino · Windows user **`claud`** (abreviatura de Claudino) |
| Hardware | Win 10 Home · i5-9300H · 8 GB RAM · C: ~92 GB livres · restauro «Antes TVDE Git Node» |
| SSD neste PC | Letra **D:** · repo `D:\TVDE_BACKUP\APP` · secrets `D:\TVDE_SECRETS` |
| Git | 2.55.0 · `safe.directory` para path SSD (dubious ownership resolvido) |
| Tip validado no clone | `939b8a4` (#529) — fazer `git pull` → tip ≥ `94b479a` |
| Node / npm | Node **v24.19.0** · usar **`npm.cmd`** (PowerShell Execution Policy bloqueia `npm`; **não** alterar policy) |
| Frontend | `npm.cmd install` **PASS** · `npm.cmd run build` **PASS** · `npm.cmd run dev` **PASS** |
| Proxy Vite | `ECONNREFUSED 127.0.0.1:8000` — **esperado** (backend local **não** corre) |
| Decisão | **Sem** Docker · **sem** backend local · críticos da Maria João **preservados** |

#### C) Limpeza leve portátil MJ (**2026-08-07**) — **PASS**

| Item | Resultado |
|------|-----------|
| Objectivo | Performance leve para férias — **não** workstation · **nada desinstalado** |
| Antes | ~0.7–1.2 GB RAM livre (8 GB) |
| Depois (pós-restart) | ~**3.43 GB** livres / 8.22 GB |
| Startup Apps | Redução de arranque |
| Chrome | Memory Saver / Poupança de memória **ON** · sem fechar à força · sem apagar dados/perfis |
| WPS | Continua instalado · tasks `WpsExternal_claud_*` + `WpsUpdateTask_claud` **off** · **não** mexer `\McAfee\WPS\` |
| Phone/CrossDevice | CrossDeviceService sumiu pós-restart · PhoneExperienceHost ~178 MB (opcional depois via Definições) |
| Preservado | VPN/OpenVPN · OneDrive · Office/M365 · Power BI · Brother · Autenticação.Gov/pteid · browsers |
| Decisão | Limpeza leve **fechada** · sem Docker · sem backend · sem limpeza profunda |

**Papel do portátil:** emergência / em férias = máquina activa **leve** · GitHub = fonte da verdade · não fonte única. Stack completa = PC fixo ou prod.

**Próximo humano:** até 13 = PC normal · **13/14** = refresh SSD + **cifrar `TVDE_SECRETS` (pendente)** → MODO FÉRIAS. Sem secrets em docs/chat.

### Driver Recusar oferta — bloco fechado (**PASS** 2026-08-03)

| PR | Tip (squash) | O quê |
|----|--------------|--------|
| [#521](https://github.com/frankbexxx/tvde/pull/521) | `0294842` | `reject_offer` com locks / revalidation |
| [#522](https://github.com/frankbexxx/tvde/pull/522) | `01d7fc1` | UI **Recusar** → API; **Silenciar** local/sessionStorage |
| [#523](https://github.com/frankbexxx/tvde/pull/523) | `c4690ea` | BETA location: sem `assigned` órfão após offer rejected |

| Smoke prod (pós-#523) | Resultado |
|-----------------------|-----------|
| Oferta: deslizar + Recusar + Silenciar | OK |
| `POST /driver/offers/{id}/reject` | **200** `{"status":"rejected"}` |
| Toast «Oferta recusada» · card some · Driver «À espera» / online | OK |
| Passenger | `requested` / searching; `driver_id=null`; **sem** «Motorista atribuído» |
| 3× `POST /drivers/location` | continua `requested`; ghost available = 0 |

**Conclusão:** feature pronta para demo/piloto controlado.  
**Residual (não bloqueante):** redispatch imediato pós-reject fora de scope — continua cron/TTL.

### Partner smoke pós-#517 (**PASS** 2026-07-31)

| Item | Estado |
|------|--------|
| PR | [#517](https://github.com/frankbexxx/tvde/pull/517) · `78fbd29` — labels PT + datas `formatDateTime` |
| Login Partner | **OK** |
| Home / KPIs | **OK** |
| Frota / lista | **OK** |
| Viagens / lista | **OK** |
| Detalhe viagem | **OK** — estado `Concluída` + datas legíveis (Criada / Início / Concluída / Atualizada) |
| Bottom nav / abertura detalhe | **OK** |
| Conclusão | **PASS** — pronto para demo operacional com Manel |
| Residual (não bloqueante) | `tripDetail.reassignUnavailable` / hint ainda com «`assigned`» literal — polish display-only futuro |

### DEMO_4_PAPEIS — smoke humano prod (**PASS** 2026-07-30)

| Item | Estado |
|------|--------|
| Runbook | [`DEMO_4_PAPEIS.md`](../ops/DEMO_4_PAPEIS.md) · PR [#511](https://github.com/frankbexxx/tvde/pull/511) · `3b429c2` |
| Health | **OK** |
| Logins | Passenger · Driver+online · Partner · Admin/SA — **OK** |
| Viagem | pedir → oferta → accept → start → ongoing (Pax) → complete → rating — **OK** |
| Partner | Home/KPIs · lista/estado frota · viagens/histórico — **OK** |
| Admin | Agora · Viagens/histórico · Saúde/ops leitura — **OK** |

### BUG-DEMO-1 — Driver detalhe Viagens (**fechado** #513)

| Campo | Valor |
|-------|--------|
| App | Driver |
| Zona | Menu → Viagens → Ver detalhe |
| Causa | Dialog `z-50` atrás do Sheet menu `z-[60]` |
| Fix | [#513](https://github.com/frankbexxx/tvde/pull/513) · `49509e2` — `overlayClassName` + content `z-[70]` scoped |
| Estado | **Concluído** — detalhe acima do menu; menu não fecha |

### #504 — privilegiados fora da password demo (fechado em prod)

| Item | Estado |
|------|--------|
| PR | [#504](https://github.com/frankbexxx/tvde/pull/504) · tip `c510154` |
| Deploy API | **Live** em `c510154` |
| Backfill Render Shell | **APPLIED** — `total=18` · `test=7` · `real=3` · `unchanged=8` |
| `real` phones | `+351900000000` · `+351955555502` · `+351924075365` |
| Smoke UI pós-backfill | **PASS** (S-504-A…E) |

| Smoke | Resultado |
|-------|-----------|
| **S-504-A** Frank / SA real | Login OK (password real) |
| **S-504-B** admin baseline + demo | Rejeitado |
| **S-504-C** partner baseline + demo | Rejeitado |
| **S-504-D** passenger demo | OK |
| **S-504-E** driver demo | OK |

### P-504-PWD — passwords próprias admin/partner baseline (**fechado em prod**)

| Item | Estado |
|------|--------|
| PR script | [#507](https://github.com/frankbexxx/tvde/pull/507) · `91a68f4` |
| Handoff P-504-PWD | [#508](https://github.com/frankbexxx/tvde/pull/508) · `61edcf8` |
| Script | `backend/scripts/set_privileged_baseline_password.py` |
| Render Shell | **APPLIED** em `+351900000000` (admin) e `+351955555502` (partner) |
| Output seguro | `role=admin is_test_account=False password_set=yes` · `role=partner is_test_account=False password_set=yes` |
| Smoke UI final | **PASS** |

| Smoke | Resultado |
|-------|-----------|
| Admin baseline + password própria | **OK** |
| Partner baseline + password própria | **OK** |
| Admin baseline + demo | **FAIL** |
| Partner baseline + demo | **FAIL** |
| Passenger demo | **OK** |
| Driver demo | **OK** |
| Frank SA | **OK** |

**Notas:** privilegiados **não** usam `TEST_ACCOUNT_PASSWORD`. Frank/SA não foi alterado neste passo. Passenger/Driver demo continuam operacionais. Sem passwords/hashes em docs.

### #509 — flake E2E Maps / geolocation (**fechado**)

| Item | Estado |
|------|--------|
| PR | [#509](https://github.com/frankbexxx/tvde/pull/509) · `e086743` |
| Fix | Poll com `syncDriverNearPickupForStart` antes de «Iniciar viagem» (browser + servidor) |
| CI | `web-e2e` verde na PR + `main` |

### Processo review (sem Bugbot)

| Item | Estado |
|------|--------|
| Bugbot / Cloud Agents / automações | **Desactivadas**; triggers apagados |
| Checklist revisão manual | [#505](https://github.com/frankbexxx/tvde/pull/505) · [`PR_REVIEW_CHECKLIST.md`](PR_REVIEW_CHECKLIST.md) |

### NAV / UX (fechado até NAV-3D.2) + integrity Admin

| Item | PR / tip | Estado |
|------|----------|--------|
| NAV-2C Partner Empty/Error | [#493](https://github.com/frankbexxx/tvde/pull/493) · `fe6bbe5` | **PASS** |
| NAV-3A Admin IA docs | [#494](https://github.com/frankbexxx/tvde/pull/494) · `5b5f85a` | **PASS** — [`AUDIT_ADMIN_NAV_IA_2026-07-28.md`](../ux/AUDIT_ADMIN_NAV_IA_2026-07-28.md) |
| NAV-3B Admin i18n | [#495](https://github.com/frankbexxx/tvde/pull/495) · `298bd10` | **PASS** + smoke prod |
| NAV-3C grupos Admin | [#496](https://github.com/frankbexxx/tvde/pull/496) · `9eff1e0` | **PASS** + smoke prod |
| NAV-3D.1 EmptyState Admin | [#497](https://github.com/frankbexxx/tvde/pull/497) · `7e0cbce` | **PASS** + smoke 3 janelas |
| NAV-3D.2 ErrorBanner Admin | [#500](https://github.com/frankbexxx/tvde/pull/500) · `a968c5f` | **PASS** |
| Handoff meta NAV-3D.2 | [#501](https://github.com/frankbexxx/tvde/pull/501) · `aa25cb2` | **PASS** — docs only |
| Admin demote/delete integrity | [#499](https://github.com/frankbexxx/tvde/pull/499) · `aa39a9f` | **PASS** — backend only |
| OTP verify rate-limit (phone) | [#502](https://github.com/frankbexxx/tvde/pull/502) · `7556fb2` | **PASS** |
| Privileged baseline / demo | [#504](https://github.com/frankbexxx/tvde/pull/504) · `c510154` | **PASS** + backfill + smoke prod |
| Privileged baseline passwords | [#507](https://github.com/frankbexxx/tvde/pull/507) · `91a68f4` | **PASS** — script + apply prod + smoke |
| Handoff P-504-PWD | [#508](https://github.com/frankbexxx/tvde/pull/508) · `61edcf8` | **PASS** — docs only |
| E2E Maps geo sync | [#509](https://github.com/frankbexxx/tvde/pull/509) · `e086743` | **PASS** |
| PR review checklist | [#505](https://github.com/frankbexxx/tvde/pull/505) · `641c0c7` | **PASS** — docs only |
| NAV-0 contrato 4 apps | [#489](https://github.com/frankbexxx/tvde/pull/489) | **PASS** — [`AUDIT_NAV_4APPS_2026-07-28.md`](../ux/AUDIT_NAV_4APPS_2026-07-28.md) |

**#499 (resumo):** bloqueia demote de driver e delete de user-driver com histórico de trips (`cannot_demote_driver_with_trips` / `cannot_delete_user_with_trips`) para preservar atribuição — `trips.driver_id` é `ON DELETE SET NULL`.

**Contrato Admin (intactos):** `?tab=` · `tripId` · `tripsList` · **sem** `?group=` · Admin **PT forçado** (`LocaleProvider`).

**Smoke visual (processo):** preferir `Admin → Grupo → Tab` em **3 janelas**; URL só validação técnica do contrato.

### Availability Guard (regra actual)

| Doc | Estado |
|-----|--------|
| [`AVAILABILITY_FORCE_ONLINE_SYNC_SMOKE_PASS_2026-07-26.md`](../ops/AVAILABILITY_FORCE_ONLINE_SYNC_SMOKE_PASS_2026-07-26.md) | **Caso A PASS** |
| [`AVAILABILITY_ACTIVE_TRIP_GUARD_SMOKE_PASS_2026-07-27.md`](../ops/AVAILABILITY_ACTIVE_TRIP_GUARD_SMOKE_PASS_2026-07-27.md) | **Caso B PASS** |

### B2 — next trip while ongoing (groundwork pré-férias **fechado**)

| Doc / PR | Estado |
|----------|--------|
| [`B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md`](../architecture/B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md) | **DIAG técnico** concluído |
| [`B2_PRODUCT_DECISIONS_2026-08-04.md`](../architecture/B2_PRODUCT_DECISIONS_2026-08-04.md) | Decisões V1 + estado groundwork (#525–#527) |
| [#525](https://github.com/frankbexxx/tvde/pull/525) | Decisões produto — Opção B · 1 queued · ETA 12 · PI na promoção |
| [#526](https://github.com/frankbexxx/tvde/pull/526) | Flags OFF: `ENABLE_NEXT_TRIP_CHAINING=False` · `NEXT_TRIP_MAX_PICKUP_ETA_MINUTES=12` · zero consumers |
| [#527](https://github.com/frankbexxx/tvde/pull/527) · `1671c9f` | **B2-SPIKE-BE-1** — `TripStatus.queued` + SM declarativa + `uq_trips_one_queued_per_driver` · zero writers |

| Residual (pós-férias) | Notas |
|-----------------------|--------|
| **B2-SPIKE-BE-2** | Lifecycle helpers sibling-aware (complete/cancel) |
| **B2-SPIKE-BE-3** | Accept → queued sem PI · promote no complete · PI só na promoção |
| **B2-MATCH-ETA** | Matching / janela ETA ≤ 12 min |
| **B2-UI-MIN** | Driver current+next · Pax mensagem + cancel |

**Runtime:** flag **OFF** · sem writers `queued` · comportamento actual idêntico.

### PF3D

| Doc | Estado |
|-----|--------|
| [`PF3D_3B_OFF_SMOKE_PASS_2026-07-27.md`](../ops/PF3D_3B_OFF_SMOKE_PASS_2026-07-27.md) | **3B/OFF smoke PASS** — #486 sem mudança operacional |
| [`PF3D_3B_GATE_MESSAGES_DIAG_2026-07-27.md`](../ops/PF3D_3B_GATE_MESSAGES_DIAG_2026-07-27.md) | **3B DIAG** (pré-implementação) |
| [`PF3D_3A_OFF_SMOKE_PASS_2026-07-26.md`](../ops/PF3D_3A_OFF_SMOKE_PASS_2026-07-26.md) | Smoke 3A/OFF **PASS** |
| [`PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md`](../ops/PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md) | Matriz / fases |

| Item | Estado |
|------|--------|
| **Availability Guard** | **PASS** (A+B) |
| **B2 groundwork** | **Fechado** (#525–#527) — schema inerte + flags OFF; lifecycle/UI **pós-férias** |
| **B2 ON / matching / UI** | **Não** — flag OFF; sem BE-2/BE-3 ainda |
| **PF3D gates** | OFF |
| **PF3D-3B** | Implementado (#486) + smoke OFF **PASS** |
| **#504 auth prod** | **Fechado** — deploy `c510154` + backfill + smoke S-504-A…E **PASS** |
| **P-504-PWD** | **Fechado** — #507 + apply Shell + #508 handoff + smoke UI **PASS** |
| **#509 e2e Maps** | **Fechado** — sync geo browser antes de «Iniciar viagem» |
| **#511 DEMO_4_PAPEIS** | **Fechado** — runbook + smoke humano prod **PASS** |
| **BUG-DEMO-1** | **Fechado** — #513 · `49509e2` (Dialog `z-[70]` acima Sheet) |
| **NAV-3D.2b** | **Fechado** — #515 · `dc66772` (Agora refresh ErrorBanner) |
| **#516 roadmap** | **Fechado** — `c0eb7b7` |
| **#517 Partner labels** | **Fechado** — `78fbd29` + smoke manual Partner **PASS** |
| **#518 docs Partner smoke** | **Fechado** — `aadc57d` |
| **#519 Driver nav labels** | **Fechado** — `eb3c929` (recolha/destino por fase) |
| **#520 week plan / MANEL 1** | **Fechado** — `aafe811` |
| **#521–#523 Driver Recusar** | **Fechado** — tip `c4690ea` · smoke prod **PASS** |
| **#525–#527 B2 groundwork** | **Fechado** — tip `1671c9f` · flag OFF · zero writers |
| **Partner mapa live** | Smoke **PASS** — polish residual depois |
| **ActiveTrip F5** | Smoke **PASS** — sem PR código esta semana |
| **DEMO MANEL 1** | **Completa** (2026-08) — real carro/telefone |
| **#505 review checklist** | **Fechado** — revisão manual sem Bugbot |
| **NAV-3D.2** | **Fechado** (#500) — Dashboard `{error}` + retry |
| **NAV-3E** | **Não** nesta fase |
| **Trips/Ops actions** | **Não** nesta linha |
| **PF3D-3 ON** | Bloqueado — atribuição real + smoke ON controlado só depois |
| **Render env / DB / migrations** | Intactos nesta documentação (#504 backfill + P-504-PWD já aplicados) |

**Frase de fecho:** Tip `c22331d`. **Pré-férias (MODO FÉRIAS OFF).** Limpeza leve MJ **PASS** (~3.4 GB RAM livre). Kit viagem: SSD refresh 13/14 + **cifrar `TVDE_SECRETS` (pendente)**. Em férias: portátil MJ + GitHub + branches. Sem B2/Stripe/PF3D/Docker MJ.

### Decisão produto (mantém-se + B2)

Admin ≠ dispatcher; **Atribuir** = recovery SA; assign diário → Partner fleet / matching. Ver [`BACKLOG_POST_PILOTO.md`](BACKLOG_POST_PILOTO.md).

**B2:** modelo **B (queued)** — decisões + config OFF + schema inerte em `main` (`1671c9f`). Lifecycle/matching/UI **pós-férias**. Ver [`B2_PRODUCT_DECISIONS_2026-08-04.md`](../architecture/B2_PRODUCT_DECISIONS_2026-08-04.md).

### Entregas recentes

| PR / tip | O quê |
|----------|-------|
| **MODO FÉRIAS doc** | [`MODO_FERIAS_2026.md`](../ops/MODO_FERIAS_2026.md) — ainda **OFF** |
| **#533** · `3aa2583` | Checklist final pré-férias / risco operacional |
| **#532** · `94b479a` | Guião DEMO MANEL 2 Setembro |
| **#531** · `c819a25` | Checkpoint portátil Maria João smoke leve |
| **#530** · `c276458` | Checkpoint SSD clone + secrets fora repo |
| **#529** · `939b8a4` | Runbook SSD/férias readiness |
| **#527** · `1671c9f` | B2-SPIKE-BE-1 — `TripStatus.queued` + unique partial index · zero writers |
| **#526** | B2-CONFIG — flags OFF + defaults 12 min · zero consumers |
| **#525** | B2 decisões produto V1 (docs) |
| **#523** · `c4690ea` | BETA location: sem assigned órfão após reject · smoke Recusar **PASS** |
| **#522** · `01d7fc1` | UI Recusar → `reject_offer`; Silenciar local |
| **#521** · `0294842` | `reject_offer` locking / revalidation |
| **#520** · `aafe811` | Docs DEMO MANEL 1 complete + week plan |
| **#519** · `eb3c929` | Driver nav labels por fase (recolha/destino) |
| **#518** · `aadc57d` | Docs Partner smoke PASS pós-#517 |
| **#517** · `78fbd29` | Partner status labels + datas demo · smoke manual **PASS** |
| **#516** · `c0eb7b7` | Roadmap pós DEMO smoke |
| **#515** · `dc66772` | NAV-3D.2b — Agora refresh ErrorBanner |
| **#514** · `c9a24c6` | Docs fecho BUG-DEMO-1 |
| **#513** · `49509e2` | BUG-DEMO-1 — detalhe Viagens Driver acima do menu Sheet |
| **#511** · `3b429c2` | Runbook demo 4 papéis + smoke humano prod **PASS** |
| **#510** · `526e08f` | Sync handoff + TODOdoDIA tip `e086743` |
| **#509** · `e086743` | E2E: sync browser geo antes de assert «Iniciar viagem» (Maps) |
| **#508** · `61edcf8` | Handoff meta fecho P-504-PWD |
| **#507** · `91a68f4` | Script set password privilegiados baseline + apply prod **PASS** |
| **#506** · `a61acfa` | Handoff meta fecho #504 |
| **#505** · `641c0c7` | Checklist revisão manual de PRs ([`PR_REVIEW_CHECKLIST.md`](PR_REVIEW_CHECKLIST.md)) |
| **#504** · `c510154` | Privilegiados fora da demo + backfill/smoke prod **PASS** |
| **#502** · `7556fb2` | OTP verify rate-limit por phone (não XFF) |
| **#499** · `aa39a9f` | Admin integrity — demote/delete com histórico de trips (backend) |
| **#501** · `aa25cb2` | Handoff meta após NAV-3D.2 |
| **#500** · `a968c5f` | NAV-3D.2 ErrorBanner Admin + retry (`admin-dashboard-error`) |
| **#498** · `4297332` | Handoff meta até NAV-3D.1 |
| **#497** · `7e0cbce` | NAV-3D.1 EmptyState Admin (Pending / Dados / Metrics) |
| **#496** · `9eff1e0` | NAV-3C grupos Admin + `adminNavGroups` |
| **#495** · `298bd10` | NAV-3B Admin i18n (`pt`/`en` `admin.json`) |
| **#494** · `5b5f85a` | NAV-3A IA Admin docs |
| **#493** · `fe6bbe5` | NAV-2C EmptyState/ErrorBanner Partner |
| **#492** / **#491** | NAV-2B/A pilots |
| **#490** / **#489** | NAV-1 labels · NAV-0 contrato 4 apps |
| **#486** + smoke 3B/OFF | [`PF3D_3B_OFF_SMOKE_PASS_2026-07-27.md`](../ops/PF3D_3B_OFF_SMOKE_PASS_2026-07-27.md) |
| B2-DIAG | [`B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md`](../architecture/B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md) |

### Em pausa / monitorizar

| ID | Notas |
|----|-------|
| **AVAIL-B2-NEXT-TRIP** | Groundwork #525–#527 OK · BE-2/3 · MATCH-ETA · UI **pós-férias** · flag OFF |
| **R-PARTNER-REASSIGN-COPY** | Hint reassign com `assigned` literal — display-only; pós-demo |
| **NAV-3D.3+ / NAV-3E** | Só se valer; **sem** Trips/Ops mutáveis / PageHeader |
| **PF3D-3B/ON** | Smoke ON controlado — opcional; **não** activar em prod global |
| **PF3D-3 ON** | Só após atribuição real + docs reais |
| **PF3B-UX-DRIVER-DETAIL** | Tabs / scroll Partner Detail — debt |
| **PF3B-UX-FOLLOWUP** | Lista → detalhe documentos |
| **OPS-UX-POLISH** | Mobile / densidades — não blocker |
| **ADMIN-OPS-UX** | Alinhar com NAV-3 (sem rewrite) |
| **CHORE-LINT-1** | Ruff 0.16 — baixa prioridade |
| **R-E2E-1** | Flake web-e2e — caso Maps mitigado em #509; monitorizar residual |
| **O-STRIPE-LIVE** | Futuro |
| **R-GIT-1** | Branches locais — **não apagar ainda** |
| **CI-MAINT-1** | Warning Actions Node 20 — baixa prioridade |

### O que fazer a seguir (ordem — 1 carril)

1. Até 13: PC normal · ver [`MODO_FERIAS_2026.md`](../ops/MODO_FERIAS_2026.md)  
2. **13/14:** refresh SSD + **cifrar `TVDE_SECRETS` (pendente)** + confirmar MJ → MODO FÉRIAS ON  
3. Em férias: branches + push · docs/FE leve · prod · registo operacional curto  
4. **Setembro:** smoke + **DEMO MANEL 2**  
5. Pós-férias: reconciliar no PC · depois B2-BE-2+ (flag OFF) · **não** B2/Stripe/PF3D ON em férias  


**Ambiente:** `scripts/windows/Open-TVDE-Dev-WT.bat`. Baseline: Pax `+351912345678` · Driver `+351911111111` · Admin SA `+351924075365` · Partner `+351955555502` (password própria) · Admin baseline `+351900000000` (password própria). Pytest: launcher seguro / BD local.

### Specs activas

| Área | Onde |
|------|------|
| PR review checklist (manual) | [`PR_REVIEW_CHECKLIST.md`](PR_REVIEW_CHECKLIST.md) |
| Demo 4 papéis (prod) | [`DEMO_4_PAPEIS.md`](../ops/DEMO_4_PAPEIS.md) |
| MODO FÉRIAS 2026 | [`MODO_FERIAS_2026.md`](../ops/MODO_FERIAS_2026.md) |
| SSD / férias readiness | [`SSD_FERIAS_READINESS.md`](../ops/SSD_FERIAS_READINESS.md) |
| DEMO MANEL 2 guião | [`DEMO_MANEL_2_SETEMBRO.md`](../ops/DEMO_MANEL_2_SETEMBRO.md) |
| Roadmap pós DEMO smoke (rascunho) | [`ROADMAP_POS_DEMO_SMOKE_2026-07-30.md`](../ops/ROADMAP_POS_DEMO_SMOKE_2026-07-30.md) |
| NAV-3A Admin IA / query | [`AUDIT_ADMIN_NAV_IA_2026-07-28.md`](../ux/AUDIT_ADMIN_NAV_IA_2026-07-28.md) |
| NAV-0 contrato 4 apps | [`AUDIT_NAV_4APPS_2026-07-28.md`](../ux/AUDIT_NAV_4APPS_2026-07-28.md) |
| PF3D-3B/OFF smoke PASS | [`PF3D_3B_OFF_SMOKE_PASS_2026-07-27.md`](../ops/PF3D_3B_OFF_SMOKE_PASS_2026-07-27.md) |
| PF3D-3B DIAG mensagens | [`PF3D_3B_GATE_MESSAGES_DIAG_2026-07-27.md`](../ops/PF3D_3B_GATE_MESSAGES_DIAG_2026-07-27.md) |
| B2-DIAG next-trip | [`B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md`](../architecture/B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md) |
| B2 decisões produto 2026-08-04 | [`B2_PRODUCT_DECISIONS_2026-08-04.md`](../architecture/B2_PRODUCT_DECISIONS_2026-08-04.md) |
| Availability Caso B PASS | [`AVAILABILITY_ACTIVE_TRIP_GUARD_SMOKE_PASS_2026-07-27.md`](../ops/AVAILABILITY_ACTIVE_TRIP_GUARD_SMOKE_PASS_2026-07-27.md) |
| Availability Caso A PASS | [`AVAILABILITY_FORCE_ONLINE_SYNC_SMOKE_PASS_2026-07-26.md`](../ops/AVAILABILITY_FORCE_ONLINE_SYNC_SMOKE_PASS_2026-07-26.md) |
| PF3D-3A/OFF smoke PASS | [`PF3D_3A_OFF_SMOKE_PASS_2026-07-26.md`](../ops/PF3D_3A_OFF_SMOKE_PASS_2026-07-26.md) |
| PF3D-DATA-1E re-audit | [`PF3D_DATA_1E_REAUDIT_AFTER_DEV_SEED.md`](../ops/PF3D_DATA_1E_REAUDIT_AFTER_DEV_SEED.md) |
| PF3D-0 compliance (decisão) | [`PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md`](../ops/PF3D_VEHICLE_DOCUMENT_COMPLIANCE.md) |
| PF3C smoke PASS | [`PF3C_VEHICLE_DOCUMENT_ALERTS_SMOKE_PASS_2026-07-24.md`](../ops/PF3C_VEHICLE_DOCUMENT_ALERTS_SMOKE_PASS_2026-07-24.md) |
| PF3 documentos (cadeia) | [`PARTNER_FLEET_3_VEHICLE_DOCUMENTS.md`](../ops/PARTNER_FLEET_3_VEHICLE_DOCUMENTS.md) |
| OPS-UX-1 smoke PASS | [`OPS_UX_1_SMOKE_PASS_2026-07-23.md`](../ops/OPS_UX_1_SMOKE_PASS_2026-07-23.md) |
| Checkpoint Partner-Fleet 2026-07-22 | [`CHECKPOINT_2026-07-22_PARTNER_FLEET.md`](../ops/CHECKPOINT_2026-07-22_PARTNER_FLEET.md) |
| Stripe / mock / 1B API | [`O_STRIPE_1_RUNBOOK.md`](../ops/O_STRIPE_1_RUNBOOK.md) §§9–10 |
| Pytest BD segura | [`BACKEND_PYTEST_SAFE.md`](../testing/BACKEND_PYTEST_SAFE.md) |
| Ops Julho | [`FORWARD_PLAN_2026-07.md`](../ops/FORWARD_PLAN_2026-07.md) |
| Painel vivo | [`TODOdoDIA.md`](../../TODOdoDIA.md) |

---

## Contexto anterior (**2026-07-28** — NAV-3A docs; depois NAV-3B→3D.1 na mesma linha)

Checkpoint evoluiu até `7e0cbce` (NAV-3D.1). Contrato Admin e smokes 3B/3C/3D.1 registados acima.

## Contexto anterior (**2026-07-27** — PF3D-3B OFF + B2 DIAG)

[`PF3D_3B_OFF_SMOKE_PASS_2026-07-27.md`](../ops/PF3D_3B_OFF_SMOKE_PASS_2026-07-27.md) · [`B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md`](../architecture/B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md)

## Contexto anterior (**2026-07-26** — PF3D-3A/OFF smoke PASS)

[`PF3D_3A_OFF_SMOKE_PASS_2026-07-26.md`](../ops/PF3D_3A_OFF_SMOKE_PASS_2026-07-26.md) — viagem completa com gates OFF.

## Contexto anterior (**2026-07-25** — DATA-1E / PF3C)

Re-audit local [`PF3D_DATA_1E_REAUDIT_AFTER_DEV_SEED.md`](../ops/PF3D_DATA_1E_REAUDIT_AFTER_DEV_SEED.md); PF3C PASS; PF3D-3 global bloqueado.

## Contexto anterior (**2026-07-23** — OPS-UX-1 PASS)

[`OPS_UX_1_SMOKE_PASS_2026-07-23.md`](../ops/OPS_UX_1_SMOKE_PASS_2026-07-23.md)

## Contexto anterior (**2026-07-22** — Partner-Fleet 3B)

[`CHECKPOINT_2026-07-22_PARTNER_FLEET.md`](../ops/CHECKPOINT_2026-07-22_PARTNER_FLEET.md)

---

## Seção F — Operação (resumo)

| Tema | Onde |
|------|------|
| Cron externo | [`CRON_JOB_ORG_INSTRUCOES.md`](../CRON_JOB_ORG_INSTRUCOES.md) |
| Smoke W1 prod | [`W1_PROD_SMOKE.md`](../ops/W1_PROD_SMOKE.md) |
| Launchers WT local | [`scripts/windows/README.md`](../../scripts/windows/README.md) |
| Stripe Fase A local | [`O_STRIPE_1_RUNBOOK.md`](../ops/O_STRIPE_1_RUNBOOK.md) |
| Fecho sessão | Testes → PR → actualizar [`TODOdoDIA.md`](../../TODOdoDIA.md) + este ficheiro |
| Validação PROD | [`A033_B_VALIDATION_HARDENING_PLAYBOOK.md`](../prompts/A033_B_VALIDATION_HARDENING_PLAYBOOK.md) |

---

## Seção G — Relatório / roadmap (resumo)

| Necessidade | Onde |
|-------------|------|
| Continuar amanhã | [`TODOdoDIA.md`](../../TODOdoDIA.md) + este ficheiro |
| Roadmap engenharia | [`TVDE_ENGINEERING_ROADMAP.md`](../architecture/TVDE_ENGINEERING_ROADMAP.md) |
| Backlog pós-piloto | [`BACKLOG_POST_PILOTO.md`](BACKLOG_POST_PILOTO.md) |
| TODO código | [`TODO_CODIGO_TVDE.md`](../TODO_CODIGO_TVDE.md) |

---

*Handoff curto. Painel vivo: TODOdoDIA.md.*
