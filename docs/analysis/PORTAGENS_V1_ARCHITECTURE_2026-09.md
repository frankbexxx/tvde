# PORTAGENS V1 — Arquitectura (2026-09)

**Estado:** **APROVADA** (decisões humanas 2026-09-14) · **F0 IMPLEMENTED** · **F1 IMPLEMENTED** · **F2 IMPLEMENTED** · **F3 IMPLEMENTED**
**Veredicto HERE:** APROVADO COM RESERVAS PARA V1 — [`HERE_TOLLS_SPIKE_2026-09.md`](HERE_TOLLS_SPIKE_2026-09.md)  
**Tip `main` de referência:** pós-F1 `c2d1358` · F2 nesta branch  
**Implementação:** F0–F2 no código (flag OFF); staging/prod ON pendente OK explícito.

### Decisões humanas (binding)

1. **Cobrança V1:** `charged_tolls_amount = estimated_tolls_amount`. Sem full GPS trace / map-matching, um recálculo HERE OD→OD no complete **não** é portagem real/final e **não** altera o valor cobrado.  
2. **Falha HERE no create:** viagem **não** bloqueia; `estimated_tolls_amount = 0` → `charged_tolls_amount = 0`; `tolls_status=zero_fallback`; retry no complete **só** diagnóstico; **não** cobrar retrospectivamente tolls não apresentados ao Passenger.

### Terminologia V1 (obrigatória)

| Termo | Significado |
|-------|-------------|
| `estimated_tolls_amount` | Valor HERE no **create**, apresentado ao Pax |
| `charged_tolls_amount` | Valor **cobrado** = sempre o estimate (ou 0 se fallback) |
| `observed_tolls_amount` | Recálculo HERE no **complete** (OD→OD) — **só** audit/métricas; **não** cobrança |
| ~~`final_tolls_amount`~~ | **Evitar** na V1 — reservar para V2 (rota efectivamente conduzida) |

`price_breakdown.tolls_amount` no runtime de cobrança = `charged_tolls_amount`.

---

## 0. Premissas (código actual)

- `tolls_amount` já entra no breakdown e em `final_price`.  
- Comissão VAMULÁ já exclui tolls (`commissionable = total − tolls`).  
- Runtime HERE: create (estimate/charge) + complete (observed only).  
- Create = único “estimate” (não há API estimate separada).  
- Complete usa `distance_km`/`duration_min` do create; PI placeholder €0,50 → update amount no complete.  
- **Sem** polyline / GPS trace / route replay.  
- Tarifário GO/Comfort/XL **não** se altera nesta feature.

---

## 1. Fluxo create → complete → payment

### Create / estimate

| | |
|--|--|
| **Quando** | Em `create_trip` / `_estimate_trip`, após métricas OSRM/Haversine, antes de `calculate_fare_breakdown` |
| **Condição** | `ENABLE_HERE_TOLLS=true` e `HERE_API_KEY` presente |
| **Inputs** | `origin_lat/lng`, `destination_lat/lng`, `transportMode=car`, `currency=EUR`, `return=summary,tolls` |
| **Output usado** | `summary.tolls.total` (EUR) + fares/systems para snapshot |
| **Persistir** | `estimated_tolls_amount` · `charged_tolls_amount = estimated` · `tolls_source=here` · `tolls_status=ok` · snapshot · timestamps |
| **Preço** | `estimated_price` / breakdown incluem `charged_tolls_amount` |
| **Flag OFF** | sem HERE; ambos amounts = 0; `tolls_source=flag_off` |

O valor mostrado no create **é** o valor que será cobrado.

### Durante a viagem

- **Não** recolher full GPS trace, polyline, waypoints densos, tolls mid-trip.  
- `DriverLocation` (last-known) **não** alimenta tolls na V1.

### Complete

| | |
|--|--|
| **Cobrança** | `charged_tolls_amount` **inalterado** (= estimate do create, ou 0 se `zero_fallback`) |
| **HERE opcional** | Nova chamada OD→OD (mesmas coords da trip) → grava `observed_tolls_amount` + delta vs estimated |
| **Uso do observed** | Auditoria · métricas · cobertura · **nunca** altera PaymentIntent / `final_price` tolls |
| **Fare** | Continua fórmula actual (dist/dur do create) + **charged** tolls |
| **V2 (reservado)** | `final toll based on actual route` com trace/map-matching |

### Payment

| | |
|--|--|
| **Entrada** | `final_price = fare_subtotal + pet + charged_tolls_amount` |
| **PI** | Update amount no `complete_trip` (fluxo `requires_confirmation` + placeholder €0,50) |
| **Riscos** | Confirm-on-accept → `requires_capture` com €0,50 bloqueia update (pré-existente); SCA no confirm com amount final |

**Não alterar** o módulo de payments nesta feature além de garantir que o amount já inclui `charged_tolls_amount`.

---

## 2. Dados a persistir (mínimo seguro)

Preferência: enriquecer `price_breakdown` JSONB. Migration de colunas **não** obrigatória na V1 mínima.

| Campo | Onde | V1 |
|-------|------|-----|
| `estimated_tolls_amount` | JSON (e/ou coluna opcional) | **SIM** |
| `charged_tolls_amount` | JSON; espelhar em `tolls_amount` do breakdown de cobrança | **SIM** |
| `observed_tolls_amount` | JSON | **SIM** se complete chamar HERE; senão omitir/null |
| `tolls_source` | JSON | `here` \| `none` \| `flag_off` |
| `tolls_status` | JSON | `ok` \| `zero_fallback` \| `error` \| `observed_only` (se create 0 e complete só observou) |
| `tolls_calculated_at` | JSON | estimate (+ observed se aplicável) |
| `tolls_snapshot` | JSON | systems, fares, currency, http (estimate; opcional observed) |
| `tolls_error_code` | JSON | se falha |
| `tolls_route_handle` | — | **NÃO** (ids HERE instáveis) |
| ~~`final_tolls_amount`~~ | — | **NÃO** na V1 |

**Auditoria:** log/AuditEvent em create e complete (estimated, charged, observed, delta, status).

---

## 3. Reconciliation (regra V1)

**Cobraça:** sempre `charged_tolls_amount = estimated_tolls_amount` (imutável após create bem-sucedido ou fallback 0).

| Caso | Efeito na cobrança | Efeito em audit |
|------|--------------------|-----------------|
| Complete HERE OK, observed ≠ estimated | **Nenhum** | Guardar `observed_tolls_amount`, `delta = observed − estimated` |
| Complete HERE OK, observed = estimated | Nenhum | delta 0 |
| Complete HERE falha | Nenhum | `observed` ausente + error code |
| Create falhou (zero_fallback) | charged = 0 | Complete pode ainda tentar observed **só** diagnóstico; **não** promove a charged |

**Sem teto/threshold de cobrança** — na V1 o Pax paga exactamente o que viu. Deltas observed vs estimated são **métrica**, não billing.

---

## 4. Limitação de rota final

Sem GPS trace / map-matching:

- **Não** existe portagem “exacta do percurso conduzido” na V1.  
- Recálculo OD→OD no complete = **aproximação observada**, não verdade de rota.  
- Por isso **não** alimenta cobrança.  
- Pontes LUSOPONTE direccionais: OD do pedido continua crítico para o **estimate** (e para observed).

**V2:** `final toll based on actual route` com trace/map-matching.

---

## 5. HERE integration

```
backend/app/services/tolls/here.py      # client + parse
backend/app/services/tolls/__init__.py
# opcional: service.py — flag, fallback, snapshot builder
```

| | |
|--|--|
| Client | Routing v8 (contrato do spike) |
| Timeouts | connect ~2–3s · read ~5–8s |
| Retry | 1× só timeout/5xx; sem retry 4xx |
| Env | `HERE_API_KEY` via `Settings` — nunca hard-code |
| Flag | `ENABLE_HERE_TOLLS: bool = False` |

---

## 6. Feature flag / rollout

| | |
|--|--|
| Default | **OFF** |
| Staging | ON primeiro + smokes BRISA / LUSOPONTE |
| Prod | ON só com OK explícito |
| OFF | amounts 0; `tolls_source=flag_off`; sem HTTP HERE |
| Logs | trip_id, estimated, charged, observed, status, latency_ms |

---

## 7. Passenger UX (mínima)

**Após create / pré-confirm:** se `estimated_tolls_amount > 0` → “Portagens estimadas: €X,XX”; total inclui tolls.  
**Copy V1:** o valor de portagens mostrado **será o cobrado** (já não “pode ajustar no fim” por recálculo HERE). Ajuste residual só se fare/pet/regras mudarem por outros motivos — **não** por tolls observed.  
**No fim:** breakdown com **Portagens** = `charged_tolls_amount`.  
Sem redesign.

---

## 8. Driver UX

- Sem input manual de tolls.  
- Ver € portagens: opcional, não bloqueante.  
- Sem toggle “rota com portagem” obrigatório.

---

## 9. Partner / Admin (mínimo)

- `estimated_tolls_amount` / `charged_tolls_amount` (iguais na V1 excepto se se quiser mostrar só charged)  
- `observed_tolls_amount` + delta (diagnóstico)  
- `tolls_source`, `tolls_status`  
- Admin: `tolls_error_code` / `observed_tolls_error_code` quando presente  
- total · commissionable (total − charged tolls)  
- CSV Partner export: colunas append-only de audit (estimate/charged/observed/delta/source/status)  
- **Sem** API key, raw HERE payload, nem request URL na UI

---

## 10. Payment impact

- Placeholder €0,50 no accept mantém-se.  
- Complete sobe PI para `final_price` **incluindo charged tolls**.  
- Mismatch A024: observabilidade.  
- Confirm-on-accept: risco pré-existente.  
- **Não** mudar payment nesta fase.

---

## 11. Failure policy (V1)

### HERE falha no create

- Viagem **não** bloqueia.  
- `estimated_tolls_amount = 0`  
- `charged_tolls_amount = 0`  
- `tolls_status = zero_fallback`  
- Complete pode chamar HERE **só** para `observed_tolls_amount` / diagnóstico.  
- **Nunca** promover observed → charged.  
- Custo excepcional (portagem real não cobrada) **fora** da cobrança Passenger na V1.

### HERE falha no complete

- Cobrança inalterada (`charged` já fixo).  
- Sem `observed` ou `observed` error.  
- **Não** bloquear completion.

### Flag OFF / sem key

- Equivalente a tolls 0; sem chamada (ou no-op).

---

## 12. Legal / fiscal boundary

| Técnico V1 | Pendente externo |
|------------|------------------|
| Breakdown + charged = estimated | IVA / faturação exacta |
| Comissão 0% sobre tolls | Contabilização |
| Observed só audit | Wording legal fino nos Termos |

Não bloqueia implementação técnica.

---

## 13. Tests necessários

- no-toll → estimated/charged 0  
- BRISA estimate > 0 → charged = estimated  
- LUSOPONTE direccional (Almada→Lisboa > 0; Lisboa→Almada 0)  
- complete observed ≠ estimated → **charged inalterado**  
- create HERE fail → zero_fallback; complete observed **não** cobra  
- timeout / 4xx / 5xx  
- commission excludes charged tolls  
- payment cents incluem charged tolls  
- flag OFF  
- legacy trip sem snapshot  

---

## 14. Migration

| | |
|--|--|
| **Necessária?** | **NÃO** para V1 mínima (JSONB) |
| Opcional robusta | colunas `estimated_tolls_amount`, `charged_tolls_amount`, `observed_tolls_amount` nullable |
| Compat | trips antigas: defaults 0 |

---

## 15. Riscos

1. Estimate ≠ rota conduzida — aceite na V1; mitigated por charged=estimate.  
2. Create fail → Pax não paga tolls reais (custo plataforma/ops).  
3. Latência HERE no create.  
4. Custo API HERE (`return=tolls`).  
5. Confirm-on-accept + PI amount.  
6. Cobertura incompleta concessões PT.

---

## 16. Arquitectura escolhida

### V1 mínima *(implementar)*

- Flag OFF default · client isolado  
- Create: HERE → `estimated` = `charged` + snapshot + UX  
- Complete: fare actual + **charged imutável**; HERE opcional → `observed` only  
- Create fail → zero_fallback; sem cobrança retrospectiva  
- Sem migration · sem manual Driver · sem trace  

### V1 robusta *(depois)*

- Colunas tipadas · dashboards delta estimated vs observed · alertas cobertura  
- Circuit breaker / timeouts afinados  

### Futuro V2

- Trace / map-matching → **`final toll based on actual route`** pode passar a cobrança (nova decisão humana)  
- Fiscal/IVA · preferência “evitar portagens”  

---

## 17. Fases de implementação

| Fase | Conteúdo |
|------|----------|
| **F0** | `Settings` (`HERE_API_KEY`, `ENABLE_HERE_TOLLS`) + client `tolls/here.py` + testes unitários mock |
| **F1** | Wire **create**: estimated=charged, snapshot, Pax line “Portagens estimadas”, zero_fallback |
| **F2** | Wire **complete**: charged imutável; observed opcional + delta audit; Partner/Admin mínimo |
| **F3** | Partner/Admin visibility completa (detail + CSV audit) — sem dashboards complexos |
| **F4** | Staging ON + smokes — **STAGING VALIDATED** |
| **F5** | Prod ON (OK explícito) — **READY FOR PROD REVIEW** |

**Nota:** F1+F2 reflectem cobrança = estimate; observed **não** é billing.

---

## 18. Checklist pré-implementação / progresso

| Fase | Estado |
|------|--------|
| Decisão cobrança = estimate | **DONE** |
| Decisão create fail → 0 | **DONE** |
| HERE aprovado com reservas | **DONE** |
| **F0** Settings + flag + HERE client + unit tests | **IMPLEMENTED** |
| **F1** Wire create (estimated=charged, UX) | **IMPLEMENTED** |
| **F2** Wire complete (charged imutável + observed) | **IMPLEMENTED** |
| **F3** Partner/Admin visibility + CSV audit | **IMPLEMENTED** |
| **F4** Staging ON + HERE smokes | **STAGING VALIDATED** |
| **F5** Prod flag ON | **READY FOR PROD REVIEW** (OK explícito) |

### F0 — notas de implementação

- Módulo: `backend/app/services/tolls/here.py` (`estimate_tolls`, `TollEstimateResult`)
- Settings: `ENABLE_HERE_TOLLS=false` · `HERE_API_KEY` opcional
- Spike independente; parser alinhado ao contrato

### F1 — notas de implementação

- `create_trip` chama `estimate_tolls` → `charged = estimated` → `price_breakdown` + `estimated_price`
- Snapshot sanitizado via `services/tolls/snapshot.py` (sem API key / fare ids / raw payload)
- Create fail → `tolls_status=zero_fallback`, viagem segue
- Passenger: linha “Portagens estimadas” se > 0; hint se unavailable
- Complete (F1): preservava toll meta no `_apply_price_snapshot` (prior keys)
- Flag continua **OFF** por default

### F2 — notas de implementação

- `complete_trip` chama HERE OD→OD → `observed_*` + delta; **charged/tolls_amount/final_price/PI inalterados**
- Evento `trip_tolls_observed` (sem API key)
- Partner/Admin: charged + observed + delta (mínimo)
- Passenger: **sem** UI observed
- Flag continua **OFF** por default

### F3 — notas de implementação

- Partner detalhe: estimated / charged / observed / delta / source / status (legacy → “—”)
- Admin detalhe: mesmo conjunto + `error_code` quando apropriado
- CSV Partner: append-only `estimated_tolls_amount` … `tolls_status`
- Helpers FE: `web-app/src/features/trips/tollAuditDisplay.ts` (sanitiza apiKey)
- Listas gerais: **sem** novas colunas
- Passenger / Driver: **sem** alterações de UX
- Flag continua **OFF** por default

### F4 — STAGING VALIDATED (2026-09)

- Staging: `ENABLE_HERE_TOLLS=true` + `HERE_API_KEY` · contas seed (`scripts/ops/seed_f4_staging_min_accounts.py`) · smokes (`run_f4_staging_toll_smokes.py`)
- **A** no-toll (Baixa): estimated/charged **€0** · `tolls_status=no_tolls`
- **B** Oeiras→Airport: **€0.40** BRISA · charged == estimated · observed audit only
- **C** Almada→Lisboa: **€2.25** LUSOPONTE · Lisboa→Almada: **€0** (assimétrico HERE)
- Commission **0%** sobre tolls (ex.: Brisa final 18.02 · tolls 0.40 · commissionable 17.62)
- Passenger: sem observed no create · Partner/Admin GET audit OK · Stripe mock
- **PROD** intocado · PROD `ENABLE_HERE_TOLLS=false`

## 19. Próximo passo

**F5** — Prod ON só com OK explícito (review prod / flag / runbook).  
**Sem** alterar Hostinger / PROD deploy app / tarifário categorias até esse OK.

---

**Governação:** alterações a `charged_tolls` ≠ `estimated_tolls`, ou promoção de `observed` a cobrança, exigem **nova decisão humana** (tipicamente V2).
