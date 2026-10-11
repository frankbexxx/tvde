# HERE Tolls Spike — Portugal (2026-09)

**Tipo:** spike técnico isolado (sem runtime app)  
**Estado final:** **HERE APROVADO COM RESERVAS PARA V1**  
**Live runs:** 2026-09-14 (2.º run com rotas direccionais das pontes)  
**API:** HERE Routing v8 `GET https://router.hereapi.com/v8/routes`  
**Parâmetros:** `transportMode=car` · `return=summary,tolls,polyline` · `currency=EUR` · `tolls[summaries]=total`  
**Avoid (subset):** `avoid[features]=tollRoad`  
**Script:** [`scripts/tolls/here_tolls_spike.py`](../../scripts/tolls/here_tolls_spike.py)  
**Raw JSON:** `tmp/here-tolls/` (gitignored via `tmp/`)  
**Merge prep:** [#584](https://github.com/frankbexxx/tvde/pull/584)

Valores oficiais de tarifário PT no repo: **OFFICIAL VALUE NOT VERIFIED** (sem tabela oficial completa para confronto sistemático).

---

## Decisão

| | |
|--|--|
| **Veredicto** | **HERE APROVADO COM RESERVAS PARA V1** |
| **Integração runtime** | **Ainda não** — próximo bloco = implementação de portagens automáticas |
| **Fiscal / facturação** | **Pendente** (fora deste spike) |
| **HTTP** | Todos os pedidos do 2.º live run: **200** |

### Reservas V1

1. Cobertura **não** exaustiva para todas as concessões / corredores PT.  
2. Dados continuam **best-effort** (sem garantia de paridade com tabela oficial).  
3. Tratamento **fiscal / facturação** de portagens ainda pendente.  
4. **Reconciliation** final (estimate → viagem → complete) ainda por desenhar em código.  
5. **Custo / pricing** real de produção HERE (billing) ainda a confirmar.

---

## Resultados finais (default · EUR)

| Rota | HERE toll € | Sistema(s) | Breakdown fares | Notas |
|------|------------:|------------|:---------------:|-------|
| Oeiras → Aeroporto Lisboa | **0,40** | BRISA | SIM | |
| Lisboa → Cascais | **1,60** | BRISA | SIM | |
| Lisboa → Setúbal | **2,45** | BRISA | SIM | |
| Lisboa → Almada (Ponte 25 de Abril) | **0,00** | — | NÃO | sentido isento / sem toll no response |
| Almada → Lisboa (Ponte 25 de Abril) | **2,25** | LUSOPONTE | SIM | cobrado só neste sentido |
| Lisboa → Montijo (Ponte Vasco da Gama) | **0,00** | — | NÃO | sentido isento / sem toll no response |
| Montijo → Lisboa (Ponte Vasco da Gama) | **3,40** | LUSOPONTE | SIM | cobrado só neste sentido |
| Lisboa → Porto | **25,05** | BRISA | SIM | |
| Lisboa → Faro | **24,05** | BRISA | SIM | |
| Lisboa → Évora (A6) | **10,70** | BRISA | SIM | |

### Pontes — tabela direccional

| Ponte | Sentido | HERE € | Concessionária |
|-------|---------|-------:|----------------|
| 25 de Abril | Lisboa → Almada | 0,00 | — |
| 25 de Abril | Almada → Lisboa | 2,25 | LUSOPONTE |
| Vasco da Gama | Lisboa → Montijo | 0,00 | — |
| Vasco da Gama | Montijo → Lisboa | 3,40 | LUSOPONTE |

**Implicação produto:** portagens em pontes **não** são simétricas; estimate/final devem usar o **mesmo sentido OD** (e preferência de via) da viagem real.

### BRISA vs LUSOPONTE

| Concessionária | Rotas observadas no spike |
|----------------|---------------------------|
| **BRISA** | Oeiras↔Aeroporto, Cascais, Setúbal, Porto, Faro, Évora |
| **LUSOPONTE** | Almada→Lisboa (25 de Abril), Montijo→Lisboa (Vasco da Gama) |

HERE devolve `tollSystem` / nomes de fare no breakdown — útil para audit; **não** substitui classificação fiscal.

---

## Avoid-tolls (EUR)

Pedidos com `avoid[features]=tollRoad` no subset:

| Rota | Dist default km | Dist avoid km | Dur default min | Dur avoid min | Toll default € | Toll avoid € |
|------|----------------:|--------------:|----------------:|--------------:|---------------:|-------------:|
| Oeiras → Aeroporto Lisboa | 24,6 | 25,2 | 44 | 46 | 0,40 | **0,00** |
| Lisboa → Cascais | 42,0 | 44,7 | 48 | 55 | 1,60 | **0,00** |
| Lisboa → Setúbal | 54,7 | 56,5 | 51 | 64 | 2,45 | **0,00** |

**Conclusão:** avoid funciona nestes corredores (toll → €0; caminho mais longo). Útil para UX “evitar portagens”, não para pricing do caminho cobrado.

---

## Observações técnicas (live)

- **Moeda:** respostas em **EUR** (`currency=EUR` + fares/summary).  
- **Fare breakdown:** presente quando `toll > 0` (fares com nome, valor, payment methods, `tollSystem`).  
- **`route.id` / fare `id`:** **não estáveis** entre requests — válidos só na resposta em que foram emitidos; **não** persistir como chave de reconciliação cross-request.  
- **Raw:** JSON completo por rota/modo em `tmp/here-tolls/` (local; não commit).  
- **HTTP:** 200 em todos os pedidos do run de fecho; 0 erros.

---

## Arquitectura recomendada (não implementada)

```
estimate (HERE Routing + return=tolls)
    → guardar toll snapshot (€, currency, systems, breakdown, OD, preferências)
    → viagem (tracking / OD real)
    → complete: recalcular final (novo pedido HERE — mesmo OD/sentido ou métricas acordadas)
    → reconciliation (diff estimate vs final; política de aceitação)
    → tolls_amount separado do fare da viagem
    → comissão VAMULÁ = 0% sobre portagens
```

Regras:

1. **Não** reutilizar `route.id` / fare ids entre estimate e complete.  
2. Snapshot no estimate é a base de transparência ao Pax; final recalcula.  
3. `tolls_amount` fica fora da base de comissão (já alinhado à fórmula V1).  
4. Fiscal / LRE / fatura = bloco **separado** (ainda pendente).

---

## Como reproduzir

```powershell
$env:HERE_API_KEY = "..."   # nunca commit
cd C:\dev\APP
python scripts/tolls/here_tolls_spike.py --write-report
```

Env placeholder: `HERE_API_KEY=` em [`docs/env/templates/backend.env.example`](../env/templates/backend.env.example).

---

## Próximo bloco

1. **Implementação** portagens automáticas (estimate → snapshot → final → reconciliation) — **sem** fiscal neste passo.  
2. Confirmar **billing / custo** HERE em produção.  
3. Tratamento **legal/fiscal** de tolls (paralelo / após desenho técnico).
