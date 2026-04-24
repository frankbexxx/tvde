# BACKLOG_POST_PILOTO.md — Ideias e decisões pós-Alpha 25/04

> **Criado 2026-04-23 noite (D-2).**
>
> **Objectivo:** parqueamento disciplinado de ideias e decisões pequenas que emergiram durante a preparação do piloto Alpha 2026-04-25, mas que foram **conscientemente adiadas** para não introduzir risco a D-2 / D-1 / D.
>
> **Não duplica** `PROXIMA_SESSAO.md` (handoff do dia) nem `ALPHA_2026-04-25.md` (plano operacional). Este ficheiro é o parking lot pós-piloto.
>
> **Regra:** ao mergear um destes items, remover daqui com `✅ fechado em #PR` + linha apontando para o commit.

---

## Contexto

Piloto Alpha 25/04 foi redesenhado 2026-04-23 (tarde/noite) para formato **informal reduzido**:

- 1 casal amigo (pessoa A = passenger, pessoa B = driver) vindo de Cascais para Oeiras
- Frank + parceiro no Chá da Barra Vila, Oeiras, a acolher e monitorizar
- 4 contas principais + 2 reserva (ver `ALPHA_2026-04-25_ONDA0_RUNBOOK.md §E`)
- Handouts bilingue EN+PT em PDF distribuídos via WhatsApp (ver `docs/_local/pilot_handouts/`)
- Freeze D-1 continua aplicado: **zero código novo pós-freeze**. As ideias abaixo entram **depois** do piloto + retro.

---

## P1 — Items emergidos do redesenho do piloto (prioridade alta pós-retro)

### P1.1 Admin Dashboard — mini-mapa de viagem activa

**Origem:** ideia do Frank 2026-04-23 durante a definição do piloto informal.

**Problema:** hoje o admin mostra viagens activas como **lista de texto** (linhas 2480-2573 de `AdminDashboard.tsx` — coords origem/destino em texto, status, timestamps). Não existe visualização georreferenciada. Durante o piloto 25/04, a monitorização em tempo real é feita via **WhatsApp Live Location do driver** (workaround sem código), o que funciona para 1 viagem mas não escala.

**Proposta:**

- Na aba Viagens → ao seleccionar trip activa, abrir painel lateral com **mini-mapa MapLibre** (já usado noutras partes da app)
- Marcadores: origem, destino, **posição actual do driver** (via endpoint que já existe em `driver_location.py`)
- Polling leve (5-10s) enquanto o painel está aberto; stop polling quando fecha
- Status ribbon sobre o mapa (searching/accepted/arriving/ongoing/complete)

**Valor estratégico:** torna-se **selling point para investidor** ("nosso centro de operações em tempo real"). Actualmente o admin é ferramenta interna; com o mapa passa a demonstrável.

**Custo estimado:** 1-2 dias de trabalho calmos pós-piloto (MapLibre wrapper já existe, endpoints de driver location já existem, o esforço é UI + state sync + testes).

**Risco se fizéssemos pré-piloto:** alto (MapLibre tem ciclo de vida tricky, polling pode degradar performance, testes RTL de mapas são finicky). Adiar foi decisão correcta.

---

### P1.2 Pós-piloto cleanup — escolher caminho para users reais

**Origem:** conversa Frank 2026-04-23, decisão explícita de separar "fase alpha" de "fase comercial".

**Problema:** depois do piloto 25/04, as 6 contas `Alpha *` ficam em BD prod sem email, sem morada, sem compliance. Antes da fase comercial, é preciso:

1. Decidir destino destas 6 contas:
   - **Opção A:** `UPDATE users SET status='blocked'` (mantém histórico para retrospectiva, bloqueia login)
   - **Opção B:** `DELETE` cascata (limpa tudo — cascade apaga trips/payments/audit_events via FK)
2. Criar os primeiros users **reais** (Frank, esposa, parceiro, amigos, família) com esquema completo: email, morada, documento, consentimento RGPD.
3. Implementar fluxo de onboarding que **obriga** estes campos em cadastros a partir de X data.

**Tarefas concretas:**

- [ ] Decisão A vs B — depende do que a retrospectiva mostrar (se piloto correu bem, histórico alpha vale a pena manter read-only; se falhou feio, limpar).
- [ ] Migração `ALTER TABLE users ADD COLUMN email`, `address`, `consent_given_at`, etc. (schema ainda não suporta).
- [ ] Endpoint / UI para registo com estes campos obrigatórios.
- [ ] Política de `DEFAULT_PASSWORD`: remover ou rodar imediatamente após piloto (agora é `123456`, inaceitável em prod real).

**Custo estimado:** 3-5 dias. Decisão prévia de produto (scope legal/RGPD) é o bloqueador.

---

### P1.3 WhatsApp Live Location → feature de produto (1ª explorar, 2ª decidir)

**Origem:** workaround adoptado para o piloto 25/04 (partilha de localização em tempo real via WhatsApp entre driver e Frank) revelou-se **tão útil** que vale investigar se há forma de integrar nativamente.

**Problema/hipótese:** hoje, o driver tem de manualmente partilhar live location via WhatsApp. No futuro, o admin já vê o driver no mini-mapa (P1.1), o que torna isto redundante. **Mas:** o passageiro também beneficia de saber "onde o motorista está", e hoje vê-o no PassengerDashboard mapa. OK, talvez não haja nada novo aqui.

**Decisão:** parquear até pós-P1.1. Se a P1.1 estiver feita e a experiência for boa, esta fica `N/A`. Se ficar claro que há necessidade adicional (ex.: alguém exterior à viagem quer acompanhar), reavaliar.

---

## P2 — Polimento UI (decisões deliberadas de adiar em audit 2026-04-21)

### P2.1 StatusHeader — contraste em modo escuro

**Origem:** `AUDIT_DEEP_2026-04-21.md` findings — H.1 (StatusHeader contrast). Marcado `🟡 em aberto por decisão`.

**Tarefa:** ajustar tons do StatusHeader em dark mode para passar AA contraste em texto secundário. Não é bloqueador, mas merece polish antes de demo formal.

**Custo:** 30 min.

### P2.2 TripPlannerPanel — hint weight não-embedded

**Origem:** idem, finding E.3.

**Tarefa:** alinhar weight do hint "Começa por indicar o destino" em modo não-embedded para match com embedded (`font-normal` vs `font-medium`).

**Custo:** 10 min (muito provável que 2026-04-23 tarde já tenha resolvido isto — confirmar no audit actualizado).

**Nota:** verificado 2026-04-23 tarde como ✅ fechado em PR #167. Este item pode ser **removido** do backlog quando a próxima revisão confirmar.

### P2.3 DriverDashboard — painel GPS verboso

**Origem:** idem, finding D.3.

**Tarefa:** painel de GPS em DriverDashboard está a mostrar demasiada info técnica (lat/lng a 6 casas decimais, accuracy, heading, speed) num painel que poderia ser mais compacto / só-ícone-mais-detalhe-on-tap.

**Custo:** 1h.

**Nota:** deixado como está porque debug durante piloto é útil. Pós-piloto, esconder atrás de gesto/toggle.

---

## P3 — Housekeeping técnico

### P3.1 Reformatar `backend/app/sentry.py`

**Origem:** baseline D-2 (2026-04-23 manhã) — `ruff format --check .` identificou 1 ficheiro por reformatar que escapou ao PR #160.

**Tarefa:** correr `ruff format backend/app/sentry.py` e commit isolado.

**Custo:** 2 min + 1 PR trivial.

### P3.2 Test hardening — gaps identificados pós-PRs críticos

**Origem:** audit de cobertura dos PRs #162, #168, #169, #170, #171 (2026-04-23 manhã). Ver `docs/meta/AUDIT_STATUS_2026-04-23.md`.

**Gaps concretos:**

- `useGeolocation` — testes unitários para paths de erro (permission denied, timeout)
- `DEMO_ORIGIN` — regression test para garantir que é respeitado em `getCurrentPosition`
- `historyStatusDotColor` — testes de contrato para cada status
- `confirmExternalNav` — testes de aceitação (modal abre, botão CTA abre URL correcta, cancel não faz nada)
- Cross-boundary config — verificar que env vars não trespassam entre frontend/backend sem querer

**Custo estimado total:** ~90 min (agrupado num único PR "test: hardening post-pilot").

### P3.3 Integração Waze — exploração deeper

**Origem:** ideia do Frank 2026-04-23, marcada como "dúbia porque requer auth + phones de teste".

**Estado actual:** `utils/externalNavigation.ts :: wazeNavigateUrl` gera URL `https://waze.com/ul?ll=X,Y&navigate=yes`. Funciona sem login no Waze web e em Waze app quando o app está instalado.

**Ideia adicional:** poderíamos:

- Detectar se Waze app está instalado (via deep link `waze://`) e cair para web se não
- Pre-carregar waypoints intermédios (pickup depois destino) em vez de só destino único

**Decisão:** não justifica prioridade. URL actual cobre 90% dos casos. Reavaliar só se queixas explícitas dos drivers.

---

## Legenda de estado

- **P1** — prioridade alta pós-retrospectiva (2026-04-28 / 29)
- **P2** — pode entrar nos ciclos de polish de Maio
- **P3** — housekeeping, agrupar quando conveniente
- **✅ fechado em #PR** — movido para fora deste ficheiro

---

## Nota operacional

Quando um item entra em execução, criar:

1. Issue no GitHub com título alinhado ao nome aqui (ex.: `P1.1: Admin mini-map for active trips`)
2. Branch `feat/admin-live-trip-map` (ou similar)
3. Ao mergear, actualizar este ficheiro removendo o item e adicionando linha de fecho em histórico.
