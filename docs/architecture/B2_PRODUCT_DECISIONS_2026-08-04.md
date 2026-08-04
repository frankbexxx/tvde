# B2 — Decisões de produto (next-trip chaining) · 2026-08-04

**Estado:** **DECISÕES FECHADAS** (docs) · **implementação NÃO iniciada** · feature continua **OFF**  
**Base técnica:** [`B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md`](B2_NEXT_TRIP_CHAINING_DIAG_2026-07-27.md)  
**Handoff:** [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md) · painel [`TODOdoDIA.md`](../../TODOdoDIA.md)

---

## 1. Veredicto

| Item | Valor |
|------|--------|
| Modelo V1 | **Opção B** — 1 trip `ongoing` + no máximo **1** trip `queued` por motorista |
| Sistema actual | Continua a **não** suportar next-trip with safety (ver diag Julho) |
| Código nesta data | **Zero** — só documentação |
| Produção | **OFF**; qualquer código futuro atrás de flag default OFF |

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

### Flags / config (alvo — ainda sem código)

```text
NEXT_TRIP_CHAINING_ENABLED=false          # default — zero impacto OFF
NEXT_TRIP_WINDOW_MINUTES=12               # janela ETA até pickup (V1)
```

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
| 1 | **B2-PRODUTO-DOCS** | Este documento + notas painel/handoff | **Esta PR** |
| 2 | **B2-CONFIG** | Flags OFF + defaults (`ENABLED=false`, window=12); **sem consumers** | Por iniciar |
| 3 | **B2-SPIKE-BE** | Schema/status `queued` + max 1 queued + sibling-aware free + testes; **OFF** | Por iniciar |
| 4 | **B2-MATCH-ETA** | Elegibilidade chain: ongoing + ETA ≤ janela; **OFF** | Por iniciar |
| 5 | **B2-ACCEPT-PROMOTE** | Accept → queued **sem** PI; promote no complete da actual; PI **só** na promoção; **OFF** | Por iniciar |
| 6 | **B2-UI-MIN** | Driver current+next; Pax mensagem + cancel; **OFF** | Por iniciar |
| 7 | **B2-SMOKE** | Smoke dedicado staging/controlado antes de ON | Por iniciar |
| 8 | **B3** | OSRM live ETA · config zona/categoria (V2) | Depois B2 estável |

---

## 5. Fora de scope (agora e nesta PR)

- Código · migrations · activar flags em prod  
- Stripe live · PF3D · docs reais/OCR  
- Partner/Admin config V1  
- Matching redesign geral  
- B2 completo / ON em produção  
- Redispatch imediato (outro residual)

---

## 6. Relação com o diag de 2026-07-27

O diag Julho permanece válido como **análise técnica**. Este addendum **fecha** as decisões de produto que lá estavam pendentes (§7):

| Pergunta (Julho) | Resposta (2026-08-04) |
|------------------|------------------------|
| B vs C vs adiar? | **B (queued)** |
| Pagamento na accept ou na promoção? | **Só na promoção** |
| Pax copy / cancel? | **Sim** — mensagem clara + cancel |
| Max 1 next? | **Confirmado** |
| Janela | **12 min** ETA pickup (era 5 no rascunho de flags) |

---

**Frase de fecho:** Decisões B2 V1 fechadas em docs (Opção B · 12 min · PI na promoção). **Não implementar** ainda. Próximo código só atrás de flag OFF, começando por B2-CONFIG / B2-SPIKE-BE.

*Docs-only. Sem código · testes longos · env activo · DB · migrations.*
