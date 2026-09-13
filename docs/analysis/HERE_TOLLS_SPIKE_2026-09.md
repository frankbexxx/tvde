# HERE Tolls Spike — Portugal (2026-09)

**Tipo:** spike técnico isolado (sem runtime app)  
**Estado:** script pronto · **LIVE RUN PENDING** (`HERE_API_KEY` não estava disponível no ambiente do agente)  
**API:** HERE Routing v8 `GET https://router.hereapi.com/v8/routes`  
**Parâmetros planeados:** `transportMode=car` · `return=summary,tolls,polyline` · `currency=EUR` · `tolls[summaries]=total` · compare `avoid[features]=tollRoad`  
**Script:** [`scripts/tolls/here_tolls_spike.py`](../../scripts/tolls/here_tolls_spike.py)

Valores oficiais de tarifário PT no repo: **OFFICIAL VALUE NOT VERIFIED** (sem tabela oficial para confronto).

---

## Como correr

```powershell
$env:HERE_API_KEY = "..."   # nunca commit
cd C:\dev\APP
python scripts/tolls/here_tolls_spike.py --write-report
```

Raw JSON → `tmp/here-tolls/` (já coberto por `.gitignore` `tmp/`).

Env template: `HERE_API_KEY=` em [`docs/env/templates/backend.env.example`](../env/templates/backend.env.example) (só placeholder).

---

## Tabela benchmark (default)

| Rota | HERE toll € | Toll detectado? | Breakdown? | Observações |
|------|------------:|:---------------:|:----------:|-------------|
| Oeiras → Aeroporto Lisboa | — | PENDING | PENDING | LIVE RUN PENDING · OFFICIAL VALUE NOT VERIFIED |
| Lisboa → Cascais | — | PENDING | PENDING | LIVE RUN PENDING · OFFICIAL VALUE NOT VERIFIED |
| Lisboa → Setúbal | — | PENDING | PENDING | LIVE RUN PENDING · OFFICIAL VALUE NOT VERIFIED |
| Lisboa → Almada (Ponte 25 de Abril) | — | PENDING | PENDING | LIVE RUN PENDING · OFFICIAL VALUE NOT VERIFIED |
| Lisboa → Montijo (Ponte Vasco da Gama) | — | PENDING | PENDING | LIVE RUN PENDING · OFFICIAL VALUE NOT VERIFIED |
| Lisboa → Porto | — | PENDING | PENDING | LIVE RUN PENDING · OFFICIAL VALUE NOT VERIFIED |
| Lisboa → Faro | — | PENDING | PENDING | LIVE RUN PENDING · OFFICIAL VALUE NOT VERIFIED |
| Lisboa → Évora (A6) | — | PENDING | PENDING | LIVE RUN PENDING · OFFICIAL VALUE NOT VERIFIED |

---

## Comparação avoid tolls

Prevista para: Oeiras→Aeroporto · Lisboa→Cascais · Lisboa→Setúbal.

| Rota | Dist default | Dist avoid | Dur default | Dur avoid | Toll default | Toll avoid |
|------|-------------:|-----------:|------------:|----------:|-------------:|-----------:|
| *(preencher com `--write-report`)* | — | — | — | — | — | — |

---

## Precisão / gaps (checklist pós-run)

- [ ] Tolls ausentes em pontes (25 de Abril / Vasco da Gama)
- [ ] Currency ≠ EUR
- [ ] Breakdown incompleto (só total sem fares)
- [ ] SCUT / antigas SCUT / A22 (Faro)
- [ ] HTTP 401/403/429
- [ ] Discrepâncias vs conhecimento local (sem inventar oficiais)

---

## Reconciliation futura

**PARCIAL** (avaliação de desenho, sem live data):

| Dado HERE | Útil para estimate→final? |
|-----------|---------------------------|
| `routes[].id` | Snapshot da resposta (não estável como “handle” eterno) |
| `fares[].id` | **Só válido dentro da mesma response** (docs multi-leg) — **não** reutilizar no complete |
| `summary.tolls.total` + `currency` | Sim para `tolls_amount` |
| `tollSystem` / fares / paymentMethods | Sim para audit/breakdown |
| `polyline` | Sim para diagnóstico; não prova percurso real do Driver |

**Falta para V1:** preferência avoid · persistir breakdown no trip · novo request no complete · política de teto estimate/final · (opcional) trace GPS.

Arquitectura possível: estimate = HERE default → guardar € + systems JSON → complete = HERE de novo (mesma OD ou métricas) → `final_tolls` · **não** depender de fare id cross-request.

---

## Rate limits / pricing (docs HERE)

- Pedidos com `return=tolls` contam como **transacção adicional** (documentação HERE).
- Observação empírica de 429/custos: **só após live run**.

---

## Recomendação

**PENDING LIVE VALIDATION** — sem `HERE_API_KEY` no ambiente do spike, **não** classificar ainda como:

- HERE APROVADO PARA V1
- HERE APROVADO COM RESERVAS
- HERE REJEITADO

**Próximo passo humano:** exportar chave de teste HERE → `python scripts/tolls/here_tolls_spike.py --write-report` → rever tabela → decidir.

---

## Runtime / PROD

- Código app (trips/pricing/payment/FE): **não alterado**
- Produção: **não alterada**
