# W2 — Runbook de incidentes (desenho): tudo visível online, sem Swagger

**Estado:** desenho / acordo de produto — **não** substitui implementação até fecharmos fases abaixo.  
**Objectivo:** responder a incidentes (pagamento preso, viagem presa, motorista bloqueado, avisos de saúde) **só com o browser**, na **área Admin** da mesma app que já usas em produção — **sem** abrir Swagger, **sem** copiar `Bearer` para o Postman, **sem** montar `curl` com `trip_id` à mão excepto quando a UI ainda não oferece atalho (interim).

**Referências:** [`AdminDashboard.tsx`](../../web-app/src/features/admin/AdminDashboard.tsx) (tabs + query + Operações W2-D), [`adminDashboardQuery.ts`](../../web-app/src/features/admin/adminDashboardQuery.ts), [`healthTripLinks.ts`](../../web-app/src/features/admin/healthTripLinks.ts), [`stripeDashboard.ts`](../../web-app/src/utils/stripeDashboard.ts), [`web-app/src/api/admin.ts`](../../web-app/src/api/admin.ts), [`system_health.py`](../../backend/app/services/system_health.py), [`W1_PROD_SMOKE.md`](W1_PROD_SMOKE.md).

---

## 1. Princípios

| Princípio | Implica |
| --------- | ------- |
| **Uma sessão** | Login **admin** (OTP ou fluxo actual); o `token` fica no contexto da app — nada de colar JWT em ferramentas externas. |
| **Navegação, não API crua** | Cada passo do runbook mapeia para **tab + botão** (ou lista clicável). |
| **IDs só quando inevitável** | Preferir **seleccionar** viagem/motorista a partir de listas; onde hoje é UUID manual (ex.: recuperar motorista), planear **picker** ou link «usar desta linha». |
| **Evidência exportável** | CSV de logs / JSON de saúde já existentes; no futuro, bloco «copiar para disputa Stripe» com texto pré-formatado (sem segredos). |

**Anti-objectivos (para já):** documentar fluxos que dependem de Swagger; pedir ao operador para ir à BD com SQL.

---

## 2. Inventário — o que **já** tens no Admin (v0 operacional)

Mapeamento **tipo de problema → tab Admin → acção**. Isto já permite um **runbook humano v0** (abrir app → `/admin` → seguir tabela).

| Incidente / checagem | Tab | Acções existentes (resumo) |
| -------------------- | --- | --------------------------- |
| «Está tudo pronto?» (env, cron, Stripe) | **Operações** | FASE 0 «Verificar»; `CRON_SECRET` / `STRIPE_WEBHOOK_SECRET` / flags; **Correr cron agora** (equiv. manual ao job agregado). |
| Timeouts / ofertas / cleanup sem esperar agendador | **Operações** | **Executar timeouts**; **Expirar ofertas e redispatch**; **Exportar logs CSV**. |
| Motorista `is_available` preso (sem viagem ativa) | **Operações** | **Recuperar motorista** — lista a partir de saúde + UUID manual opcional (**W2-D**). |
| Viagens activas, cancelar, ver detalhe / debug | **Viagens** | Lista + detalhe + acções admin já ligadas ao `trip_id` **sem** API manual. |
| `system_health`, viagens longas, avisos | **Saúde** | **Atualizar**; JSON de warnings e listas (ex.: `trips_accepted_too_long`) — **gap**: saltos directos para a tab Viagens com filtro. |
| Números agregados | **Métricas** | Indicadores; uso para contexto. |
| Utilizadores pendentes / frota | **Pendentes**, **Frota**, … | Fora do núcleo W2, mas na mesma shell. |

**Conclusão v0:** grande parte do W2 **já é possível** sem Swagger; o «ódio» ao copy-paste concentra-se em **poucos buracos** (UUID manual, saltos entre Saúde ↔ Viagens, pagamentos Stripe sem painel dedicado).

---

## 3. Gaps (prioridade para **acertarmos** depois do desenho)

1. **Recuperar motorista** — **W2-D:** lista a partir de `drivers_unavailable_too_long` + **UUID manual** em `<details>` para excepções.
2. **Saúde → viagem** — **W2-C:** botão **«Abrir em Viagens»** por linha (usa `?tab=trips&tripId=`); linhas só com motorista continuam só com JSON + Operações.
3. **Pagamento / Stripe** — **W2-D:** em **Operações**, card **Pagamentos em processing (saúde)** com `pi_…` + links dashboard (live/test) + **Abrir em Viagens**; sem tab dedicada «Pagamentos».
4. **Runbook textual na app** — secção colapsável «Se pagamento preso → …» **dentro** do Admin (markdown estático ou CMS futuro), espelhando [`W1_PROD_SMOKE`](W1_PROD_SMOKE.md)-style checklists — opcional fase tardia.

---

## 4. Fases de implementação (proposta — afinar contigo)

| Fase | Entrega | Critério «feito» |
| ---- | ------- | ----------------- |
| **W2-A** | **Runbook v0 só docs** — [`W2_RUNBOOK.md`](W2_RUNBOOK.md) (passos literais Admin-only). | **Feito** no repo; revisão tua «consigo seguir só com isto» em campo real. |
| **W2-B** | **Deep links mínimos** — query `?tab=health` / `?tab=trips&tripId=` (ou router state) para partilhar link contigo / mentor sem Swagger. | **Feito** na web-app (`AdminDashboard` + query); colar URL abre a tab certa; login preserva `?tab=` / `tripId`. |
| **W2-C** | **Saúde → acções** — botão **«Abrir em Viagens»** por linha com `trip_id` / `id` de viagem (listas de saúde + financeiras); cancelar continua na tab Viagens. | **Feito** na web-app para linhas com viagem; motorista-only sem atalho de viagem. |
| **W2-D** | **Motorista picker** + eventual **painel mínimo pagamentos** (só leitura + links externos Stripe). | **Feito:** lista de recuperação a partir de saúde + manual em `<details>`; card stuck payments em Operações + `stripe_payment_intent_id` na API. |

Ordem sugerida: **A → B → C → D**. Paralelo: item **parceiro** / legal continua fora deste ficheiro.

---

## 5. Fora de escopo (explicitamente)

- Substituir o Stripe Dashboard (sempre necessário para disputas / detalhe de charge).
- App móvel nativa — web admin basta para W2.
- RBAC novo além do **admin** actual — multi-tenant «ops viewer» é história à parte.

---

## 6. Próximo passo (processo)

1. Leres este desenho e dizeres **sim / ajustes** (o que cortar, o que subir de prioridade).  
2. Escrever **W2-A** (`W2_RUNBOOK.md` operacional) no mesmo PR ou PR seguinte.  
3. Só depois **código** (B–D) em PRs pequenos.

Quando fecharmos o desenho, actualizar [`TODOdoDIA.md`](../../TODOdoDIA.md) (linha W2 / Rasto) com a fase acordada.
