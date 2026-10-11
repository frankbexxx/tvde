# D-DEMO-1 — Checkpoint walkthrough multi-role (2026-07-16)

**Estado:** **PASS** funcional (local Dev).  
**`main`:** `624ab4e` (inclui PR **#405** NAV/WAZE-1 Opção B).  
**Ambiente:** Dev local; execução final em várias janelas **Vivaldi** (vista partilhada) para reduzir ruído entre browsers.

**Handoff vivo:** [`TODOdoDIA.md`](../../TODOdoDIA.md) · [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md) · [`FORWARD_PLAN_2026-07.md`](FORWARD_PLAN_2026-07.md)

---

## 1. Partner / Frota

| Área | Resultado |
|------|-----------|
| Login, Home/KPIs, Frota hub, lista motoristas, mapa live | OK |
| Caixa / mensagens / aviso à frota | OK |
| Viagens / Relatórios / CSV base | OK |
| Perfil / Definições / Menu | OK |

**Conclusão:** Partner é **demonstrável** como ferramenta operacional base.

**Gaps produto futuros (PARTNER-FLEET-1):**

- Entidade **Viatura**
- Documentos de viatura
- Associação motorista ↔ viatura
- Rendimentos por frota / motorista / viatura

*(Foco do walkthrough: lacunas de produto — não polish de copy PT.)*

---

## 2. Admin

| Área | Resultado |
|------|-----------|
| Agora (dashboard operacional) | OK |
| Viagens activas / histórico (base) | OK |
| Operações (painel super_admin) | OK |
| Saúde (anomalias / playbook) | OK |
| Utilizadores | OK |
| Frota admin (bootstrap parceiros) | OK |
| Documentos | OK como **placeholder** («módulo em implementação» / não backend real) |

**Conclusão:** Admin é **funcional** como ferramenta interna. Não está optimizado para mobile/Android; polish visual **não** é prioridade agora.

**A avaliar com mais detalhe (ADMIN-OPS-1):**

- Detalhe de viagem
- Acções de correcção / desbloqueio
- Runbook de pagamentos presos

---

## 3. Circuito multi-role (PASS)

Observado com Passenger + Driver + Partner + Admin:

1. Passenger cria pedido  
2. Driver vê viagem no mapa  
3. Admin vê trip `requested`  
4. Driver aceita  
5. Passenger vê motorista a caminho  
6. Partner acompanha no mapa live  
7. Driver inicia viagem  
8. Admin vê `ongoing`  
9. Driver termina viagem  
10. Passenger recebe avaliação final  
11. Partner vê detalhe `completed`  
12. Admin deixa de ter viagem activa  

**Veredicto D-DEMO-1:** **PASS** funcional.

---

## 4. NAV / WAZE (produto — Manel 2026-07-16)

Comportamento esperado (prática Uber/Waze):

- Navegação externa abre por **botão**
- **Não** abrir automaticamente em cadeia
- Botão «Abrir navegação» **sempre visível** quando existe próxima acção de condução

**#405 (já em `main`):** online sem nav; aceitar → recolha (opt-out); iniciar → sem auto-nav; manual → destino.

**Futuro (NAV-ROUTE-STOPS / NAV-WAZE-2):** botão aponta para `nextStop`; com paragens múltiplas, driver vê próxima paragem activa e abre nav **manualmente**; reutilizar mesma janela/app se a plataforma permitir.

---

## 5. Incidente local — DB pool / Admin poll

| Item | Nota |
|------|------|
| Sintoma | `QueuePool limit of size 5 overflow 10 reached, timeout 30.00` |
| Postgres | Continuou vivo |
| Backend | LISTENING mas instável; reiniciar uvicorn recuperou |
| Leak clássico | Improvável (`get_db` fecha sessão) |
| Causa provável | Stress local + pool default 5+10 + Admin ~7 endpoints em paralelo / ~8s; `/admin/system-health` pesado; `/health` no mesmo pool |

**Decisão:** não bloqueia D-DEMO-1. Backlog **BACKEND-DBPOOL-1 / ADMIN-POLL-1** — ver [`BACKLOG_POST_PILOTO.md`](../meta/BACKLOG_POST_PILOTO.md). Produção intocada até diagnóstico.

**Workaround walkthrough:** ≤2 roles ou fechar Admin; reiniciar uvicorn se saturar.

---

## 6. Amanhã (docs → depois 1 carril funcional)

| Passo | Acção |
|-------|--------|
| A | Confirmar este checkpoint + painéis alinhados |
| B | **Commit docs-only** |
| C | **PR docs-only** → `main` |
| D | Escolher **1** carril funcional |

**Candidatos pós-PR docs:**

1. **TW-TRIP-COPY-1** — mensagens passenger/driver/pagamento para demo  
2. **ADMIN-POLL-1 / BACKEND-DBPOOL-1** — reduzir poll Admin + aliviar pool  
3. **ADMIN-OPS-1** — detalhe viagem, desbloqueios, pagamentos stuck  
4. **PARTNER-FLEET-1** — viaturas, docs, associação, rendimentos  
