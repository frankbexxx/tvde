# PROXIMA_SESSAO.md — Handoff para Continuação

Documento de contexto para a próxima sessão. Inclui estado atual, decisões arquiteturais, e informação para prosseguir sem perder continuidade.

---

## Hoje (ter 2026-04-21) — recalibrado

**Nota de calendário:** Ondas 1 e 2 foram feitas em antecipação nas sessões de segunda/terça-manhã (PRs #152 e #153 já mergidos). Isto liberta **quarta 22/04 inteira** para a nova **Onda 2.5 — A11y + mobile polish com Firefox Developer Edition**. Ver `ALPHA_2026-04-25.md §7.3.5`.

**Estado git:** `main` limpa. #151, #152, #153 mergidos.

**Plano para hoje (3 fases sequenciais):**

1. **Middle session solo (manhã, sem o Frank):** varrimento pré-audit do caminho crítico. Fixes de `text-xs` em mensagens operacionais do driver/passenger que não aguentam 360 px em Chrome Android em movimento. PR pequeno, mergeável antes do smoke.
2. **Tarde (com o Frank):** arrancar ataque ao **Firefox Developer Edition** — abrir app em RDM, primeiro contacto com Accessibility Inspector, desenhar ordem de ecrãs e critérios de fix. Não precisa sair PR desta tarde; o PR grande é amanhã.
3. **À noite:** **smoke duplo real** em Oeiras/Cascais (Frank + 1 convidado, 2 Android). Nível 1 obrigatório + tentativa Nível 2. Validar no `AdminDashboard` desktop o que foi feito ontem (linha com P/D/updated_at, badge stuck, confirm de forçar arriving). Anotar em `ALPHA_2026-04-25.md §9`.

**Amanhã (qua 2026-04-22) — Onda 2.5 completa:**

Sessão inteira em Firefox Dev Edition, fazendo audit sistemático de 5–7 ecrãs seguindo `ALPHA_2026-04-25.md §7.3.5`. Mini-smoke solo no fim do dia. PR único «mobile: a11y audit pass com Firefox Dev Edition (Onda 2.5)».

**Não fazer agora:**
- Não abrir features novas.
- Não mexer na state machine, SP-F, auditoria, pagamentos, matching.
- Não começar §A (convocatória) nem §E (contas piloto) — ficam para sexta de manhã.

**Referências vivas:**
- `docs/meta/ALPHA_2026-04-25.md §6` (calendário recalibrado).
- `docs/meta/ALPHA_2026-04-25.md §7.3.5` (super-prompt Onda 2.5, para amanhã).
- `docs/meta/ALPHA_2026-04-25.md §9` (log de smokes — **anotar aqui hoje à noite**).
- `docs/meta/ALPHA_2026-04-25_ONDA0_RUNBOOK.md §A` e `§E.2` (guardados para sexta).

---

# Abertura 2026-04-20 (tarde) → rumo ao piloto 2026-04-25

**Contexto em 3 linhas:** decidimos entregar uma **alpha controlada** no sábado 2026-04-25 em **Oeiras/Cascais**, com **5 testers**, **Android via link Render**, **sem pagamento real**, canal de reporte **WhatsApp + chamada**. Frank como admin observador. O GPS real e o fluxo "uber-like" (passageiro vê motorista a aproximar-se ao vivo) **já estão em produção e validados em campo** na semana passada — não é preciso implementar GPS.

**Doc mestre:** [`ALPHA_2026-04-25.md`](ALPHA_2026-04-25.md) — ler antes de tudo o resto. Tem:
- Decisões validadas (§1), âmbito IN/OUT (§2), inventário confirmado do que já está pronto (§3).
- Riscos e mitigação (§4), cenários de teste Nível 1 e 2 (§5), calendário (§6).
- **Ondas 0–5 com super-prompts prontas a colar** (§7) — uma por dia, cada uma contém contexto, tarefas, regras, entregáveis e critérios de aceitação.
- Preparação operacional (§8), log de smokes (§9), checklist do dia do piloto (§10), plano de contingência (§11), pós-piloto (§12).

**Fecho 2026-04-20 (fim do dia) — Onda 0 (quase) terminada:**

- [x] B — `BETA_MODE=true` confirmado em prod (Render API env).
- [x] C — OPS-BD-PI **+ cleanup profundo** em prod (ver `ALPHA_2026-04-25_ONDA0_RUNBOOK.md §Registo de execução 2026-04-20`). Trips 301 → 11, payments 202 → 11, stuck = 1 legítimo, inconsistent = 0.
- [x] D — OPS-SMOKE-132: botão «Alinhar pagamento (Stripe)» validado no fluxo Bloco 1.
- [x] F (extra) — **Bloco 2 code fix SP-F**: `reconcile_stripe_for_completed_processing` passa a marcar `failed` + audit `reconcile_payment_stripe_no_such_pi` quando o Stripe devolve `InvalidRequestError/resource_missing` (ex.: `pi_mock_…`, `pi_test_…` antigos). Fecha o buraco que antes deixava items só como `action=error`. 2 testes unit novos, ruff clean, 8/8 testes do módulo passam.
- [ ] A — Convocatória WhatsApp (template pronto em `ALPHA_2026-04-25_ONDA0_RUNBOOK.md §A`; falta redigir com hora/ponto definitivo).
- [ ] E — Criar 5 passageiros + 2–3 motoristas + 1 admin piloto em prod com smoke de login.

**Fecho 2026-04-21 (sessão de Onda 2 antecipada) — resto Onda 0 adiado para sexta; Onda 2 código feito:**

Decisão do Frank: A (convocatória WhatsApp) e E (script de criar contas piloto) adiados para sexta-feira (Onda 4, mesmo dia de correcções finais) porque dependem só de acção operacional e não desbloqueiam desenvolvimento. Onda 2 (AdminDashboard afinado) arrancou hoje.

Onda 2 — alterações deste PR:

- **Backend** — `GET /admin/trips/active` passa a devolver `updated_at` (aditivo).
  - `backend/app/schemas/trip.py` — `TripActiveItem.updated_at: Optional[datetime]`.
  - `backend/app/api/routers/admin.py` — response builder inclui `updated_at=t.updated_at`.
- **AdminDashboard — aba Viagens (modo "Activas")**:
  - linha mostra agora **id curto · estado · P:passageiro-curto · D:motorista-curto · atualizado há X**.
  - badge laranja `stuck Nmin` quando `accepted` há ≥ 5 min (bordo da linha também muda).
  - `handleAdminTripTransition` mostra no `confirm` o header `Viagem <8-chars>… (<from> → <to>)` antes de pedir o motivo — paridade para «Forçar arriving» e «Forçar ongoing».
  - botão «↻ Atualizar lista» reforçado (texto + ícone + nota «polling natural activo»). Polling 5 s continua no `usePolling`; o botão é refresh manual imediato.
- **Helpers novos** — `web-app/src/utils/relativeTime.ts` (`formatRelativeAgo`, `minutesSince`) com suite dedicada (`relativeTime.test.ts`, 11 casos).

Testes: `tsc -b` 0 erros, `npm run lint` 0 erros, `vitest run` **21 files / 90 tests passed** (11 novos), `pytest` **140/140** (ruff clean).

Onda 0 — estado (resto adiado para sexta):

- [x] B, C, D, F (Bloco 1 cleanup prod + Bloco 2 fix `pi_not_found_in_stripe`) — mergidos em #151.
- [x] A — template final da convocatória WhatsApp guardado em `ALPHA_2026-04-25_ONDA0_RUNBOOK.md §A`. Enviar sexta com hora/ponto confirmados.
- [x] E — script Python self-contained pronto no runbook `§E.2` para colar no Render Shell. Correr sexta de manhã + spot-check login.

**Onda 1 (mobile polish core) — mergido em #152:**

- `PrimaryActionButton`, `RequestCard`, `ActiveTripActions`, `PassengerDashboard` (botão × erro), `DriverDashboard` (banners × paridade) — todos com `min-h/min-w ≥ 44 px` + `touch-manipulation`.
- Layout global: `ScreenContainer` `max-w-md mx-auto w-full`; `body { overflow-x: hidden; min-width: 320px }` — zero scroll horizontal 320–400 px garantido.

**Arranque da próxima sessão (qua 2026-04-22 — smoke real Onda 1 + smoke Nível 2 Onda 2):**

1. **Smoke duplo real Nível 1 + tentativa Nível 2** (2 Android, Frank + 1 convidado, Oeiras/Cascais). Validar:
   - mobile polish (botões ≥ 44 px, banners ×, zero scroll horizontal a 360 px);
   - linha da aba Viagens do admin mostra id curto + P/D + updated_at + badge stuck quando aplicável;
   - confirm dialog em «Forçar arriving» mostra `Viagem <8-chars>… (accepted → arriving)` antes de pedir motivo;
   - botão «↻ Atualizar lista» reage imediatamente.
   - Anotar em `ALPHA_2026-04-25.md §9`.
2. Se smoke Nível 2 completo sem S1 → **freeze opcional às 22:00** de quarta.
3. Onda 3 (qui) arranca com ensaio reduzido.
4. Sexta (Onda 4) — primeiras tarefas da manhã: (a) executar `ALPHA_2026-04-25_ONDA0_RUNBOOK.md §E.2` em Render Shell + spot-check login P1/D1/Admin; (b) enviar convocatória WhatsApp (`§A`) com hora/ponto finais.

**Ondas seguintes (alto nível):**
- **Onda 1 (ter 21/04)** — ✅ código mergido (#152). Falta só smoke duplo real (quarta à noite).
- **Onda 2 (qua 22/04)** — ✅ código mergido antecipadamente (#153). Falta smoke Nível 2 real + freeze 22:00.
- **Onda 3 (qui 23/04)** — ensaio com 1–2 testers externos.
- **Onda 4 (sex 24/04)** — só S1+S2 + executar resto Onda 0 (A convocatória + E contas piloto); deploy até 18:00.
- **Onda 5 (sáb 25/04)** — piloto; **zero deploys durante a janela**.

**Fora do âmbito até sábado** (não abrir por engano): Stripe real, Stripe Connect, app nativa, PWA install, WebSockets no front, `/driver/offers`, `matching/find-driver` na UI, push, staging, CI de segurança (GHAS/Snyk/Semgrep/pentest), docs legais, M2-PERFIL, M3-DOCS.

**Snapshots de referência:** [`docs/snapshots/SNAPSHOT_2026-04-19.md`](../snapshots/SNAPSHOT_2026-04-19.md) (histórico) e [`docs/snapshots/SNAPSHOT_2026-04-20.md`](../snapshots/SNAPSHOT_2026-04-20.md) (estado actual com deltas).

---

# Seção A — Resumo do ROADMAP Completo

## ROADMAP — Fase Atual (MVP Público Web)

### Estado Atual (concluído)

- Backend funcional
- Stripe authorization + capture funcional
- Webhook como fonte de verdade
- Web App operacional (web-test-console removido)
- Tokens dev ativos
- State machine estável
- **Etapa Operacional** implementada (disponibilidade, timeouts, dispatch, race condition)
- **Alembic** em produção: baseline `80f5b3e9fd12`, head `c4a8e1b2d0f3` (`stripe_webhook_events`); arranque API corre `upgrade head`; CI aplica migrações antes de `pytest`
- **Webhook Stripe**: idempotência por `evt_` (tabela `stripe_webhook_events`) + chaves de idempotência nas chamadas à API Stripe (create/confirm/capture/update amount)

---

### Fase 1 — Modelo Financeiro Real (Base Económica) — **Concluída**

| Item                             | Estado                                             |
| -------------------------------- | -------------------------------------------------- |
| Pricing Engine                   | ✅ `app/core/pricing.py`                           |
| Integração no complete_trip      | ✅ Recalcula `final_price`, update amount, capture |
| Campos distance_km, duration_min | ✅ Mock se null                                    |
| driver_payout no Payment         | ✅ Armazenado                                      |
| Stripe Connect                   | ❌ Não integrado (conforme plano)                  |

---

### Fase 2 — Web App Responsiva (MVP Validável) — **Concluída**

| Item                               | Estado                                            |
| ---------------------------------- | ------------------------------------------------- |
| Novo projeto web-app               | ✅ React + Vite + TypeScript                      |
| Passenger Dashboard                | ✅ Pedir viagem, estado, preço, histórico         |
| Driver Dashboard                   | ✅ Lista assigned, Accept/Arriving/Start/Complete |
| Polling 5s                         | ✅                                                |
| Painel de atividade (log + estado) | ✅ Implementado                                   |
| Guia de testes                     | ✅ [GUIA_TESTES.md](../testing/GUIA_TESTES.md)    |

---

### Princípios Arquiteturais (ROADMAP)

- Stripe é a fonte financeira externa
- Webhook é a fonte de verdade interna
- `Payment.status` só muda via webhook
- `complete_trip` nunca altera `payment.status` manualmente
- `update_payment_intent_amount` só pode ocorrer antes de capture

### Restrições Técnicas (ROADMAP)

- Não quebrar state machine existente
- Não alterar fluxo de authorization no `accept_trip`
- Webhook: **SoT** de `Payment.status` inalterável na regra de negócio; reentregas Stripe tratadas com dedup por `stripe_event_id` (sem mudar quem define o estado final)
- Manter idempotência e atomicidade

---

### Pendente no ROADMAP (não implementado ou parcial)

- **Confirmação no Accept** — `ENABLE_CONFIRM_ON_ACCEPT` existe mas não ativado
- **Stripe Connect** — split automático para motoristas
- **API de rotas** — distância/duração reais estáveis além de OSRM opcional + haversine
- **Notificações push** — para motoristas e passageiros
- **Backups PG formais** — A028 (ver checklist em `../architecture/TVDE_ENGINEERING_ROADMAP.md`)
- **Auditoria de segurança documentada** — A034

~~**Migrations (Alembic)**~~ — **Feito** (ver roadmap de engenharia; evolução de schema só via revisões Alembic).

---

# Seção B — Resumo do que Existe, Estado de Testes e Cuidados

## O que existe

### Backend

- FastAPI, SQLAlchemy 2, PostgreSQL, Stripe (manual capture)
- Modelos: User, Driver, Trip, TripOffer, Payment, `StripeWebhookEvent`, AuditEvent, OtpCode, InteractionLog
- Driver: `is_available` (nova coluna)
- Serviços: trips, stripe_service, trip_timeouts, system_health, payments
- Endpoints: passenger, driver, admin, dev_tools, webhooks
- **POST /admin/run-timeouts** — execução manual de timeouts

### Web App

- React + Vite + TypeScript, Tailwind
- Passenger: pedir viagem, viagem ativa, histórico, cancelar (até entrar na viatura); "Sem conectividade" / "A verificar..." quando offline ou falha temporária
- Driver: lista available, Accept, Arriving, Start, Complete, Cancel, histórico; volta à lista quando passageiro cancela
- DevTools: Seed, Auto-trip, Run timeouts, Assign
- Painel direito: log sequencial, estado em tempo real, vista, copiar log
- Role derivado do URL (`/driver` → motorista, `/passenger` → passageiro)

### Fluxo Operacional (implementado)

- Auto-dispatch: trip criada com driver disponível → `assigned`
- Timeouts: assigned 2min→requested, accepted 10min→cancelled, ongoing 6h→failed
- Driver `is_available`: false ao aceitar, true ao completar/cancelar
- Race condition: `SELECT FOR UPDATE` em `accept_trip`
- `assign_trip` idempotente (se já assigned, retorna sucesso)

---

## Estado atual de testes

**Testes concluídos com sucesso:**

- Fluxo completo: Pedir viagem → Assign (ou auto-dispatch) → Accept → Arriving → Start → Complete
- Auto-trip, Run timeouts, Seed
- Vista Passageiro e Motorista funcionais
- **Validação em campo (28/02/2026):** 4 telemóveis, rede móvel (dados móveis, sem Wi‑Fi), 1 motorista + 3 passageiros — 100% positivo
- **Testes Render (04/03/2026):** Testes 1–6 concluídos — cold start, dormancy, multi-dispositivo, regressão (cancelar), fricção de rede, Stripe webhook. Notas em `archive/docs_nao_essenciais/TESTES_RENDER_TIMING.md` no snapshot — [HISTORICO_FORA_DO_GIT.md](../HISTORICO_FORA_DO_GIT.md)

---

## Cuidados a ter

1. **Ordem de arranque:** Docker Desktop → PostgreSQL → Backend → Stripe webhook → Web App (ver [GUIA_TESTES.md](../testing/GUIA_TESTES.md))
2. **Seed** — Executar antes de usar a app (ou após reset). Repõe `is_available=True` em drivers existentes.
3. **Auto-trip** — Requer driver disponível. Se falhar com "Driver is not available", executar Seed primeiro.
4. **Stripe webhook** — Obrigatório para `payment.status` passar a `succeeded`. Sem `stripe listen`, o complete funciona mas o payment fica em `processing`.
5. **Invariantes** — Não alterar accept_trip, complete_trip, stripe_service, webhook, model financeiro.
6. **Cron e timeouts** — Em produção: agendar `GET /cron/jobs?secret=<CRON_SECRET>` (30–60 s). Manualmente: `POST /admin/run-timeouts` e `POST /admin/run-offer-expiry`. Detalhe completo na **Seção F** (checklist operacional fundido).

---

# Seção C — Visão

O sistema está num **MVP validável** — fluxo técnico e operacional completos, com testes manuais a passar. A base está sólida:

- **Financeiro:** Stripe manual capture, webhook como fonte de verdade, pricing engine integrado
- **Operacional:** Disponibilidade, timeouts, dispatch, proteção contra race
- **UX:** Web app com log e estado em tempo real, guia de testes para não-técnicos

A **validação em contexto real** foi concluída com sucesso (4 dispositivos, rede móvel). Próximo passo natural: **decisão sobre confirmação** — quando o preço passa a ser definitivo (ver `STRIPE_CONFIRMACAO_FUTURA.md` no snapshot — [HISTORICO_FORA_DO_GIT.md](../HISTORICO_FORA_DO_GIT.md)). A introdução de Stripe Connect ou confirmação no accept deve ser feita depois dessa decisão.

---

# Seção D — O que Deve Ser a Próxima Sessão

### Fecho 2026-04-09 (noite) — handoff técnico curto

- **Feito nesta sessão:** E2E Playwright **`admin-health-tab.spec.ts`** — `/admin?tab=health` com tokens dev inject (`tvde_e2e_dev_tokens_json`), asserções em «Saúde do sistema» + `Status: ok|degraded`; `playwright.config` inclui o spec no project `e2e-ui`. Documentação: [`UI_VISIBILITY_IMPLEMENTATION_TODO.md`](UI_VISIBILITY_IMPLEMENTATION_TODO.md) linha **A3** (Playwright); [`todo-em-curso.md`](../todo-em-curso.md).
- **Para a próxima abertura (não bloqueado por código de hoje):** Passo 0 do inventário (`TBD` → estados com evidência); **A5** utilizadores; **A1** reconcile + viewport telemóvel; **D1** motorista ofertas/fila; bloco **OPS/BD** em [`TODOdoDIA.md`](../../TODOdoDIA.md) quando fores a essa janela (ex. 2026-04-19); smokes manuais onde o doc exigir device real.

### Abertura 2026-04-09 — consulta obrigatória

- **Ler em primeiro lugar:** [`CONSULTA_OBRIGATORIA_SESSAO_2026-04-09.md`](CONSULTA_OBRIGATORIA_SESSAO_2026-04-09.md) — resume circuito de implementação, compliance incremental (PT), integrações, audits externos, aceleração (bulk visual + Playwright + telemóvel).

### Alinhamento produto & visibilidade (2026-04-08)

- **`main`:** inclui **#139** — botão **«Alinhar pagamento (Stripe)»** nas listas **Activas** e **Histórico** (detalhe expandido), além do fluxo órfão; continua **`super_admin`**.
- **Critério de “existe”:** capacidade só conta como **entregue para validação** se for **visível e utilizável no telemóvel** (Frank: deslocação / WC / fora de casa). DevTools com viewport móvel é apoio ao dev, não substituto.
- **Roles:** **admin** — tarefas do dia-a-dia **sem** grande decisão de sistema (ex.: aceitar utilizador, alterar password a pedido). **super_admin** — visão **omnisciente** e o que o admin **não** pode resolver com segurança (reconcile, overrides, ferramentas sensíveis).
- **Ritmo:** implementação em **bulk com juízo** + **Playwright o mais cedo possível**; smoke manual só quando for **inevitável**. Renomear ficheiros `.md` do repo fica **adiado**.
- **Backlog único:** [`UI_VISIBILITY_IMPLEMENTATION_TODO.md`](UI_VISIBILITY_IMPLEMENTATION_TODO.md) — inventário `TBD` → estados `visível` / `parcial` / `invisível` com notas e testes.

### Estado repo (2026-04-19 — pós-merge #132 + continuidade BD)

- **`main`:** inclui **#132** (`3458d0b` em diante) — reconciliação **por viagem**: `POST /admin/trips/{trip_id}/reconcile-payment-stripe` + botão **«Alinhar pagamento (Stripe)»** na tab **Viagens** (`super_admin`); cobre **cancelled/failed/completed** + `payment.processing` + PI real (cancelled não vira `failed` só por alinhar pagamento).
- **BD PROD (continuar):** ~38 linhas `pi_mock` + `completed` + `processing` — **SQL guiado** (SELECT contagem → UPDATE com `WHERE` fechado); ver [`TODOdoDIA.md`](../../TODOdoDIA.md) **«Hoje / próxima abertura — 2026-04-19»**.
- **Smoke:** viagem exemplo **2853939b-1e99-4dfe-9f69-71ca62b29936** após redeploy; **Saúde** (`stuck_payments` vs `inconsistent_financial_state` — critérios diferentes).
- **Sessão activa (paralelo):** **Onda T1** local `ride_db` quando retomares ([`TODOdoDIA.md`](../../TODOdoDIA.md) **«Hoje 2026-04-09»**).
- **Geladeira UI:** tabs admin + paginação lista stuck — tabela no topo do [`TODOdoDIA.md`](../../TODOdoDIA.md).
- **Princípio contínuo:** o que **não** estiver **no ecrã** não conta como entregue para validação operacional.

### Estado repo (2026-04-17 — pós-merge #123 + #124 + #125)

- **`main`:** SP-F v2 (#117) + Desbloquear (#118) + M1 login dica (#119) + fix tab Pendentes (#122) + **M1 Conta** (#121) + **M1 admin cauteloso** (#123) + **Onda T0** (#124 + #125).
- **Sessão activa:** **Onda T1** — purge SQL guiado `ride_db` **local** (ver [`TODOdoDIA.md`](../../TODOdoDIA.md) **«Hoje 2026-04-09»**).
- **OPS (Frank):** smoke **W2-E** pós-redeploy; BD PROD: um só `super_admin` se ainda aplicável.
- **Geladeira (não competir com T1):** tabela **«Próxima sessão — geladeira»** no [`TODOdoDIA.md`](../../TODOdoDIA.md).
- **Princípio contínuo:** o que **não** estiver **no ecrã** não conta como entregue para validação operacional.

### Arranque imediato (esta sessão)

**Nota (2026-04-18 noite):** na próxima abertura com foco **BD PROD + smoke #132**, seguir primeiro o bloco **Estado repo (2026-04-19)** e o [`TODOdoDIA.md`](../../TODOdoDIA.md) **«Hoje / próxima abertura — 2026-04-19»**; o tri abaixo mantém-se para **Onda T1** em `ride_db` **local** quando esse for o fio.

1. **Onda T1** — inventário + purge em `ride_db` (Docker local), 1–2 comandos por passo; **não** PROD neste fio.
2. **Smoke curto** — Admin Utilizadores + BETA após BD manejável.
3. **Smoke W2-E** — quando houver redeploy ([`W2_RUNBOOK.md`](../ops/W2_RUNBOOK.md)).

### Onda T — Lista admin + higiene de BD local (prioridade após alinhamento 2026-04)

**Contexto:** ~5000 `users` numa BD Docker de desenvolvimento torna a tab Utilizadores inútil (paginação 50 em 50); selecção em massa não pode perder-se a cada refresh; filtros devem ser previsíveis.

**T0 — Comportamento UI (rápido, sem tocar na BD)**

- Preservar `bulkSelectedIds` (e, se possível, texto de **Filtrar**) em cada refresh automático da lista; limpar só após acção confirmada (ex.: bulk block), mudança de tab, ou botão «Limpar selecção».
- **Filtro:** aceitável perder ao fechar o separador do browser ou fazer hard refresh — é o comportamento típico sem `sessionStorage`. Se quiseres **persistir filtro** entre reloads na mesma origem, o passo seguinte é `sessionStorage` só para chaves `adminUsersFilter` / `adminUsersSort` (opt-in).
- **Selecção:** **não** usar TTL de 30 s para desmarcar: é surpreendente; melhor **persistir até limpar** ou até sair da tab.
- **Código (2026-04-08):** `fetchUsers` deixou de limpar toda a selecção; mantém-se `bulkSelectedIds` e poda-se só a entradas cujo `id` não vem na 1.ª página devolvida (evita contagem fantasma após refresh).
- **Código (2026-04-17):** ao mudar `tab` para fora de `users`, limpar selecção em massa, confirmações (bloquear / eliminar / desbloquear) e campos de edição inline.

**T1 — Reduzir cardinalidade (local `ride_db`, não PROD)**  
**Em curso (sessão guiada)** — `psql` no `ride_db` local; primeiro passo: 2× `SELECT` inventário (`users` por `role`/`status` + `trips` totais / passageiros com viagem); depois `DELETE` só com critério acordado, 1–2 comandos de cada vez com pausa. **Não** aplicar este guia à BD Render/PROD nesta sessão salvo decisão explícita.

Escolher **um** caminho (da mais rápida à mais controlada):

1. **Nuclear (mais rápido em dev):** `docker compose down -v` (ou apagar volume PG) + `alembic upgrade head` + **um** seed documentado → 10 passageiros + 5 motoristas + admins; perdes histórico local (aceitável se não há dados que precises).
2. **Purge SQL guiado:** identificar padrão (ex.: telefones `+351900…`, nomes `%_test`, contas sem viagens) + `DELETE` em lotes com revisão de FKs; manténs migrações; mais trabalho de uma vez, zero downtime de “reaprender” volume.
3. **Bulk-delete na app:** só para **subconjuntos** já filtrados; com 4967 linhas continua penoso; útil como **remate** depois de T1.1 ou T1.2 terem cortado a cauda.

**T2 — Testes automáticos (backend) vs smoke no telefone (Frank)**

- **pytest / E2E:** utilizadores criados no teste devem ter **nome/telefone únicos por run** ou **teardown** que apaga; nunca depender de “lista curta” na BD global.
- **Telefone:** lista de contas no picker não deve crescer sem limite — convenção `_test` + BD local pequena (T1) resolve o dia-a-dia.

**T3 — Convenção de nomes (já alinhada)**  
`Driver_N_test`, `Passenger_N_test` (ou equivalente); parceiros/demo com sufixo claro; evitar hashes longas no `name` para leitura humana.

**T4 — Tickets / mensagens**  
Na **geladeira** do [`TODOdoDIA.md`](../../TODOdoDIA.md); não bloqueia T0–T2.

**Sequência global (super-prompts):** **B → A → G → D → C → E → F** — [`docs/super-prompts/README.md`](../super-prompts/README.md) (fila **fechada** para novas letras; **F** pode evoluir em v2+ sem nova letra). **O que vem a seguir** (legal na app, theming Portugal/ícone, vídeos + checklist) está **mapeado com nexo** no mesmo README, secção **«Depois da sequência»** — **sessões seguintes**, sem roubar foco a **M1**.

**Âncora paralela:** **Ondas M1** — [`TODOdoDIA.md`](../../TODOdoDIA.md) **«Hoje 2026-04-17»** quando fizer sentido. **Onda T** (acima) — dados + lista admin até a BD local ser **manejável**.

**Smoke pós-deploy (W2)** — [`W2_RUNBOOK.md`](../ops/W2_RUNBOOK.md): deep links, Saúde (guias SP-D), Operações, Utilizadores.

### Decisões Frank (purge + UI + paridade visual)

1. **T1 purge:** **SQL guiado**, 1–2 comandos de cada vez, com pausa para aprender — **não** nuclear por volume (para já).
2. **Filtro admin:** **sem `sessionStorage`** por agora; só corrigir perda no refresh dentro da SPA.
3. **Paridade “o cérebro só vê o que vê”:** alvo mental **10 passageiros + 5 motoristas** (+ staff) em **todos** os sítios onde mexes (local **e** staging/Render quando aplicável), com o **mesmo** seed / convenção `_test`, para a lista na app **parecer** igual.

**Parceiro (humano)** — **ADIA** — _fora do TODO_right_now_; **não bloqueia** SP-C nem M1.

### Não fazer ainda (inalterado)

- **Stripe Connect**; **`ENABLE_CONFIRM_ON_ACCEPT`** até decisão de pricing; **notificações push**; **M4** (vários modos de login); **API de rotas** estável além do existente — ver também **Seção D** «Não fazer ainda» histórica e **W7** no `TODOdoDIA` roteiro acelerado.

### Ondas M — Conta, password, correcções admin (compartimentado)

**Objectivo:** dados de conta claros (nome, telefone, nicks, email, documentação…) **sem** atropelar o que já existe; cada onda fecha com **fluxos visíveis** (app + admin).

| Onda            | Foco                                     | Entregável verificável (no ecrã)                                                                                                                                                                                                                                                                                                                                                                        |
| --------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M1**          | **Identidade mínima + password simples** | Utilizador vê/edita **nome** e **telefone** (já na BD onde aplicável); fluxo **redefinir password** num modo **único e simples** (ex.: canal já confiável — SMS / link — a acordar na sessão); **admin** corrige nome/telefone **com cautela** (secções separadas, confirmação, não misturar com «Guardar» genérico); **admin** dispara **reset de password a pedido** (accção dedicada + confirmação). |
| **M2**          | **Conta «produto»**                      | **Email** (opcional vs obrigatório — decisão única); **nick vs nome** (visibilidade passageiro/motorista); estados «em falta» / «por verificar» **visíveis** no perfil.                                                                                                                                                                                                                                 |
| **M3**          | **Documentação + audit**                 | Uploads / estados de documentos motorista-frota; **trilho de auditoria** para mudanças admin sensíveis; políticas do que o admin **não** pode mudar sozinho.                                                                                                                                                                                                                                            |
| **M4** (futuro) | **Vários modos de login**                | Telefone+OTP, email+password, magic link, etc. — **onda própria**; não misturar com M1.                                                                                                                                                                                                                                                                                                                 |

**Critérios transversais:** rate-limit em resets; bloquear edição de conta **blocked** sem fluxo explícito; telefone duplicado com erro **legível no ecrã**; logs/audit quando existir modelo.

---

## Recomendação

**Prioridade 1 — Concluída**

- Validação em campo: 4 dispositivos, rede móvel, fluxo completo — 100% positivo

**Prioridade 2 — Melhorias incrementais (se necessário)**

1. Ajustes de UI/UX na Web App
2. Confirmar agendador externo (ex. cron-job.org) a bater em `GET /cron/jobs` com `CRON_SECRET` — ver Seção F
3. Revisão do GUIA_TESTES.md com feedback do utilizador

**Prioridade 3 — Decisão pendente**

- **Quando o preço passa a ser definitivo?** (modo atual: no complete; modo futuro: antes de confirm)
- Definir antes de qualquer implementação de confirmação no accept
- Ver `STRIPE_CONFIRMACAO_FUTURA.md` no snapshot — [HISTORICO_FORA_DO_GIT.md](../HISTORICO_FORA_DO_GIT.md) — estratégias A, B, C

**Não fazer ainda**

- Não ativar `ENABLE_CONFIRM_ON_ACCEPT` até definir filosofia de pricing
- Não introduzir Stripe Connect
- Não alterar state machine, webhook ou fluxo financeiro

---

# Seção E — Assuntos Pertinentes Não Focados Anteriormente

1. **Migrations** — O projeto usa `create_all` + `_dev_add_columns_if_missing()`. Para produção, Alembic (ou equivalente) será necessário. A adição de novas colunas pode exigir scripts de migração.

2. **Testes automatizados** — O backend tem suite **pytest** (PostgreSQL recomendado). Ver `../IMPLEMENTACAO_E_TESTES.md`. Frontend: Vitest/React Testing Library ainda como evolução opcional.

3. **Distância / duração reais** — O pricing usa valores mock (2–5 km, 5–15 min). Integração com API de rotas (Google Maps, OSRM) seria o próximo passo para preços realistas.

4. **OTP em produção** — O auth usa OTP; em dev, `/dev/tokens` sem OTP. Para produção, configurar gateway SMS real.

5. **Segurança** — Tokens em memory no frontend; sem refresh token. Para sessões longas, considerar refresh flow.

6. **web-test-console** — Removido; a web-app substitui-o completamente.

7. **API de rotas** — O prefixo `/trips` (passenger) e `/driver/trips` (driver) estão separados. O role é validado pelo JWT; o token correto é usado conforme o pathname.

8. **Tema escuro** — O index.css foi alterado para forçar tema claro (`color-scheme: light`). O template Vite usava tema escuro por defeito, o que causava ecrã negro na vista do motorista.

---

# Como Correr

```bash
# Docker Desktop aberto primeiro
docker run --name ride_postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ride_db -p 5432:5432 -d postgres
# ou: docker start ride_postgres

cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000

# Outra janela: Stripe webhook
stripe listen --forward-to localhost:8000/webhooks/stripe

# Outra janela: Web App
cd web-app
npm run dev
# http://localhost:5173
```

Ver **[GUIA_TESTES.md](../testing/GUIA_TESTES.md)** para instruções completas e sequenciais.

---

# Ficheiros Chave

| Ficheiro                                     | Responsabilidade                                         |
| -------------------------------------------- | -------------------------------------------------------- |
| `app/services/trips.py`                      | Lógica trip; accept, complete, assign_trip (idempotente) |
| `app/services/trip_timeouts.py`              | run_trip_timeouts()                                      |
| `app/services/stripe_service.py`             | Wrappers Stripe                                          |
| `app/api/routers/webhooks/stripe.py`         | Webhook                                                  |
| `app/db/models/driver.py`                    | is_available                                             |
| `web-app/src/context/AuthContext.tsx`        | Token em memory; role derivado do pathname               |
| `web-app/src/context/ActivityLogContext.tsx` | Log e estado                                             |
| `web-app/src/components/ActivityPanel.tsx`   | Painel direito                                           |
| [GUIA_TESTES.md](../testing/GUIA_TESTES.md)  | Guia passo a passo para testes                           |

---

# Seção F — Operação (checklist consolidado)

_Conteúdo fundido a partir de `OPERATION_CHECKLIST.md` (stub em [OPERATION_CHECKLIST.md](../ops/OPERATION_CHECKLIST.md)); esse ficheiro aponta para aqui._

## F.0 Fecho de sessão antes de merge

Ordem fixa: **testes → audits → correcções → merge/PR** → actualizar **`PROXIMA_SESSAO.md`** e **`TODOdoDIA.md`** (Fecho do dia + Rasto para amanhã). O assistente **chama à ordem** se o fluxo divergir **sem** alinhamento (não é binário A/B: ver **Linha de foco e ramos** no mesmo ficheiro). Detalhe do fecho: secção **Ritual de fecho de sessão** em [`TODOdoDIA.md`](../../TODOdoDIA.md).

## F.1 Jobs agendados (timeouts + ofertas + cleanup)

### Opção recomendada — um único endpoint

- **Método / URL:** `GET /cron/jobs?secret=<CRON_SECRET>`
- **Auth:** query `secret` deve coincidir com variável de ambiente `CRON_SECRET` (configurar em produção).
- **Efeito:** executa `run_trip_timeouts`, expiração de ofertas + redispatch, e `run_cleanup`.
- **Frequência sugerida:** cada **30–60 s** (ajustar à carga; 60 s é aceitável na maioria dos MVPs).

Se `CRON_SECRET` não estiver definido, o endpoint responde **503** — configurar antes de confiar no agendador.

### Opção alternativa — JWT backoffice

- `POST /admin/run-timeouts` — **super_admin** + JSON `{ "governance_reason": "…" }` (≥10 caracteres).
- `POST /admin/run-offer-expiry` — idem.
- `POST /admin/cron/run` — idem (lote completo).

Token só **admin** (sem `super_admin`) recebe **403** `super_admin_required` nestes três.

## F.2 Verificações diárias (ou após deploy)

1. **`GET /admin/system-health`** (admin JWT) — rever `stuck_payments`, avisos e listas anómalas.
2. **Regra:** se `stuck_payments.length > 0` → investigar **já** (Stripe Dashboard, logs com `payment_intent_id`, webhook).

## F.3 Stripe webhook

- URL pública apontando para `POST /webhooks/stripe`.
- `STRIPE_WEBHOOK_SECRET` igual ao secret do endpoint no Stripe.
- Eventos mínimos: `payment_intent.succeeded`, `payment_intent.payment_failed`.

O handler devolve **200** mesmo quando o PaymentIntent não existe na BD (comportamento esperado para a Stripe) — usar logs e `system-health` para detetar anomalias.

## F.4 Logs correlacionados (A022)

Procurar por eventos (buffer / consola):

- `payment_capture_started`, `payment_capture_success`, `trip_completion_commit`
- `stripe_webhook_payment_succeeded`, `stripe_webhook_payment_failed`
- `trip_accepted` (inclui `payment_id`, `payment_intent_id`)
- `trip_state_change` em cancelamentos e conclusão (inclui `payment_id` quando existe)

## F.5 Testes automatizados (backend)

Com PostgreSQL a correr e `DATABASE_URL` válido:

```bash
cd backend
.\venv\Scripts\activate
pytest tests/test_consolidacao_tvde.py tests/test_a025_db_constraints.py tests/test_a026_cron_ops.py -q
```

Sem PostgreSQL, estes testes fazem **skip** explícito.

## F.6 Migração A025 — `payments.stripe_payment_intent_id` UNIQUE

Antes de aplicar: **backup** (`pg_dump`). Script em `backend/sql/a025_payments_stripe_pi_unique.sql` (detetar duplicados, limpar, `ALTER TABLE` + índice em `status`).

Em produção/staging: correr o SQL na BD correta após validar que não há duplicados (ou após limpeza). Novas instalações com `metadata.create_all` herdam o `UniqueConstraint` do modelo.

### Validação manual (só operador)

1. **Contagem de linhas** — antes do `DELETE` de duplicados e depois (não automatizado no repo):
   - `SELECT COUNT(*) FROM payments;`
2. **Duplicados zero** — antes do `ALTER TABLE`:
   - `SELECT stripe_payment_intent_id, COUNT(*) FROM payments WHERE stripe_payment_intent_id IS NOT NULL GROUP BY 1 HAVING COUNT(*) > 1;`
   - Deve devolver 0 linhas.
3. **Testes automáticos** (com Postgres + migração aplicada):
   - `pytest tests/test_consolidacao_tvde.py tests/test_a025_db_constraints.py tests/test_a023_security.py -q`

## F.7 A026 — Operação (cron + runtime real)

Especificação completa: `../prompts/A026_OPERACAO_OPS.md`.  
Relatório de testes A026: arquivado fora do Git — ver [HISTORICO_FORA_DO_GIT.md](../HISTORICO_FORA_DO_GIT.md).

### CRON

- **Endpoint:** `GET /cron/jobs?secret=<CRON_SECRET>`
- **Frequência:** **30 s** (ideal) ou **60 s** (aceitável) via agendador externo (ex. cron-job.org).
- **Regra:** em produção o cron **não** pode depender só de chamadas manuais.
- **Logs:** após cada execução com sucesso aparecem eventos `cron_jobs_run`, e quando aplicável `trip_timeouts_applied`, `cron_cleanup_audit_events`.

### Verificação diária

- `GET /admin/system-health` (JWT admin).
- Em condições normais: **`stuck_payments`** deve estar **vazio** (lista vazia).
- Rever também `trips_accepted_too_long`, `trips_ongoing_too_long`, `inconsistent_financial_state` se existirem entradas.

### Alertas (operador)

- Pagamento em `processing` **> ~10 min** → aparece em `stuck_payments` (investigar Stripe / webhook).
- Viagens que **não evoluem** dentro dos limiares de `trip_timeouts` + listas do system-health.

### Teste manual (resumo)

1. Trip em `assigned` sem aceitar → após **> 2 min** e com cron a correr → deve passar a `requested` (timeout).
2. Pagamento preso em processing → confirmar entrada em `stuck_payments` até resolução.

## F.8 Pricing no `complete_trip`

Se aparecer resposta **422** com `trip_metrics_required_before_completion`, a viagem não tem `distance_km` / `duration_min` na BD — corrigir dados ou fluxo que cria a viagem (o fluxo normal de `create_trip` preenche métricas).

---

# Seção G — Relatório projeto / roadmap (março 2026)

_Conteúdo fundido a partir de `RELATORIO_PROJETO_ROADMAP.md` (stub em [RELATORIO_PROJETO_ROADMAP.md](RELATORIO_PROJETO_ROADMAP.md)); esse ficheiro aponta para aqui._

Documento descritivo (nem genérico nem exaustivo). Estado verificado no código em **março de 2026** (incl. Alembic, dedup de webhook por `evt_`, CI com Postgres + migrações, audit JSONB e job de saúde no cron).

## G.1 O que o projeto é hoje

Plataforma **TVDE / ride-sharing** (tipo Uber/Bolt): passageiro pede viagem, motorista aceita e conclui, pagamento com **Stripe manual capture**. A **viagem** passa a `completed` no `complete_trip` após capture na API; o **pagamento** (`payments.status`: `processing` → `succeeded` / `failed`) é confirmado pelo **webhook Stripe** — separação explícita: trip = operacional, payment = financeiro, webhook = SoT só para pagamentos. Há **Web App** (React, Vite, TypeScript) para validação humana, com painel de log/estado, e **backend FastAPI** com regras operacionais (disponibilidade do motorista, timeouts, ofertas, matching) que já ultrapassam o MVP “só state machine + Stripe” descrito no roadmap original.

Validação em campo (4 telemóveis, rede móvel) e testes Render estão registados como concluídos neste handoff.

## G.2 Alinhamento com o roadmap

### Fase 1 — Modelo financeiro real

**No roadmap:** pricing engine, integração no `complete_trip`, `distance_km` / `duration_min`, `driver_payout`, sem Connect.

**Na prática:** Implementado. O `complete_trip` recalcula preço, atualiza amount no PaymentIntent quando aplicável, confirma e captura; comissão vem de `driver.commission_percent`. OSRM opcional, haversine para estimativas.

**Conclusão:** Fase 1 **cumprida** no espírito do roadmap; falta refinamento (rotas reais estáveis, mais testes), não o esqueleto.

### Fase 2 — Web App MVP validável

**Na prática:** Existe `web-app/` com fluxos principais, DevTools, UX extra. O `web-test-console` foi substituído.

**Conclusão:** Fase 2 **cumprida** e **excedida** em alguns aspetos.

### Fora do roadmap original (mas presentes)

Timeouts de trip, `is_available`, race em `accept_trip`, dispatch/ofertas, cron/admin, métricas admin, localização, ratings, cancelamentos, etc. — **crescimento orgânico** do MVP.

### Observabilidade e consistência (em evolução)

- **`GET /admin/system-health`**, **`GET /cron/jobs`** com health check, webhook Stripe normalizado, audit JSONB com `model_dump(mode="json")`.
- Documentação: `../TVDE_BACKEND_PROXIMOS_PASSOS_OBSERVABILIDADE.md`; tabela API vs web-app quando existir no repo.

### Ainda não no roadmap “feito”

- **Confirmação no accept** (`ENABLE_CONFIRM_ON_ACCEPT`): não ativar sem decisão de pricing (doc `STRIPE_CONFIRMACAO_FUTURA.md` no snapshot — [HISTORICO_FORA_DO_GIT.md](../HISTORICO_FORA_DO_GIT.md)).
- **Stripe Connect**, **push**, **OTP/SMS produção** — futuros.
- **Alembic + tabela `stripe_webhook_events` + idempotência API Stripe** — **feitos**; pormenores e checklist de entrega: **`../architecture/TVDE_ENGINEERING_ROADMAP.md`** (atualização 2026-03-28).

### Git / PRs (higiene)

- Preferir **PRs separados** por tema (Stripe vs cron vs observabilidade) ou descrição explícita no PR para revert claro.

## G.3 Conclusão (estado do trabalho)

O núcleo (**financeiro + UI validável**) está **fechado** em “funciona de ponta a ponta e foi testado em condições reais”. O que **não** está fechado é a **próxima geração**: preço definitivo, SCA no accept, Connect, endurecimento de produção (backups formais, auditoria A034). **Idempotência por `stripe_event_id`** no webhook está implementada (`stripe_webhook_events`). Escala futura: ledger, filas — ver `../TVDE_BACKEND_PROXIMOS_PASSOS_OBSERVABILIDADE.md`.

## G.4 Expectativas realistas

| Expectativa                       | Realidade                                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| “MVP demonstrável”                | Atendida.                                                                                                                                         |
| “Produção sem dívida”             | Parcial: Alembic **fechado**; **Falta** backups formais (A028), auditoria A034, suite de testes a crescer; cron + admin; reconciliação read-only. |
| “Mesmo roadmap antigo sem deriva” | O código já inclui features além do ROADMAP arquivado — verdade operacional no código + este handoff.                                             |

## G.5 Caminhos possíveis (ordem sugerida)

1. Decisão produto/financeiro — quando o preço é definitivo.
2. Endurecimento — pytest nos serviços críticos; **backups PG** (A028); **revisão A034**; checklist **Entrega da app** no [`TVDE_ENGINEERING_ROADMAP.md`](../architecture/TVDE_ENGINEERING_ROADMAP.md).
3. Operação — scheduler fiável para `GET /cron/jobs`; painel Saúde.
4. Escala — SSE/WebSocket vs polling quando justificado.
5. Monetização motorista — Stripe Connect após modelo congelado.

## G.6 Verificação de código — dead code e duplicação

### Dead code (exemplos já tratados)

| Item                                | Nota                                               |
| ----------------------------------- | -------------------------------------------------- |
| ~~`create_payment_for_trip`~~       | Removido (A022).                                   |
| `calculate_driver_payout`           | Comissão em `driver.commission_percent` + `trips`. |
| ~~`emit_many`~~ / ~~`DomainEvent`~~ | Removidos na consolidação de eventos.              |

### Duplicação

| Tema                  | Onde                          | Comentário                         |
| --------------------- | ----------------------------- | ---------------------------------- |
| Haversine             | `app/utils/geo.py`            | `matching` importa `haversine_km`. |
| Serialização de trips | `app/api/serializers/trip.py` | Centralizada entre routers.        |

### Web App

- `usePolling` com `deps` explícitos; risco residual: ficheiros legacy após refactors.

## G.7 Onde está cada coisa

| Necessidade                         | Onde ir                                                                                                                                         |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Continuar amanhã                    | Este ficheiro (`PROXIMA_SESSAO.md`)                                                                                                             |
| Roadmap engenharia + A023–A035      | [`TVDE_ENGINEERING_ROADMAP.md`](../architecture/TVDE_ENGINEERING_ROADMAP.md)                                                                    |
| UX web-app (mini roadmap + prompts) | [`UX_MINI_ROADMAP_E_PROMPTS.md`](../prompts/UX_MINI_ROADMAP_E_PROMPTS.md)                                                                       |
| Roadmap histórico / Stripe futuro   | Snapshot local — [HISTORICO_FORA_DO_GIT.md](../HISTORICO_FORA_DO_GIT.md) (`archive/docs_2026_03_22/ROADMAP.md`, `STRIPE_CONFIRMACAO_FUTURA.md`) |
| Testes manuais                      | [GUIA_TESTES.md](../testing/GUIA_TESTES.md)                                                                                                     |
| Observabilidade backend             | [`TVDE_BACKEND_PROXIMOS_PASSOS_OBSERVABILIDADE.md`](../TVDE_BACKEND_PROXIMOS_PASSOS_OBSERVABILIDADE.md)                                         |
| Índice de docs                      | [DOCS_INDEX.md](DOCS_INDEX.md)                                                                                                                  |
| Implementação + logs + pytest       | [`IMPLEMENTACAO_E_TESTES.md`](../IMPLEMENTACAO_E_TESTES.md)                                                                                     |

_Relatório fundido para apoio à decisão; não substitui o código._
