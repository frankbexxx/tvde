# TODO do dia — TVDE

| Campo | Valor |
|-------|--------|
| **type** | PLAN (painel operacional) |
| **status** | ACTIVO |
| **updated** | 2026-10-24 |
| **owner** | Frank |
| **source_of_truth** | Estado operacional diário (GOV-DOC-002) |

Ficheiro **vivo** na raiz do repo. **Única fonte operacional diária** e handoff entre sessões ([`DOCUMENT_GOVERNANCE.md`](docs/meta/DOCUMENT_GOVERNANCE.md) · GOV-DOC-002/004). Handoff histórico: [`docs/archive/plans/PROXIMA_SESSAO.md`](docs/archive/plans/PROXIMA_SESSAO.md).

**Fecho de etapas:** mal uma entrega estiver em `main` (ou smoke feito), **actualizar este painel sem pedir confirmação**.

**Histórico completo (painéis Abril–Maio):** `C:\dev\_archives\APP\docs-2026-06\lote-3\TODOdoDIA.md`

### Formato dos painéis

`| ID | Item | Estado | Notas |`

**Estado (fixo):** Por iniciar · Em curso · Smoke pendente · Concluído · Bloqueado · N/A

**Prefixos:** **A-** auditoria/gates · **X-** EXTRA produto · **TW-** tweaks UX · **G-** screenshot matrix · **R-** rasto técnico · **O-** opcional · **S-** smokes prod · **F-** fixes pós-smoke · **T-** test infra · **DOC-** documentação/governance

---

## Normalização documental (GOV Fases 1–5)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **DOC-NORM-1** | Normalização documental Fases 1–5 | **Concluído** | 2026-10-11 · governance · archive · registers · external · audit refs |
| **DOC-NEXT-1** | Dossier jurídico **EXT-LEG-2026-10-11** | **Concluído** | Pacote **enviado 2026-10-14** (dossier+A1+A2) · aceitação mandato **pendente** · parecer **pendente** · [`README_ENVIO.md`](docs/external/sources/EXT-LEG-2026-10-11/README_ENVIO.md) |
| **DOC-NEXT-2** | Dossier fiscal **EXT-FIS-2026-10-12** | **Concluído** (preparação) | Dossier+A1–A3 **REVIEW** · Manel revisão visual · envio contabilista **pendente confirmação** · [`README_ENVIO.md`](docs/external/sources/EXT-FIS-2026-10-12/README_ENVIO.md) |
| **DOC-NEXT-3** | Dados internos Manel (O1–O3, O5) | Bloqueado | Bloqueia Q-EXT-INS-001 · ver [`EXTERNAL_CONSULTATIONS.md`](docs/registers/EXTERNAL_CONSULTATIONS.md) §3 |

---

## Painel — **Sincronização operacional STAGING** (**2026-10-22**)

Confronto código / PRs / smokes manuais STAGING. **PROD**, jurídico, fiscal, SMS OTP e Stripe **LIVE** mantêm-se abertos — não marcar como concluídos sem evidência.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **A2-02-1** | OAuth Google STAGING | **Concluído** | Console URIs + Render `GOOGLE_OAUTH_REDIRECT_URIS` (não `…_URLS`) · smoke login Google **PASS** 21/10 (ex. super_admin) · [`STAGING_A2-02_RUNBOOK.md`](docs/ops/STAGING_A2-02_RUNBOOK.md) |
| **A2-02-2** | Smokes assertivos STAGING | **Concluído** | **Fecho documental 22/10** · acta §8 runbook A2-02 · evidências #766 · OAuth 21/10 · #765 · #757–764 · #768 · #770/#771 · **sem novos testes** · ressalva partner (confirmação humana) |
| **A-STG-BASE** | Baseline STAGING (roster efectivo) | **Concluído** | Documental PR [#766](https://github.com/frankbexxx/tvde/pull/766) · **5 utilizadores efectivos** (decisão A+D) · [`DEV_BASELINE_ROSTER.md`](docs/testing/DEV_BASELINE_ROSTER.md) · [`ENV_SINGLE_REALITY.md`](docs/env/ENV_SINGLE_REALITY.md) |
| **A-ID-08** | Fase VI logout Admin | **Concluído** | STAGING + smoke **PROD PASS** **22/10** · PR [#765](https://github.com/frankbexxx/tvde/pull/765) · não reabre II-C |
| **A-ID-06** | Painel Conta PROD (acesso / listagem técnica) | **Concluído** | Smoke manual **21/10** · Passageiro → Conta → métodos · `test_passenger` (`+351912345678`) · listagem vazia = 0 identities (esperado) · **≠** validação visual da copy |
| **A-ID-06-UX** | Correcção UX lista vazia (II-C) | **Concluído** | STAGING smoke visual **PASS** **21/10** · PR [#768](https://github.com/frankbexxx/tvde/pull/768) · hard refresh · conta `test_passenger` · sem alteração a identities/BD |
| **A-ID-06-PROD-UX** | Smoke UX copy PROD | **Concluído** | Smoke visual **PASS** **22/10** · pós-bundle #768 em `tvde-app` PROD |
| **S-STRIPE-TEST** | Stripe TEST STAGING (pay / 3DS / reembolso) | **Concluído** | FINDINGS STRIPE-LIVE-01/02/03 fechados em TEST · PR [#764](https://github.com/frankbexxx/tvde/pull/764) UI reembolso Passageiro + Admin · smokes I′ / B4 F3 **PASS** 21/10 |
| **C1** | OTP SMS real (prod) | **Bloqueado** | `503 otp_auth_unavailable` · provider + go explícito — [`S-AUTH-01_OTP_SMS_DECISION.md`](docs/architecture/S-AUTH-01_OTP_SMS_DECISION.md) |
| **O-STRIPE-LIVE** | Stripe live / B1 | **Bloqueado** | Prod `STRIPE_MOCK=true` · parceiro + `sk_live_*` · [`ENV_SINGLE_REALITY.md`](docs/env/ENV_SINGLE_REALITY.md) |
| **DOC-NEXT-1** / **DOC-NEXT-2** | Consultas EXT-LEG / EXT-FIS | **Bloqueado** (externo) | Mandato / parecer jurídico e envio fiscal **sem fecho** — registo inalterado |
| **R-OAUTH-UX** | Mensagens OAuth R1–R4 (callback + associação) | **Concluído** | PR [#785](https://github.com/frankbexxx/tvde/pull/785) · merge `9dd4a5f5` · CI + Vitest **PASS** · deploy STG · **R5/R6** P3 **Por iniciar** · smoke manual STG **parcial** → painel **2026-10-24** **`S-R-OAUTH-UX`** |

---

## Painel — **A-ID-06 II-C STAGING** (**2026-10-24**)

Smokes funcionais **Fase II-C** no host STAGING (`test_passenger` + identidades Google QA). **≠** aprovação global PROD / go-live · **≠** OTP SMS · **≠** Stripe LIVE.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **A-ID-06-T1** | Listagem de identidades (Conta) | **Concluído** | STG **PASS** **24/10** · alinhado T1 **23/10** (#783) |
| **A-ID-06-T2** | Associar Google (Conta) | **Concluído** | STG **PASS** **24/10** · alinhado T2 **23/10** (#784) |
| **A-ID-06-T3** | Tornar principal (≥2 identities) | **Concluído** | STG **PASS** **24/10** · 2.ª Google QA associada · promovida a principal · identidade QA original reposta como primary · verificado na UI |
| **A-ID-06-T4** | Cancelar / revogar identity secundária | **Concluído** | STG **PASS** **24/10** · overflow confirmação corrigido PR [#787](https://github.com/frankbexxx/tvde/pull/787) · layout mobile validado · **Cancelar** manteve associação · **Confirmar revogação** removeu só a secundária · conta reposta (1× Google primary verificada) |
| **A-ID-06** | Fase II-C — fecho smokes STG T1–T4 | **Concluído** | Baseline código `7e13245e` · ver painel II-C abaixo · PROD: listagem/UX copy já registadas · gestão primary/revoke **≠** smoke PROD neste fecho |

---

## Painel — **S-R-OAUTH-UX** smokes STAGING (**2026-10-24**)

Validação manual pós-PR [#785](https://github.com/frankbexxx/tvde/pull/785) (R1–R4 implementados · CI/testes auto **PASS**). **≠** cobertura manual completa · **≠** bugs funcionais novos nesta ronda · cancelamento via callback Google (`?error=`) **≠** exercitado manualmente.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **S-R-OAUTH-M1** | Cancel login Google (copy + recuperação) | **Em curso** | **PARCIAL** **24/10** · selector Google sem «Cancelar» · regresso **Back** browser · **sem** `error=access_denied` · copy «Login Google cancelado…» **≠** validada |
| **S-R-OAUTH-M2** | Cancel associação Google (copy Conta) | **N/A** | **Não executado** (mesmo selector) · fluxo cancel associação → **Vitest** `GoogleOAuthCallback.flow.test` |
| **S-R-OAUTH-M3** | Cancel no formulário password pós-Google | **N/A** | **Dispensado** · não repetir associação só para este botão |
| **S-R-OAUTH-M4** | Callback incompleto + recuperação | **Concluído** | **PASS** **24/10** · `/auth/google/callback` sem params · «Código de autorização em falta.» · «Voltar ao início de sessão» → login · sem códigos técnicos |
| **S-R-OAUTH-UX** | Fecho ronda smokes manuais STG | **Em curso** | M4 **PASS** · M1 **PARCIAL** · **≠** PASS M1/M2 callback Google · residual opcional: reproduzir `?error=` se UI Google o permitir |

---

## Painel — **R-PAY-STG-4** pagamentos presos STAGING (**2026-10-24**)

Resolução operacional de **4** pagamentos locais antigos em `processing` (>10 min) com viagens **`cancelled`** — **2×** `pi_mock_*` + **2×** PIs Stripe TEST. **≠** reconciliação batch · **≠** `O-PAY-PR5` · **≠** prova de ausência global de órfãos PI (universo **`R-PAY-ORPHAN-PI`** / preview PR4). Runbook pagamentos: [`O_STRIPE_1_RUNBOOK.md`](docs/ops/O_STRIPE_1_RUNBOOK.md) §10–11 · acta A2-02 **§12**.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **R-PAY-STG-4a** | Close-mock admin (2× `pi_mock_*`) | **Concluído** | **24/10** · preview `count=2` · apply único · payments **`failed`** · trips **`cancelled`** · preview pós **`count=0`** · **sem** Stripe |
| **R-PAY-STG-4b** | Diagnóstico individual Stripe TEST (READ-ONLY) | **Concluído** | **24/10** · 2× PI **`canceled`** · `amount_received=0` · **≠** captura/reembolso · **B:** 0,50 € local vs 4,50 € PI — **registado, não corrigido** |
| **R-PAY-STG-4c** | Reconcile individual (2× viagens) | **Concluído** | **24/10** · dry-run **`dry_run_failed`** ×2 · apply **`updated_failed`** ×2 · auditoria `admin.reconcile_single_payment_stripe_terminal_failed` · **sem** ops financeiras Stripe |
| **R-PAY-STG-4** | Fecho STAGING (4 stuck → 0) | **Concluído** | Saúde STG: **`degraded`/4 stuck** → após 4a **`degraded`/2** → após 4c **`ok`/0** · baseline docs `7af3635f` · **≠** PROD · **≠** LIVE |

---

## Painel — **Fecho sessão** (**2026-10-23**)

Registo documental pós-merge **`9dd4a5f5`**. **≠** reconciliação financeira executada · T3/T4 **supersedidos** pelo painel **2026-10-24** (PASS STG).

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **TVDE-STG** | Cron STAGING (cron-job.org → `/cron/jobs`) | **Concluído** | PR [#782](https://github.com/frankbexxx/tvde/pull/782) · operacional · acta runbook A2-02 **§9** · saúde STG **`ok`** após **`R-PAY-STG-4`** **24/10** (§12) |
| **A-ID-06-T1** | Login Google STAGING (callback) | **Concluído** | PR [#783](https://github.com/frankbexxx/tvde/pull/783) · pending OAuth atómico |
| **A-ID-06-T2** | Adicionar Google (Conta) STAGING | **Concluído** | PR [#784](https://github.com/frankbexxx/tvde/pull/784) · callback com JWT · smoke STG **PASS** (`test_passenger` + QA Google) |
| **A-ID-06-T3** | Tornar principal (≥2 identities) | **Concluído** | Ver painel **2026-10-24** · STG **PASS** |
| **A-ID-06-T4** | Revogar identity não-primária | **Concluído** | Ver painel **2026-10-24** · STG **PASS** · #787 |
| **R-OAUTH-UX** | R1–R4 mensagens e navegação OAuth | **Concluído** | PR [#785](https://github.com/frankbexxx/tvde/pull/785) · ver linha painel **2026-10-22** |
| **S-R-OAUTH-UX** | Smoke manual cenários de erro OAuth | **Em curso** | Supersedido parcialmente pelo painel **2026-10-24** · M4 PASS · M1 parcial · ver **`S-R-OAUTH-UX`** |
| **X-SYSHEALTH-2-DIAG** | Diagnóstico `degraded` vs API offline (READ-ONLY) | **Concluído** | **23/10** · `degraded` = **4×** pagamentos `processing` >10 min (legado/smokes) · API/cron **OK** · **≠** Fase 2 produto |
| **R-PAY-STG-4** | Reconciliar 4 pagamentos STAGING presos | **Concluído** | Fecho ops **24/10** — ver painel **`R-PAY-STG-4` 2026-10-24** · acta [`STAGING_A2-02_RUNBOOK.md`](docs/ops/STAGING_A2-02_RUNBOOK.md) **§12** |
| **R-PAY-ORPHAN-PI-AUD** | Auditoria órfãos vs pagamentos locais presos | **Concluído** | **23/10** READ-ONLY · 4 stuck **≠** universo `orphan-payment-intents/preview` |

---

## Painel — **System Health Admin** (**2026-10-22**)

Fase 1 integrada em `main` · PR [#770](https://github.com/frankbexxx/tvde/pull/770) · merge `f12c294a` · CI backend / web-app / web-e2e **PASS** · smokes manuais **STAGING + PROD PASS** (22/10). **Sem migrations.** Matching, disponibilidade, compliance e recuperação administrativa **inalterados**.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **X-SYSHEALTH-1** | Fase 1 — alertas críticos vs informativos | **Concluído** | `warnings` = só críticos · offline prolongado → `informational_warnings` + lista com `is_test_account` · Admin Saúde/Agora · cron propaga contadores · secção **F5** em [`ROADMAP_FINAL_ENTREGA_TVDE_2026.md`](docs/ROADMAP_FINAL_ENTREGA_TVDE_2026.md) |
| **X-SYSHEALTH-2** | Fase 2 — indisponibilidade anómala | **Por iniciar** | Implementação produto (**F5.4**) · diagnóstico ops **`X-SYSHEALTH-2-DIAG` Concluído** **23/10** · causa STG `degraded` (4 stuck) **resolvida** **`R-PAY-STG-4`** **24/10** — **≠** F5.4 implementado |
| **S-SYSHEALTH-1-STG** | Smoke manual STAGING Saúde/Agora | **Concluído** | 22/10 · 4 pagamentos `processing` = **críticos** · `status=degraded` **correcto** · separação crítico/informativo **validada** · pós-**`R-PAY-STG-4`** **24/10:** STG **`ok`** / 0 stuck (revalidação ops, **≠** novo smoke formal) |
| **S-SYSHEALTH-1-PROD** | Smoke manual PROD Saúde/Agora | **Concluído** | 22/10 · `status=ok` · «Operacional» · 0 críticos · motorista Marly offline em **Informações** · badge **Conta demo** · **sem** recover admin |

---

## Painel — **Fiabilidade pagamentos (Fase 0)** (**2026-10-22**)

`main` @ `ef615599` (docs #780) · código PR3 @ `edc666cc` (#779) · spec [`PAYMENT_RELIABILITY_PHASE0_SPEC.md`](docs/runbooks/PAYMENT_RELIABILITY_PHASE0_SPEC.md). **Fase 0 PR1–PR4** em `main`; **PR3 técnico + fecho operacional STAGING (22/10)** registados abaixo. **Stripe TEST** em STAGING (`STRIPE_MOCK=false` confirmado no preflight); **PROD** pagamentos neste carril **não** validados. **Stripe LIVE**, PR5 e `ENABLE_PAYMENT_ANOMALY_PERSIST=true` **não autorizados**.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **A-PAY-PR1** | Persistência `payment_anomalies` (webhook not-found / mismatch) | **Concluído** | PR [#774](https://github.com/frankbexxx/tvde/pull/774) · merge `88e0d31b` · flag **`ENABLE_PAYMENT_ANOMALY_PERSIST=false`** (default) |
| **A-PAY-PR2** | Admin Saúde — bloco `payment_webhook_anomalies` | **Concluído** | PR [#775](https://github.com/frankbexxx/tvde/pull/775) · merge `3cf666d9` · CI PASS · smokes Saúde STG+PROD 22/10 |
| **A-PAY-PR3** | Webhook anti-regressão (Q1 B + Q2 A+B) | **Concluído** | PR [#779](https://github.com/frankbexxx/tvde/pull/779) · merge `edc666cc` · Q1 recovery auditada · Q2 bloqueio `succeeded→failed` · `FOR UPDATE` · savepoint anomalies · **80** testes locais + CI backend/web-e2e **PASS** |
| **S-PAY-PR3-STG-DEP** | Deploy STAGING pós-PR3 | **Concluído** | **22/10/2026** · STAGING Live · FastAPI arrancou · health HTTP **200** · deploy live @ `edc666cc` |
| **S-PAY-PR3-STG-PRE** | Preflight STAGING PR3 (read-only) | **Concluído** | **22/10/2026 PASS** · Superadmin `GET /admin/phase0` · `ENV=staging` · `stripe_mock=false` · `stripe_webhook_secret_set=true` · `beta_mode=false` · logs pós-deploy sem erros relevantes · **≠** prova whsec↔endpoint Stripe TEST · sem viagens/pagamentos/webhooks |
| **S-PAY-PR3-STG** | Smoke funcional PR3 em STAGING (webhooks assinados E2E) | **N/A** | **Dispensado nesta fase** (decisão ops 22/10) · **≠ PASS** · guards validados por **80** testes + CI · B-lite só com nova autorização |
| **A-PAY-PR4** | Detector órfãos PI — preview read-only (super_admin) | **Concluído** | PR [#776](https://github.com/frankbexxx/tvde/pull/776) · merge `fee08863` · **sem** cron · **zero** writes Stripe |
| **A-PAY-PR4-HF** | Hotfix `StripeObject.metadata` no preview órfãos | **Concluído** | PR [#777](https://github.com/frankbexxx/tvde/pull/777) · merge `820e4a33` · CI backend + web-e2e PASS |
| **S-PAY-PR4-STG** | Smoke manual STAGING preview órfãos (Admin Saúde) | **Concluído** | **22/10/2026** · `scan_status=ok` · **0** órfãos confirmados e **0** inconclusivos **na página/janela consultadas** · HTTP 500 pré-#777 **resolvido** · **≠** ausência global de órfãos na conta Stripe |
| **O-PAY-PR5** | Reconcile batch automático (cron) | **N/A** | **Q6 A — não autorizado** |
| **O-STRIPE-LIVE** | Stripe LIVE / B1 | **Bloqueado** | Prod `STRIPE_MOCK=true` · inalterado |
| **R-PAY-ORPHAN-PI** | Cancel/recover automático PI órfão aberto | **Por iniciar** | PR4 = preview manual (#776/#777) · auditoria **23/10** **`R-PAY-ORPHAN-PI-AUD`** · **4× processing STG** fechados **`R-PAY-STG-4`** **24/10** — **≠** universo órfãos PI |

**Limitações PR4 (registo):** só PIs com `metadata.trip_id` UUID válido entram na classificação TVDE; PIs externos ignorados; janela `window_days` ≤ 7 · grace ≥ 5 min; paginação cap **500**/run (`scan_status=partial` se `has_more`); atribuição conservadora (`confirmed_orphan` vs `inconclusive_*`).

---

## Painel — **Identidades de login / Fase II-C** (**2026-09-30**)

O painel Conta lista os métodos de início de sessão, muda a primary, revoga e adiciona Google. Sem password, a única acção é «Definir palavra-passe». Google não serve de step-up. Estas operações não mudam `token_version` nem o logout. Testes automatizados feitos. **A-ID-06:** PROD listagem técnica **validada** · UX copy STAGING/PROD **PASS** (#768 · 22/10). Fase VI logout Admin: **Concluído** STAGING + PROD **22/10**.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **A-ID-06** | Fase II-C gestão no perfil | **Concluído** (STG T1–T4) | **T1–T4 STG PASS** **24/10** (#783/#784/#787) · UX copy STG/PROD OK (#768) · **≠** smoke PROD primary/revoke · painel **2026-10-24** · não usar `09c539d1` nem `35ddb821` |
| **A-ID-08** | Fase VI logout / sessões | Concluído | STAGING + **PROD PASS** **22/10** · PR #765 · não reabre a II-C |

---

## Painel — **Identidades de login / Fase III** (**2026-09-30**)

A identity `bf19df73` foi movida para `09c539d1` e ficou não-primária. A origem `35ddb821` existe, ficou `blocked`, sem identities activas e sem email. O destino continua `super_admin` e `active`, com 2 identities activas e a primary original. Nenhum User foi apagado. Continuam 20 Users. O histórico ficou no dono. `oauth_google_sub` não foi alterado. II-C **PARCIAL** (painel **2026-10-21**); Fase VI smoke **PROD** **OPEN**.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **A-ID-07** | Fase III transferir identity | Concluído | **CLOSED** 2026-09-30 · PR #680 · transferência PROD HTTP 200 **PASS** · audit **PASS** · smoke Google humano **PASS** (`frankbex.dev@gmail.com` em Passageiro, sem onboarding nem linking) |
| **A-ID-06** | Fase II-C gestão no perfil | Em curso | Estado actual no painel Fase II-C / **2026-10-21** |
| **A-ID-08** | Fase VI logout / sessões | Smoke pendente | **Concluído STAGING** · smoke **PROD** pendente · PR #765 · painel **2026-10-21** · não reabre a II-B nem a III |

---

## Painel — **Identidades de login / Fase II-B** (**2026-09-29**)

A auth Google lê `user_identities`. Google desconhecido pede criar conta ou ligar com palavra-passe. Não há auto-link. `oauth_google_sub` não é lido nem escrito. Smoke prod **S-ID-01 CLOSED** (2026-09-29): `vamula.qa@gmail.com` é Google QA ligado à fixture `dev_admin`. A transferência de `35ddb821` fechou na Fase III, no painel acima. Logout no shell Admin é Fase VI e não reabre a II-B.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **A-ID-05** | Fase II-B leitura de identidades | Concluído | **CLOSED** · sem migration · escolha criar/ligar · prova curta · sem auto-link |
| **A-ID-06** | Fase II-C gestão no perfil | Em curso | Estado actual no painel Fase II-C / **2026-10-21** |
| **A-ID-07** | Fase III transferir identity | Concluído | Fechada no painel Fase III acima |
| **S-ID-01** | Smoke prod da II-B | Concluído | **CLOSED** 2026-09-29 · Google QA sem User novo · link à fixture `dev_admin` · login seguinte na mesma conta · contas intactas à data deste smoke |
| **A-ID-08** | Fase VI logout / sessões | Smoke pendente | **Concluído STAGING** · smoke **PROD** pendente · PR #765 · painel **2026-10-21** · não reabre a II-B |

---

## Painel — **Identidades de login / Fase II-A** (**2026-09-29**)

O espelho fica alinhado com `users` em cada escrita de email ou Google. O login, o onboarding e o linking não mudam. `oauth_google_sub` continua a ser a fonte legacy.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **A-ID-04** | Fase II-A dual-write | Concluído | **CLOSED** · backfill idempotente `c4d5e6f7a8b9` · auth ainda lê `users` · sem mudança de UX |
| **A-ID-05** | Fase II-B leitura de identidades | Concluído | Fechada no painel II-B acima |
| **A-ID-03** | Conta parcial `35ddb821` | N/A | Na II-A continuava no próprio User · transferência **CLOSED** na Fase III |

---

## Painel — **Identidades de login / Fase I** (**2026-09-29**)

`user_identities` existe como espelho. A autenticação continua a ler `users.email` e `users.oauth_google_sub`. A conta parcial `35ddb821` não foi fundida com `09c539d1`.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **A-ID-01** | Fase I `user_identities` | Concluído | **CLOSED** · tabela, checks, índices, backfill idempotente · revisão `b3c4d5e6f7a8` · auth ainda lê `users` |
| **A-ID-02** | Fase II leitura/escrita | Por iniciar | **OPEN** · repetir o backfill antes de mudar login, onboarding e linking |
| **A-ID-03** | Conta parcial `35ddb821` | N/A | Na Fase I não foi ligada nem apagada · estado actual no painel Fase III |

---

## Painel — **Play Internal Testing** (**2026-09-28** — PR #674)

App na Play, Internal Testing activo, build instalada no Oppo pela Play. Smoke dessa build **PASS**. GPS background continua aberto. S-MOB-02 continua **PARTIAL**.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **S-NOTIF-01** | Push global V1 Android | Concluído | **CLOSED** · APNs por fazer |
| **S-MOB-02** | Android no Oppo | Em curso | **PARTIAL** · falta preparação de Production e GPS background |
| **O-PLAY-02** | Internal Testing | Em curso | **INTERNAL TESTING ACTIVE / SMOKE PASS** · `VAMULÁ 1.0 Internal 1` · versionCode 1 · versionName 1.0 · https://play.google.com/apps/internaltest/4701587799723936774 |
| **O-PLAY-03** | Smoke build Play | Concluído | **PASS** · login Google `frankbexxx@gmail.com` · sessão e contexto Passageiro · sem onboarding · sem segundo telefone |

---

## Painel — **Play Store preflight** (**2026-09-28**)

Signing de release preparado no repo, sem keystore e sem publicação. GPS background continua aberto.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **S-NOTIF-01** | Push global V1 Android | Concluído | **CLOSED** · APNs por fazer |
| **S-MOB-02** | Android no Oppo | Em curso | **PARTIAL** · Play Store = READY FOR HUMAN CONSOLE SETUP / INTERNAL TESTING · GPS background aberto |
| **O-PLAY-01** | Upload key + Play Console | Por iniciar | Chave ainda não criada · sem upload · ver `docs/android/PLAY_STORE_PREFLIGHT.md` |

---

## Painel — **Push P3 / estados ao passageiro** (**2026-09-28** — PR #673)

Smoke no Oppo. Foreground sem navegação. Background e processo fechado sem force-stop. O toque abre `/passenger`. Sessão mantida. Viagem terminal não volta a activa.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **S-NOTIF-P3** | Passenger Push | Concluído | **CLOSED** · `accepted` `arriving` `ongoing` `completed` `cancelled` `failed` · sem `requested` `assigned` `queued` · `failed` sem `emit` fica de fora |
| **S-NOTIF-01** | Push global | Concluído | **CLOSED** V1 Android · oferta ao motorista + estados ao passageiro · APNs por fazer |
| **S-MOB-02** | Android no Oppo | Em curso | **PARTIAL** · aberto só: GPS background, Play Store |

---

## Painel — **Push P2 / oferta ao motorista** (**2026-09-27** — PR #671)

Smoke no Oppo. App em background e processo fechado sem force-stop. O toque abre `/driver` com o cartão da oferta. Sessão mantida. Sem auto-aceite. Oferta expirada desaparece.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **S-NOTIF-P2** | Driver Offer Push | Concluído | **CLOSED** · background e processo fechado · cartão Aceitar · sessão · sem auto-aceite · expirada desaparece |
| **S-NOTIF-01** | Push global | Em curso | **PARTIAL** · falta notificações ao passageiro |
| **S-MOB-02** | Android no Oppo | Em curso | **PARTIAL** · Push P2 **CLOSED** · aberto: notificações ao passageiro, GPS background, Play Store |

---

## Painel — **Push P1 / foundation** (**2026-09-27**)

Infraestrutura FCM e ciclo de vida do token. Sem ofertas nem estados de viagem.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **S-NOTIF-P1** | Push P1 / foundation | Concluído | **CLOSED** · registo, logout e novo login no Oppo · canal `Viagens` · sem oferta real |
| **S-NOTIF-01** | Push global | Em curso | **PARTIAL** · oferta ao motorista **CLOSED** em P2 · falta notificações ao passageiro |
| **S-MOB-02** | Android no Oppo | Em curso | **PARTIAL** · Push P2 **CLOSED** · aberto: notificações ao passageiro, GPS background, Play Store |

---

## Painel — **S-MOB-02 navegação e ficheiros** (**2026-09-26** — PR #669)

Smoke no Oppo contra a API de produção. Sem merge.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **S-MOB-02** | Android no Oppo | Em curso | **PARTIAL** · Waze/Maps **CLOSED** · file picker **CLOSED** · aberto: push, GPS background, Play Store |
| **S-NAV** | Waze na recolha e Maps no destino | Concluído | **CLOSED** · fora do WebView · PR #669 |
| **S-FILE** | File picker Android | Concluído | **CLOSED** · DocumentsUI · upload de teste aceite |

---

## Painel — **GOOGLE IDENTITY LINKING** (**2026-09-26**)

Passageiro é capacidade base. `User.role` continua o papel elevado. Esta fase não abre a vista Passageiro a Admin ou Partner.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **GOOG-LINK** | Ligar Google à conta existente | Concluído | **CLOSED** · email auto-link só em passenger/driver/partner · admin/super_admin pede palavra-passe na primeira vez |
| **GOOG-MULTI** | Vista Passageiro para qualquer User activo | Concluído | **CLOSED** · Passenger is a base capability for any active User · o contexto não muda `User.role` |
| **GOOG-SMOKE-B** | Conta Passageiro extra do smoke PROD | Concluído | **CLOSED** · sub só na conta real · conta de smoke bloqueada |

---

## Painel — **GOOGLE PASSENGER ONBOARDING** (**2026-09-25** — branch `feat/google-passenger-onboarding`)

Smoke Oppo CPH2689 contra a API de staging. PROD não foi alterada.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **GOOG-ONB** | Google Passenger Onboarding | Concluído | **CLOSED** · staging `a63993c` · sessão só depois de nome, +351 e termos |
| **OAUTH-CAP** | OAuth Capacitor | Concluído | **CLOSED** · nonce alinhado · segundo login sem onboarding |
| **S-MOB-02** | Android no Oppo | Em curso | **PARTIAL** · aberto: push, GPS background, Play Store · Waze/Maps e file picker **CLOSED** em 2026-09-26 |

---

## Painel — **LATERAL AUDIT RECONCILE** (**2026-09-21** — tip `98ed421`)

P0/P1 originais desta auditoria: **OPEN = 0**. Follow-ups **não** reabrem findings.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **L-PAY-01** | Webhook TX + 5xx BD | Concluído | #606 |
| **L-PAY-02** | ACK 200 not-found / mismatch | Concluído | **ACCEPTED DESIGN** · #634 · `O-PAY-WEBHOOK-ANOMALY` |
| **L-PAY-03** | Cancel fail-closed | Concluído | #628 · `R-PAY-ORPHAN-PI` |
| **L-TRIP-01** | Commit antes de WS offers | Concluído | #616 |
| **L-GPS-01** | Remover find-driver | Concluído | #617 |
| **L-GPS-02** | Debug matching owner aggregate | Concluído | #617 |
| **L-AUTH-01** | ADMIN_PHONE promote/guards | Concluído | #630 / #632 · `R-AUTH-SUPERADMIN-BOOTSTRAP` |
| **L-FE-01** | Polling stale / overlap | Concluído | #618 |
| **L-FE-02** | Logout limpa active trip | Concluído | #618 |
| **L-OBS-01** | Cron partial_error → 500 | Concluído | #625 · `O-CRON-TIMEOUT-PARTIAL` |
| **L-TEST-01** | Isolamento BD testes | Concluído | **ACCEPTED DEBT** · #635 · `T-DB-ISOLATION` / `T-TEST-DB-NAME-GUARD` |
| **L-DOC-01** | Arch Março SUPERSEDED | Concluído | #636 |
| **L-DOC-02** | Cron runbook canónico | Concluído | #626 / #627 · residual `R-DOC-CRON-STALE-EXAMPLES` |
| **L-SEC-09** | Cron header-only auth | Concluído | #627 |
| **L-SEC-10** | Remover JWT `?token=` em WebSockets | Concluído | #643 · Bearer-only · CLOSED |
| **L-SEC-11** | Rate limits in-memory / multi-worker | N/A | **ACCEPTED DEBT** · single-worker guard · #646 |
| **L-SEC-12** | OTP verify race / consume atómico | Concluído | **CLOSED** · SMS/provider por implementar · OTP PROD continua 503 |
| **L-SEC-17** | OTP API sem SMS em deployed | Concluído | **CLOSED** · `503 otp_auth_unavailable` · reactivar exige provider SMS + smoke · L-SEC-12 CLOSED |
| **L-SEC-14A** | Partner trip list cap (500) | Concluído | #644 · CLOSED |
| **L-SEC-14B** | Redispatch offers bulk load | Concluído | #645 · CLOSED |
| **L-SEC-14C** | Admin lists / matching pool piloto | N/A | **ACCEPTED DEBT** · revisit com escala |
| **L-SEC-13** | JWT invalidate after password change | Concluído | #642 · `token_version` · CLOSED |
| **L-SEC-15** | Interaction log own Session | Concluído | #640 · CLOSED |
| **L-SEC-16** | Driver document upload allowlist | Concluído | #638 · alinhado a viaturas · CLOSED |
| **L-SEC-19** | `compare_digest` cron secret | Concluído | #627 |
| **O-PAY-WEBHOOK-ANOMALY** | Alerta webhook anomalies | Por iniciar | Não muda ACK 200 |
| **R-PAY-ORPHAN-PI** | Reconcile PI aberto órfão | Por iniciar | — |
| **O-CRON-TIMEOUT-PARTIAL** | timeout_payment_cancel_failed → partial? | Por iniciar | Decisão HTTP cron |
| **R-AUTH-SUPERADMIN-BOOTSTRAP** | Bootstrap super_admin auditável | Por iniciar | Sem auto-promote login |
| **T-DB-ISOLATION** | Fixture TX + get_db override | Por iniciar | Médio prazo |
| **T-TEST-DB-NAME-GUARD** | Exigir nome DB `test_db` | Por iniciar | — |
| **R-DOC-CRON-STALE-EXAMPLES** | Limpar `?secret=` / 15s em IMPLEMENTACAO / A022 | Por iniciar | **Não** reabrir L-DOC-02 |

---

## Painel — **DOCS / L-DOC-01** (**2026-09-19**)

Março 2026 architecture docs marcados SUPERSEDED; índice aponta fontes operacionais. **Sem** reescrita dos corpos históricos.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **L-DOC-01** | Arquitectura Março como “actual” + BD local=Render | Concluído | Banners + `DOCS_INDEX` + `architecture/README.md` |
| **L-DOC-02** | Cron runbook canónico | Concluído | #626/#627 · ver `R-DOC-CRON-STALE-EXAMPLES` |

---

## Painel — **TEST INFRA / L-TEST-01** (**2026-09-19**)

L-TEST-01 fechado como dívida aceite. **Sem** fixture TX global nesta fase. Ver [`BACKEND_PYTEST_SAFE.md`](docs/testing/BACKEND_PYTEST_SAFE.md) § isolamento.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **L-TEST-01** | Isolamento BD por teste | Concluído | **ACCEPTED DEBT** · CI fresh ≠ per-test isolation · commits persistem · uniqueness obrigatória |
| **T-DB-ISOLATION** | Fixture TX + override `get_db` (mesma connection) | Por iniciar | Médio prazo · markers p/ baseline/reset · **não** truncate/recreate como 1.ª opção |
| **T-TEST-DB-NAME-GUARD** | Exigir nome DB de testes (`test_db` ou config) | Por iniciar | Guard actual só host local · evita `ride_db` acidental |

---

## Painel — **AUTH / L-AUTH-01** (**2026-09-19** — tip `9faa5c5`)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **PR-630** | Remover promoção runtime `ADMIN_PHONE`→`super_admin` | Concluído | `9faa5c5` · roles só da DB no login |
| **PR-632** | Remover protecção admin por telefone | Concluído | `ab7809a` · staff só por role |
| **R-AUTH-SUPERADMIN-BOOTSTRAP** | Bootstrap/recovery explícito e auditável de `super_admin` | Por iniciar | Se DB ficar sem super_admin · **não** reintroduzir auto-promote no login |

---

## Painel — **PAYMENTS FAIL-CLOSED** (**2026-09-19** — tip `1b58627`)

Manual cancel (#628) + timeout (#629) fecham PI real cancelável antes da transição local. Follow-ups **fora** dessas PRs.

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **PR-628** | L-PAY-03 cancel manual fail-closed | Concluído | passenger/driver/admin |
| **PR-629** | Timeout Stripe cancel fail-closed | Concluído | `1b58627` · per-trip; batch continua; cron HTTP intacto |
| **L-PAY-02** | Webhook ACK 200 not-found / amount-mismatch | Concluído | **ACCEPTED DESIGN** · HTTP intacto · persistência opcional PR1 (#774) · painel **Fiabilidade pagamentos 22/10** |
| **R-PAY-ORPHAN-PI** | Cancel/recover automático PI órfão aberto | Por iniciar | PR4 detector **read-only** DONE (#776/#777); reconcile **não** cancela abertos |
| **O-CRON-TIMEOUT-PARTIAL** | `timeout_payment_cancel_failed > 0` → cron `partial_error`? | Por iniciar | Decisão explícita · muda HTTP semantics do `/cron/jobs` |
| **O-PAY-WEBHOOK-ANOMALY** | Superfície ops anomalias webhook | **Concluído** (core) | PR1+PR2 em `main` · runbook §11 · flag persist **off** · alertas/monitor extra = backlog ops |

---

## Painel — **PORTAGENS V1** (**2026-09-14** — tip `1382b35`)

**HERE Tolls V1 PROD VALIDATED — residual route variance accepted for V1.**

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **S-TOLLS-V1** | PORTAGENS F0–F5 | Concluído | PROD ON · #592/#593 · billing invariants PASS |
| **S-TOLLS-P2** | HERE routing determinism / toll variance | Por iniciar | P2 · mesmo OD €0.40 vs €2.55 · sem mudar billing/flag agora |
| **O-TOLLS-FISCAL** | Fiscal/legal tolls | Por iniciar | Fora do runtime V1 |

---

## Painel — **PRÉ-FÉRIAS** (**2026-08-11** — tip `1cb01c5` · MODO FÉRIAS ainda **OFF**)

**Modo:** **pré-férias** — PC principal = máquina activa. **MODO FÉRIAS** só a **13/14 ago** (após refresh SSD + cifrar secrets). Modelo: [`MODO_FERIAS_2026.md`](docs/archive/plans/MODO_FERIAS_2026.md).

**`main` / `origin/main`:** `1cb01c5` · alinhado · #540 negócio Manel · #539 DL 84/2026 · #538 biblioteca Setembro.

**Calendário:** até 13 ago = PC normal · **13/14** = gatilho férias · férias **14–31 ago** · **DEMO MANEL 2 = Setembro**.

**Objectivo imediato:** kit viagem (**cifrar `TVDE_SECRETS` pendente** · refresh SSD 13/14) · biblioteca Setembro (legal · negócio · **MOBILE-001**) · **sem** implementar / **sem** Capacitor / **sem** lojas. Em férias: branches + push · docs/marca leve · sem B2/Stripe live/PF3D/Docker MJ.

**Referências:** Negócio [`docs/business/`](docs/business/) · Legal [`LEGAL_SOURCES_INDEX.md`](docs/legal/LEGAL_SOURCES_INDEX.md) · Manel 2 [`DEMO_MANEL_2_SETEMBRO.md`](docs/archive/ops/DEMO_MANEL_2_SETEMBRO.md) · Biblioteca Set (arquivo) [`SETEMBRO_2026_TODO_LIBRARY.md`](docs/archive/plans/SETEMBRO_2026_TODO_LIBRARY.md)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **S-DEMO-MANEL-1** | Demo Manel 1 (carro/telefone real) | Concluído | **COMPLETA** — o que deveria funcionar, funcionou; sem cobertura total / sem prints |
| **O-DEMO-MANEL-2** | Demo Manel 2 (alargada) | Em curso | Guião #532 · [`DEMO_MANEL_2_SETEMBRO.md`](docs/archive/ops/DEMO_MANEL_2_SETEMBRO.md) · smoke pré-demo = Setembro |
| **PR-517** / **S-PARTNER-517** | Partner labels + smoke | Concluído | `78fbd29` · PASS |
| **PR-518** | Docs smoke Partner #517 | Concluído | `aadc57d` |
| **PR-519** | Driver nav labels por fase | Concluído | `eb3c929` — recolha/destino |
| **PR-520** | Docs DEMO MANEL 1 + week plan | Concluído | `aafe811` |
| **PR-515** / **NAV-3D.2b** | Agora refresh ErrorBanner | Concluído | `dc66772` |
| **A-PARTNER-MAP** / **S-PARTNER-MAP** | Partner mapa live | Concluído | Smoke prod **PASS**; polish (zoom/timestamp) depois — não blocker |
| **X-ACTIVETRIP-RESTORE** / **S-ACTIVETRIP-F5** | ActiveTrip F5 restore | Concluído | Smoke prod **PASS**; sem PR código esta semana |
| **X-DRIVER-REJECT** / **S-DRIVER-REJECT** | Driver Recusar oferta | Concluído | #521+#522+#523 · tip `c4690ea` · smoke **PASS** |
| **PR-521** | `reject_offer` locks | Concluído | `0294842` |
| **PR-522** | UI Recusar → reject API | Concluído | `01d7fc1` · Silenciar local |
| **PR-523** | BETA location sem assigned órfão | Concluído | `c4690ea` · BUG-REJECT-BETA-1 |
| **R-REJECT-REDISPATCH** | Redispatch imediato pós-reject | Por iniciar | Fora de scope; cron/TTL actual OK p/ demo |
| **AVAIL-B2-NEXT-TRIP** | B2 next-trip chaining | Concluído | Groundwork pré-férias **fechado** (#525–#527); flag OFF; zero writers; lifecycle/UI **pós-férias** |
| **B2-PRODUTO-DOCS** | Decisões produto B2 | Concluído | #525 · Opção B · 1 queued · ETA 12 · PI na promoção — [`B2_PRODUCT_DECISIONS_2026-08-04.md`](docs/architecture/B2_PRODUCT_DECISIONS_2026-08-04.md) |
| **B2-CONFIG** | Flags OFF + defaults | Concluído | #526 · `ENABLE_NEXT_TRIP_CHAINING=False` · `NEXT_TRIP_MAX_PICKUP_ETA_MINUTES=12` · zero consumers |
| **B2-SPIKE-BE-1** | Schema `queued` inerte | Concluído | #527 · `1671c9f` · enum + SM + `uq_trips_one_queued_per_driver` · zero writers |
| **B2-SPIKE-BE-2** | Lifecycle helpers sibling-aware | Por iniciar | **Pós-férias** — sem accept/promote ainda |
| **B2-SPIKE-BE-3** | Accept→queued + promote + PI | Por iniciar | **Pós-férias** — atrás de flag OFF |
| **B2-MATCH-ETA** | Matching janela ETA 12 min | Por iniciar | **Pós-férias** |
| **B2-UI-MIN** | Driver current+next · Pax msg/cancel | Por iniciar | **Pós-férias** |
| **O-SSD-FERIAS** | Portátil + SSD / readiness férias | Em curso | Clone+MJ **PASS** · limpeza leve MJ **PASS** 2026-08-07 · **cifra `TVDE_SECRETS` pendente** · refresh SSD **13/14** |
| **O-MJ-LIGHT-CLEAN** | Limpeza leve portátil MJ | Concluído | Startup reduzido · WPS tasks off · Chrome Memory Saver · ~3.4 GB RAM livre · nada desinstalado · críticos preservados |
| **O-MODO-FERIAS** | Entrada oficial MODO FÉRIAS | Por iniciar | Gatilho 13/14: SSD actualizada + secrets cifrados + main alinhada PC/SSD |
| **X-MANEL-INPUTS** | Backlog inputs Manel (pagamentos + app Driver) | Em curso | Docs [`MANEL_INPUTS_TODOS_2026-08-07.md`](docs/product/MANEL_INPUTS_TODOS_2026-08-07.md) · P0–P3 · perguntas abertas · **sem** implementação |
| **X-SETEMBRO-LIB** | Biblioteca TODOs/intenções Setembro 2026 | N/A | **Arquivo** 2026-10-11 · carril activo = [`ROADMAP_FINAL…`](docs/ROADMAP_FINAL_ENTREGA_TVDE_2026.md) + este painel · [`SETEMBRO_2026_TODO_LIBRARY.md`](docs/archive/plans/SETEMBRO_2026_TODO_LIBRARY.md) |
| **LEGAL-TVDE-001** | DL 84/2026 — fonte legal bruta | Em curso | PDF em [`docs/legal/sources/`](docs/legal/sources/decreto-lei-84-2026-tvde-transporte-rodoviario.pdf) · índice [`LEGAL_SOURCES_INDEX.md`](docs/legal/LEGAL_SOURCES_INDEX.md) · leitura Setembro P0 · **sem** parecer |
| **BUSINESS-MANEL-001** | Custos / comissões / simulador (hipóteses) | Em curso | DOCX + 3 docs em [`docs/business/`](docs/business/) · P0 Setembro · **não** tarifário aprovado · **sem** campanha |
| **MOBILE-001** | Android / iOS (PWA/wrapper/Capacitor) | Por iniciar | Pergunta Manel · spike Setembro P0/P1 · **sem** código · **sem** lojas · **sem** app nativa do zero |
| **X-BRAND-SHORTLIST** | Shortlist logos / Ideogram (local) | Em curso | `image/_SHORTLIST_FINAL_6` + pranchas `_temp` · **sem** vencedor · **sem** troca em prod |
| **R-PARTNER-REASSIGN-COPY** | Hint reassign `assigned` literal | Por iniciar | Display-only; baixa prioridade |
| **O-DEMO-4ROLES** / **S-DEMO-4** | Smoke 4 papéis prod | Concluído | PASS 2026-07-30 |
| **PF3D-GATES** | Compliance gates | Concluído | OFF em prod |
| **Bugbot / Cloud** | Automações Cursor | N/A | **OFF** |
| **O-STRIPE-LIVE** | Stripe live | Bloqueado | Fora desta fase |
| **R-GIT-1** | Limpeza branches locais | Por iniciar | Não apagar ainda |
| **CI-MAINT-1** | Warning Actions Node 20 | Por iniciar | Baixa prioridade |

**Próximo (humano):** até 13 = PC normal · **13/14** = refresh SSD + **cifrar `TVDE_SECRETS` (ainda pendente)** + smoke leitura MJ → **MODO FÉRIAS ON**. Portátil MJ já com limpeza leve. Em férias: branches + push. **Não** B2/Stripe/PF3D/Docker MJ.

**Regra:** **1 carril** · review humana ([`PR_REVIEW_CHECKLIST.md`](docs/meta/PR_REVIEW_CHECKLIST.md)) · em férias preferir docs/FE leve.

---

## Painel — **2026-07-19** (histórico — pagamentos + O-SECURITY fechados)

**`main` (nessa data):** `77ddfac` · checkpoint pagamentos.

**Objectivo então:** Admin Ops seguinte · ou PARTNER-FLEET-1 · (Stripe live só com parceiro/docs).

**Checkpoint:** [`docs/archive/ops/CHECKPOINT_2026-07-19_PAYMENTS_STUCK.md`](docs/archive/ops/CHECKPOINT_2026-07-19_PAYMENTS_STUCK.md) · pós-#415: [`docs/archive/ops/CHECKPOINT_2026-07-19_POST_415.md`](docs/archive/ops/CHECKPOINT_2026-07-19_POST_415.md)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **CHK-0715** | Checkpoint docs pós-P5 | Concluído | PR docs 2026-07-15 |
| **PR-405** | NAV/WAZE-1 Opção B | Concluído | Merged 2026-07-16; S-NAV-1…4 PASS |
| **D-DEMO-1** | Walkthrough multi-role local | Concluído | PASS 2026-07-16 — Pax+Driver+Partner+Admin |
| **CHK-DEMO-1** | Docs checkpoint D-DEMO-1 | Concluído | PR **#406** merged |
| **PR-407** / **TW-TRIP-COPY-1** | Soften trip copy demo | Concluído | Merged; smoke visual PASS 2026-07-17 |
| **S-TW407-1** | Smoke visual #407 | Concluído | Idle/search/accepted/ongoing/completed; NAV manual intacto |
| **PR-409** / **ADMIN-POLL-1** | Admin: on-enter + refresh manual | Concluído | Merged; sem `setInterval` global |
| **PR-410** / **ADMIN-POLL-2** | Feedback botão Atualizar (Agora) | Concluído | Merged; smoke visual PASS |
| **PR-411** | Docs fecho ADMIN-POLL frontend | Concluído | Merged |
| **PR-412** | Docs Admin ≠ dispatcher | Concluído | Merged |
| **PR-413** | Passenger active-trip recovery | Concluído | Merged; E2E + smoke PASS |
| **PR-414** | Docs ADMIN-OPS-1 Fase 0 B/C PASS | Concluído | Checkpoint smoke |
| **PR-415** / **TEST-DB-GUARD-1** | Guard pytest ≠ BD remota | Concluído | Merged; ver [`BACKEND_PYTEST_SAFE.md`](docs/testing/BACKEND_PYTEST_SAFE.md) |
| **CHK-0719** | Checkpoint docs pós-#415 | Concluído | PR **#416** |
| **PR-417** / **PAYMENTS-STUCK-1A** | Mock settle no `complete_trip` | Concluído | **PASS** — #417 |
| **PR-418** / **PAYMENTS-STUCK-1B** | Admin close-mock dry-run/apply | Concluído | **PASS** — #418 + apply Render 41+10 |
| **CHK-PAY-0719** | Checkpoint docs pagamentos + O-SECURITY | Concluído | Checkpoint Julho — fecho auth SA nessa linha |
| **PAYMENTS-EDGE-1** | cancelled + PI real → payment failed | Concluído | **PASS** — Dashboard `requires_payment_method`; sem Stripe API |
| **PAYMENTS-EDGE-2** | completed inválida → failed | Concluído | **PASS** — trip `4b29c6c9-…` |
| **O-SECURITY** | Rodar password SA | Concluído | **PASS** — `/auth/me/password`; nova OK · antiga FAIL; sem env |
| **S-ADMIN-POLL** | Smoke multi-janela Pax+Driver+Admin | Concluído | PASS — estabilidade OK pós-#409/#410 |
| **ADMIN-OPS-1** | Admin como ferramenta de excepção | Concluído | Fase 0 B/C **PASS** 2026-07-19 — ver checkpoint |
| **S-ADMIN-OPS-0** | Smoke Fase 0 B/C (force / gap ongoing) | Concluído | PASS; nota ops **SKIP**; 1B Assign SKIP |
| **R-ADMIN-ORPHAN-PANEL** | «Viagem aberta fora da lista» pós-completed | Por iniciar | Observação UX; não blocker |
| **R-AGORA-SNAP** | Agora vs Viagens (contagens) | Por iniciar | Observação snapshot/manual; **não** bug confirmado |
| **BACKEND-DBPOOL-2** | Optimizar pool BD / latência system-health local | Por iniciar | **≠** Fase 1 #770 · optimização só se saturar · PROD/STG smokes Saúde **PASS** 22/10 |
| **CI-MAINT-1** | Warning Actions Node 20 deprecated | Por iniciar | Baixa prioridade — ver painel 2026-07-29 |
| **PARTNER-FLEET-1** | Viaturas, docs, associação, reassign ops | Concluído | Evoluiu para PF3* / PF3D (gates OFF) — ver handoff |
| **NAV-WAZE-2** / **NAV-ROUTE-STOPS** | Nav manual nextStop + trip_stops | Por iniciar | Decisão Manel: botão sempre visível; sem auto-cadeia |
| **PR-398** | Driver active trip recovery | Concluído | Merged 2026-07-14 |
| **PR-403** | WT launchers Dev + Stripe local | Concluído | Merged 2026-07-14 |
| **TVDE-PROD** | Gate P5 beta | Concluído | O-ROTATE-1 · S-PROD-2 · O-CRON-1 · O-RENDER-1 · TVDE-BKP · O-STRIPE-1 |
| **O-i18n-NICHOS** | Strings PT residuais EN batch A–F | Smoke pendente | PR **#362** — se objectivo mudar |
| **A2-02-1** | OAuth staging + URIs Google | Concluído | Ver painel **2026-10-21** |
| **R-E2E-1** | Flake web-e2e intermitente | N/A | Caso Maps → #509; residual no painel 29 |
| **O-STRIPE-LIVE** | Stripe live / conta parceiro | Bloqueado | Parceiro + `sk_live_*` |
| **R-GIT-1** | Limpeza branches locais (~190) | Por iniciar | Higiene futura — não apagar ainda |

**ADMIN-OPS-1 Fase 0 B/C (fecho):** force arriving/ongoing OK; Pax/Driver coerentes; gap `ongoing` (sem complete/cancel/fail admin) confirmado; Driver completa; Histórico `completed`. Nota ops SKIP.

**Incidente mitigado (#415):** pytest local → Render via `.env`; guard + launcher seguro.

**Pagamentos + O-SECURITY fechados:** 1A/1B/EDGE-1/2 PASS · Health **ok** · password SA rodada (API; sem env).

**Nota:** painel vivo passou para **2026-07-29** (acima).

**Regra:** **1 carril** por sessão.

---

## Painel — 2026-05-22 (smokes pós-merge **#349** — Ambiance O1–O6)

**Smokes S-SMK-349-1…5:** Concluídos. Contratos: [`docs/ux/ambiance-chrome-contract.md`](docs/ux/ambiance-chrome-contract.md)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **S-SMK-349-1…5** | Partner/driver/passageiro + temas + mapa | Concluído | PR **#349** |
| **R-NAV-INV-1** | Inventário navegação 4 apps | Concluído | [`navigation-inventory.md`](docs/ux/navigation-inventory.md) |

---

## Painel — 2026-05-24 / fecho 2026-05-29 (smokes **#341**)

**Smokes S-SMK-341-1…6:** Concluídos (**2026-05-29**). Código merge **#341** (`a208949`).

### Entrega #341 (fechada)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **F-DOC-1…F-PAX-1** | Docs, offline, discover, offer UX, partner nav, rota fantasma | Concluído | Ver painel histórico L3 |
| **F-SMK-DOC-1…3** | Refresh docs, input ficheiro, alertas partner | Concluído | Pós-smoke fixes |
| **TW-SMK-OFFER-1…2** | Menu/copy ofertas silenciadas | Concluído | Menu → Viagens |
| **F-SMK-CAT-1** | Reactivar categoria X sem refresh | Concluído | `refetchAvailable` |
| **F-NAV-1** | Waze duplo (aceite + iniciar) | Concluído | Política **B** — só destino ao iniciar |
| **TW-SMK-PARTNER-1…4** | Partner shell menu-centric | Concluído | [`shell-menu-centric.md`](docs/ux/shell-menu-centric.md) |
| **TW-SMK-DOC-5** | Partner contador docs «N / 6» | Concluído | `partnerDocumentsApprovedCount` em `PartnerDriverDetail` |

---

## Painel — **PRÓXIMA SESSÃO** (lista consolidada — **2026-05-22** — histórico)

_Ver painel **2026-07-15** acima para estado actual._

**`main`:** i18n v2 (**#353**, **#354**); nichos EN — [`I18N_NICHOS_EN.md`](docs/architecture/I18N_NICHOS_EN.md).

### Aberto agora (P0 — produto)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **TW-SMK-DOC-4** | Banner «Documentos em falta» topo mapa → infobox bottom | Concluído | #359 + #360; smoke OK (só infobox em baixo) |
| **O-NAV-REV-1** | G12 híbrido — toggle auto-open recolha ao aceitar | Concluído | #361; smoke OK (OFF/ON + destino ao iniciar) |
| **TW-DIA23-1** | Micro ajustes layout mapa/caixas | N/A | Adiar — acumular ecrãs em testes |
| **O-NAV-PP-1** | Barra 4 ícones passageiro/parceiro + menu tree | Concluído | Smoke passageiro + parceiro OK |
| **O-i18n-NICHOS** | Strings PT residuais em EN — batch 1 A–F | Smoke pendente | PR **#362** |
| **O-i18n-X3** | Legal EN — opção B (resumo + PT vinculante) | Concluído | `LegalLocaleNotice` login + Definições |

### P1 — infra / gates

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **A2-02-1** | OAuth staging + URIs Google | Concluído | PASS 21/10 · [`STAGING_A2-02_RUNBOOK.md`](docs/ops/STAGING_A2-02_RUNBOOK.md) · painel **2026-10-21** |
| **A2-02-2** | Smokes assertivos staging | Concluído | **Fecho 22/10** · acta runbook A2-02 §8 · painel **2026-10-22** |
| **A4** | Fecho onda auditoria A+L | Por iniciar | [`AUDIT_EXEC_BACKLOG_AL_2026-05.md`](docs/archive/audits/AUDIT_EXEC_BACKLOG_AL_2026-05.md) |
| **A3-R** | Gate §A3 checklist staging verde | Em curso | Humanos |

### P2 — UX / evolução (não urgente)

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **O-UX20-1** | Desenho UX 2.0 motorista | Por iniciar | [`DRIVER_UX_2_0.md`](docs/product/DRIVER_UX_2_0.md) |
| **R-OAUTH-UX** | OAuth Google — mensagens R1–R4 | Concluído | PR #785 · **R5/R6** adiados · smokes STG parcial **24/10** |
| **R-LEGACY-1** | Layout legacy `!driverBottomNav` | Por iniciar | [`driver-ux-fixes-backlog.md`](docs/ux/driver-ux-fixes-backlog.md) |

### P5 — operação pré-escala

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| **TVDE-PROD** | `PROD_VALIDATION` | **Concluído** | gate P5 beta ✅ · prod `STRIPE_MOCK=true` · plano Jul arquivado [`FORWARD_PLAN_2026-07.md`](docs/archive/plans/FORWARD_PLAN_2026-07.md) |
| **O-STRIPE-1** | Webhook Stripe (Fase A local) | **Concluído** | 2026-07-13 · [`O_STRIPE_1_RUNBOOK.md`](docs/ops/O_STRIPE_1_RUNBOOK.md) |
| **TVDE-BKP** | Backups + restore test | **Concluído** | 2026-07-12 · [`TVDE_BKP_RUNBOOK.md`](docs/ops/TVDE_BKP_RUNBOOK.md) |
| **TVDE-STG** | Cron STAGING (`GET /cron/jobs` via cron-job.org) | **Concluído** | PR [#782](https://github.com/frankbexxx/tvde/pull/782) · **23/10** · job **`TVDE - STAGING`** · 14× HTTP **200** · acta runbook **§9** · **≠** saúde global STG OK · PROD cron **inalterado** |

**Regra:** Frank + agente **escolhem 1 carril** (P0 vs P1 vs P5) antes de codar.

---

## Ritual de fecho de sessão

1. **Testes** → audits → correcções → merge/PR
2. Actualizar **este ficheiro** (painel + abertos) — único handoff operacional
3. Operação cron/Render: [`CRON_JOB_ORG_INSTRUCOES.md`](docs/CRON_JOB_ORG_INSTRUCOES.md) · [`W1_PROD_SMOKE.md`](docs/ops/W1_PROD_SMOKE.md)
