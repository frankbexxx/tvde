# TESTES — A026 OPERAÇÃO (CRON + RUNTIME)

## OBJETIVO

Validar que o sistema:

- funciona autonomamente
- executa jobs corretamente
- não depende de intervenção manual
- mantém consistência em runtime

---

## REQUIREMENTS (TEM DE ESTAR LIGADO)

Antes de testar:

- [ ] API FastAPI a correr
- [ ] PostgreSQL ativo (Docker ou local)
- [ ] `DATABASE_URL` correto
- [ ] `CRON_SECRET` definido no `.env`
- [ ] dados mínimos na BD (conforme cenário; para pytest automático basta Postgres acessível)

---

## NON-REQUIREMENTS (TEM DE ESTAR DESLIGADO / NÃO USAR)

Durante os testes (recomendado):

- [ ] **NÃO** usar Stripe real — para fluxos de viagem, `STRIPE_MOCK=true` (suíte de consolidação)
- [ ] **NÃO** depender de scheduler externo nos testes automáticos (chamadas diretas ao endpoint)
- [ ] **NÃO** usar ferramentas externas (cron-job.org, etc.) **para validar pytest**
- [ ] **NÃO** alterar manualmente estados na BD **no meio** de um teste manual controlado

---

## 1. TESTES AUTOMÁTICOS

### Ficheiro

`backend/tests/test_a026_cron_ops.py`

### O que valida

**Autenticação**

- sem `CRON_SECRET` → **503**
- secret inválido → **401**
- secret válido → **200**

**Execução básica**

- chamada a `/cron/jobs` retorna sucesso
- resposta coerente (`status`, `timeouts`, `offers`, `cleanup`)

**Idempotência**

- 2 chamadas seguidas → ambas **200**; serviços idempotentes (sem duplicar efeitos indevidos)

### Comando

```bash
cd backend
pytest tests/test_a026_cron_ops.py -v
```

---

## 2. TESTES DE INTEGRAÇÃO (COM BD)

```bash
pytest tests/test_consolidacao_tvde.py tests/test_a026_cron_ops.py -v
```

### O que validar

- cron não quebra fluxo existente da consolidação
- após corridas, revisar logs se necessário (`cron_jobs_run`, `trip_timeouts_applied`, `cron_cleanup_audit_events`)

---

## 3. TESTES MANUAIS (CRÍTICOS PARA PRODUÇÃO)

### Caso 1 — Trip abandonada (`assigned`)

**Passos**

1. Criar trip até ficar **`assigned`** (motorista atribuído, ainda não aceite).
2. **Não** aceitar.
3. Esperar **> 2 min** (limiar actual em `trip_timeouts.py`) **ou** forçar `updated_at` antigo em staging.
4. Chamar: `GET /cron/jobs?secret=<CRON_SECRET>` (ou esperar o scheduler).

**Esperado**

- trip passa a **`requested`** (timeout `assigned` → `requested`).
- Nos logs: `trip_timeouts_applied` (se houve alterações) e `cron_jobs_run`.

### Caso 2 — Idempotência manual

**Passos**

- Chamar `/cron/jobs?secret=...` **2–3 vezes** seguidas.

**Esperado**

- sempre **200**, sem erros
- sem efeitos estranhos em duplicado (ex.: mesma viagem não deve oscilar de forma inconsistente)

### Caso 3 — Health check

`GET /admin/system-health` (JWT **admin**)

**Esperado**

- resposta **200**
- em condições normais: **`stuck_payments`** = lista **vazia**
- restantes listas conforme estado real

### Caso 4 — Logs operacionais

Confirmar na consola / agregador (conforme o teu setup):

- `cron_jobs_run`
- `trip_timeouts_applied` (quando há timeouts aplicados)
- `cron_cleanup_audit_events` (quando há linhas apagadas em cleanup)

---

## 4. TESTE REAL (SIMULAÇÃO PRODUÇÃO) — OPCIONAL

**Setup**

- Agendador externo ou loop local a bater `GET /cron/jobs` a cada **30–60 s**.

**Validar**

- sistema evolui sem intervenção em cenários de stuck
- viagens não ficam presas além dos limiares
- sem erros acumulados nos logs

---

## EDGE CASES IMPORTANTES (MANUAL / OBSERVAÇÃO)

- **Cron com poucos ou sem dados** → deve responder **200** (contagens em muitos zeros).
- **Múltiplas trips** → timeouts e ofertas devem manter consistência (revisar `system-health` se algo ficar estranho).
- **Após erro anterior** → nova chamada a `/cron/jobs` deve voltar a **200** se `CRON_SECRET` e BD estiverem OK.

---

## NÃO TESTAR (NESTA FASE)

- performance / carga
- CORS
- Stripe real
- UI

---

## DEFINIÇÃO DE SUCESSO

- [ ] `pytest tests/test_a026_cron_ops.py` passa
- [ ] (opcional) consolidação + A026 juntos passam com Postgres
- [ ] cron manual → **200** com secret correcto
- [ ] múltiplas execuções seguras
- [ ] viagens em `assigned` abandonadas evoluem após timeout + cron
- [ ] `system-health` coerente; `stuck_payments` vazio em normalidade
- [ ] logs operacionais visíveis quando há trabalho feito

---

## RESULTADO

Sistema:

- autónomo
- previsível
- pronto para operação real (após scheduler em produção)

---

## REFERÊNCIAS

- Operação: `docs/prompts/A026_OPERACAO_OPS.md`
- Checklist: `OPERATION_CHECKLIST.md` (secção A026)

---

# FIM
