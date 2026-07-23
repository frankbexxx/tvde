# OPS-UX-1 — Smoke PASS (2026-07-23)

**Estado:** **PASS funcional** (não UX final / polida)  
**`main` / `origin/main`:** ≥ `233255e` (merge [#450](https://github.com/frankbexxx/tvde/pull/450))  
**Pré-condição:** Partner-Fleet 1A/2/3B **PASS** · smoke geral Pax/Driver/Partner prévio OK  
**Handoff:** [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md) · checkpoint frota [`CHECKPOINT_2026-07-22_PARTNER_FLEET.md`](./CHECKPOINT_2026-07-22_PARTNER_FLEET.md)

---

## 1. Scope do OPS-UX-1

Navegação operacional mobile-first no Partner: caminhos directos para viagem activa, detalhe actualizável, e guardas contra dados stale / perda de acesso.

| Antes | Depois |
|-------|--------|
| Menu → Viagens → lista → detalhe | **Home** → Viagem activa → **Acompanhar** |
| Frota sem atalho à viagem | **Frota** → Em viagem → **Ver viagem** |
| Detalhe carregava 1× | **Actualizar** + auto-refresh leve |
| Risco stale / PII após 404 | Guardas [#448](https://github.com/frankbexxx/tvde/pull/448) · [#450](https://github.com/frankbexxx/tvde/pull/450) |

---

## 2. PRs incluídas

| PR | Slice | Nota |
|----|--------|------|
| [#445](https://github.com/frankbexxx/tvde/pull/445) | **OPS-UX-1A** | Frota / detalhe motorista — «Ver viagem» |
| [#446](https://github.com/frankbexxx/tvde/pull/446) | **OPS-UX-1B** | Trip detail — Actualizar + poll ~12s em live |
| [#447](https://github.com/frankbexxx/tvde/pull/447) | **OPS-UX-1C** | Home — cartão «Viagem activa» + «Acompanhar» |
| [#448](https://github.com/frankbexxx/tvde/pull/448) | Guard | Stale refresh / navegação A→B / reassign |
| [#450](https://github.com/frankbexxx/tvde/pull/450) | Guard | Soft refresh 401/403/404 limpa PII |

**Fechada sem merge:** [#449](https://github.com/frankbexxx/tvde/pull/449) — superseded by #448.

---

## 3. Smoke manual final (2026-07-23)

**Apps:** Passenger · Driver · Partner

| # | Passo | Resultado |
|---|--------|-----------|
| 1 | Passenger cria viagem | PASS |
| 2 | Driver recebe / aceita | PASS |
| 3 | Partner Home: «Nenhuma viagem activa» (antes) | PASS |
| 4 | Após accept: Home «Viagem activa» | PASS |
| 5 | Partner clica «Acompanhar» | PASS |
| 6 | Detalhe correcto da viagem | PASS |
| 7 | Partner «Actualizar» | PASS |
| 8 | Driver inicia viagem | PASS |
| 9 | Detail: accepted → ongoing | PASS |
| 10 | Driver termina viagem | PASS |
| 11 | Passenger: avaliação («Como correu…») | PASS |
| 12 | Driver: «Viagem concluída» → à espera | PASS |
| 13 | Partner detail: completed | PASS |
| 14 | Home volta a «Nenhuma viagem activa» | PASS |
| 15 | Métricas Partner actualizam | PASS |

---

## 4. Resultados por papel

### Passenger — PASS

Pedido criado · «Motorista a caminho» · «Viagem em curso» · ecrã de avaliação após conclusão.

### Driver — PASS

Recebe viagem · «A caminho do passageiro» · Iniciar · Em viagem · Terminar · «Viagem concluída» · volta a à espera.

### Partner Home — PASS

| Momento | Observado |
|---------|-----------|
| Sem activa | «Nenhuma viagem activa» |
| Durante | Cartão «Viagem activa» · estado accepted/ongoing · «Acompanhar» |
| Pós-completed | Volta a «Nenhuma viagem activa» |

### Partner Trip Detail — PASS

Viagem correcta · Actualizar · «Última actualização» · accepted → ongoing → completed · dados coerentes · reassign indisponível após `assigned` (mensagem correcta).

### Métricas Partner — PASS

| Métrica | Antes → Depois |
|---------|----------------|
| Total viagens | 58 → 59 |
| Concluídas | 47 → 48 |
| Concluídas hoje | 0 → 1 |
| Receita hoje (€) | 0.00 → 1.53 |

---

## 5. Guardas stale / access-loss

**Smoke:** sem troca de dados entre detalhes; `trip_id` correcto; Actualizar não trouxe snapshot errado; poll não bloqueou transições; Home limpou activa após completed.

**RTL (mantém regressão):**

| PR | Cobertura |
|----|-----------|
| **#448** | Stale ignoradas · A→B · poll×reassign · cleanup |
| **#450** | Soft 401/403/404 limpa PII · erro visível · transitório mantém snapshot |

---

## 6. Conclusão

**OPS-UX-1 = PASS funcional.**

Partner acompanha viagem activa sem listas longas; CTAs na Home e Frota; detalhe actualizável; guardas stale/access-loss em código + testes.

Isto **não** é UX final/polida — há polish futuro (não blocker).

---

## 7. Polish futuro (não blocker)

1. UX mobile mais limpa  
2. Painéis densos em scroll  
3. Alertas operacionais ocupam muito espaço  
4. Admin sem polish equivalente  
5. Home Partner — refinamentos visuais  
6. Trip Detail — cartões / patamares  
7. Documentos viatura — lista → detalhe (PF3B-UX-FOLLOWUP)  
8. Mensagens operacionais — agrupamento  
9. Mapa / painéis inferiores — afinação  
10. Métricas — links contextuais  

---

## 8. Próximos caminhos (escolher 1)

| Opção | Tema |
|-------|------|
| **A** | **PF3C** — alertas de caducidade (badges/resumo; sem gates) |
| **B** | **Admin OPS-UX** leve — Acompanhar / refresh / menos caminho |
| **C** | **Polish mobile Partner** — Home, detail, frota, documentos |
| **D** | **Smoke alargado** Pax+Driver+Partner+Admin |

---

## 9. Fora de scope deste fecho

Docs-only. Sem alterações runtime · sem migrations · sem env/secrets · sem DB · sem workflows.
