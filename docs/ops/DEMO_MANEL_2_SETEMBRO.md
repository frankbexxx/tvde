# DEMO MANEL 2 — guião (Setembro)

**Objectivo:** demo alargada, execução humana em **produção**.  
**Base:** núcleo Manel 1 + [`DEMO_4_PAPEIS.md`](DEMO_4_PAPEIS.md).  
**Duração alvo:** ~15–20 min (+ extras se sobrar tempo).  
**Não escrever passwords neste ficheiro.** Contas: ver runbook 4 papéis (só telefones).

---

## 1. Preparação (antes da chamada)

| # | Acção |
|---|--------|
| 1 | `GET /health` na API Render → OK (aguardar cold start se preciso) |
| 2 | Abrir **4 janelas/perfis** (Pax · Driver · Partner · Admin/SA) |
| 3 | Driver: GPS on, perto da zona do pickup; **online / disponível** |
| 4 | Confirmar Partner e Admin com **credenciais próprias já configuradas** (não demo) |
| 5 | Ensaio mental: matching falha → Plano B (§5) |
| 6 | **Não** ensaiar Admin recovery no guião principal |

---

## 2. Sequência principal (obrigatória)

| # | Quem | Acção | Esperado |
|---|------|--------|----------|
| 1 | — | Health + 4 logins | Todos entram |
| 2 | Pax | Pedir viagem | Searching / pedida |
| 3 | Driver | Ver oferta → **Aceitar** | `accepted` |
| 4 | Driver | Ir ao pickup → **Iniciar** | `ongoing` |
| 5 | Pax | Ver estado / mapa | Coerente com Driver |
| 6 | Driver | **Terminar** | `completed` |
| 7 | Pax | Rating (se pedido) | OK |
| 8 | Partner | Home / KPIs · Frota · Viagens | Lista saudável; viagem recente se aparecer |
| 9 | Admin | Agora · Viagens (leitura) · Saúde | Carrega; refresh manual OK |

**Admin:** só leitura operacional. **Não** assign diário · **não** demote/delete · **não** “recovery” salvo emergência ensaiada (§5).

---

## 3. Extras (só se houver tempo)

| Ordem | Extra | Como dizer / fazer |
|-------|--------|---------------------|
| A | **Recusar oferta** | 2.º pedido: Driver **Recusar** (≠ Silenciar). Pax continua a procurar / `requested`. |
| B | **Partner mapa** | Mostrar mapa live. Frase: *«visão operacional em evolução — não é tracking perfeito.»* |
| C | **ActiveTrip F5** | Só se sobrar tempo: Pax faz refresh a meio. Pode parecer estranho — opcional. |

Ordem sugerida dos extras: **A → B → C**.

---

## 4. Frases de enquadramento (se perguntarem)

| Tema | Dizer |
|------|--------|
| **B2 next-trip** | *«Decidido em produto (1 viagem + 1 em fila). Groundwork feito; **ainda OFF** — não está na demo.»* |
| **Stripe / pagamento real** | *«Nesta fase usamos mock. Stripe live / payouts **não** estão nesta demo.»* |
| **PF3D / docs viatura** | *«Gates de documentos **OFF**. Docs reais / bloqueio por compliance **fora** desta sessão.»* |
| **Admin** | *«Ferramenta de excepção e leitura. Matching / frota do dia = Partner + app.»* |

---

## 5. Plano B (matching / viagem falha)

1. Driver online? GPS perto do pickup? Refresh Driver + novo pedido Pax.  
2. Esperar Render acordar; repetir health.  
3. Se continuar a falhar: **parar fluxo viagem**; mostrar Partner (frota/viagens) + Admin Agora.  
4. Admin recovery / force: **só** se já ensaiado e necessário — não improvisar.  
5. Encerrar com o que está estável; anotar para re-smoke offline.

---

## 6. Checklist pós-demo

| # | Item | OK? |
|---|------|-----|
| 1 | Viagem completa (ou Plano B documentado) | ☐ |
| 2 | Partner visto sem erro bloqueante | ☐ |
| 3 | Admin leitura OK (sem papel de dispatcher) | ☐ |
| 4 | Extras feitos / skip anotados (Recusar · mapa · F5) | ☐ |
| 5 | Feedback Manel (3 bullets) escrito | ☐ |
| 6 | Nada prometido: B2 ON · Stripe live · PF3D ON | ☐ |

---

**Fora desta demo:** B2 activo · Stripe real · PF3D ON · Docker/backend local · Admin dispatcher · passwords no ecrã partilhado.
