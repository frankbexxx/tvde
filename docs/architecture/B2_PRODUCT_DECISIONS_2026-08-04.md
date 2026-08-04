# B2 — Decisões de produto (next-trip chaining) · 2026-08-04

**Estado:** **GROUNDWORK PRÉ-FÉRIAS FECHADO** · feature continua **OFF** · zero runtime writers  
**Tip `main`:** `1671c9f` (#527)  
**Base técnica:** [`B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md`](B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md)  
**Handoff:** [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md) · painel [`TODOdoDIA.md`](../../TODOdoDIA.md)

---

## 1. Veredicto

| Item | Valor |
|------|--------|
| Modelo V1 | **Opção B** — 1 trip `ongoing` + no máximo **1** trip `queued` por motorista |
| Sistema actual (runtime) | Continua **sem** next-trip activo (flag OFF; sem writers) |
| Groundwork em `main` | Decisões (#525) · flags OFF (#526) · schema inerte (#527) |
| Produção | **OFF**; lifecycle/matching/UI só **pós-férias**, atrás de flag default OFF |

---

## 2. Produto aceite (V1)

| Decisão | Valor |
|---------|--------|
| Capacidade | Motorista pode aceitar **1** próxima viagem enquanto ainda está em viagem |
| Max queued | **1** queued trip por motorista |
| Critério de janela | **ETA até pickup** da próxima (não distância simples) |
| Janela default V1 | **≤ 12 minutos**, configurável por **env/config interna** |
| Painel Admin/Partner V1 | **Não** — sem UI de config na V1 |
| Passageiro (nova trip) | Vê mensagem clara: motorista está a **terminar outra viagem** |
| Cancelamento Pax | **Pode cancelar** a trip queued / em espera |
| Pagamento | **NÃO** autorizar na accept da queued · autorizar **só na promoção** da queued |
| V2 (futuro) | Configuração por zona/categoria em Admin/Partner |

### Flags / config (Settings — groundwork; sem consumers runtime)

Naming alinhado a `ENABLE_*` / `*_MINUTES` em `backend/app/core/config.py`:

```text
ENABLE_NEXT_TRIP_CHAINING=false           # default — zero impacto OFF (sem consumers ainda)
NEXT_TRIP_MAX_PICKUP_ETA_MINUTES=12       # teto ETA até pickup (V1); unused até B2-MATCH-ETA
```

**Nota:** nomes antigos do rascunho (`NEXT_TRIP_CHAINING_ENABLED`, `NEXT_TRIP_WINDOW_MINUTES`) foram substituídos por estes.

---

## 3. Riscos (mantêm-se / reforçados)

| Risco | Severidade |
|-------|------------|
| Double-booking se complete/cancel libertar matching com queued viva | **Alto** |
| Timeout errado se queued for tratado como `accepted` | **Alto** |
| PaymentIntent / autorização cedo demais (na accept da queued) | **Alto** |
| FE actual assume `activeTrip` singular (Driver/Pax/Partner) | **Alto** |
| Regressão Availability Guard (Caso A/B) | **Alto** |
| ETA fallback enganoso (`duration_min − elapsed`) vs 12 min reais | **Alto** |
| Races accept × complete × timeout × force-online × matching | **Alto** |

---

## 4. Plano faseado

| # | ID | Item | Estado |
|---|-----|------|--------|
| 1 | **B2-PRODUTO-DOCS** | Este documento + notas painel/handoff | **Concluído** — [#525](https://github.com/frankbexxx/tvde/pull/525) |
| 2 | **B2-CONFIG** | Flags OFF + defaults; **sem consumers** | **Concluído** — [#526](https://github.com/frankbexxx/tvde/pull/526) |
| 3a | **B2-SPIKE-BE-1** | Enum `queued` + SM declarativa + unique partial index max 1; **zero writers** | **Concluído** — [#527](https://github.com/frankbexxx/tvde/pull/527) · `1671c9f` |
| 3b | **B2-SPIKE-BE-2** | Helpers sibling-aware (complete/cancel); **OFF** | **Pós-férias** |
| 3c | **B2-SPIKE-BE-3** | Accept → queued **sem** PI; promote no complete; PI **só** na promoção; **OFF** | **Pós-férias** |
| 4 | **B2-MATCH-ETA** | Elegibilidade chain: ongoing + ETA ≤ janela; **OFF** | **Pós-férias** |
| 5 | **B2-UI-MIN** | Driver current+next; Pax mensagem + cancel; **OFF** | **Pós-férias** |
| 6 | **B2-SMOKE** | Smoke dedicado staging/controlado antes de ON | Depois UI |
| 7 | **B3** | OSRM live ETA · config zona/categoria (V2) | Depois B2 estável |

### Schema inerte (#527) — o que existe vs o que não

| Existe em `main` | Ainda **não** |
|------------------|---------------|
| `TripStatus.queued` | Accept → `queued` |
| SM: `requested→queued`, `queued→accepted\|cancelled` | Promote queued |
| `uq_trips_one_queued_per_driver` | Sibling-aware complete/cancel |
| Testes schema/SM + zero-writers | Matching ETA · FE · PI na accept |

Migration: `c2d3e4f5a6b7` — `ALTER TYPE … ADD VALUE 'queued'` em `autocommit_block` + índice parcial.

---

## 5. Fora de scope (agora / pré-férias)

- Activar `ENABLE_NEXT_TRIP_CHAINING` em Render  
- Stripe live · PF3D · docs reais/OCR  
- Partner/Admin config V1  
- Matching redesign geral  
- B2 completo / ON em produção  
- Redispatch imediato (outro residual)  
- BE-2 / BE-3 / MATCH-ETA / UI (adiados a **pós-férias**)

---

## 6. Relação com o diag de 2026-07-27

O diag Julho permanece válido como **análise técnica**. Este addendum **fecha** as decisões de produto que lá estavam pendentes (§7):

| Pergunta (Julho) | Resposta (2026-08-04) |
|------------------|------------------------|
| B vs C vs adiar? | **B (queued)** |
| Pagamento na accept ou na promoção? | **Só na promoção** |
| Pax copy / cancel? | **Sim** — mensagem clara + cancel |
| Max 1 next? | **Confirmado** (também no índice partial #527) |
| Janela | **12 min** ETA pickup (era 5 no rascunho de flags) |

---

**Frase de fecho:** Groundwork B2 V1 **fechado** em docs + flags OFF + schema inerte (`1671c9f`). Runtime idêntico. Próximo código: **B2-SPIKE-BE-2** pós-férias, sempre atrás de flag OFF.

*Sem activar B2 · sem BE-2/3 nesta fase.*
