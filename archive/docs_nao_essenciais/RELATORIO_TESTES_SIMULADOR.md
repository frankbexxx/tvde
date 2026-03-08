# Relatório Completo — Testes do Simulador TVDE

**Data:** Março 2026  
**Última atualização:** 06/03/2026

---

## 1. Estado atual do sistema

### Componentes validados

| Componente | Estado | Notas |
|------------|--------|-------|
| **Simulador** | OK | Cenários: normal, flash_crowd, heavy_load. Métricas e latências. Ctrl+C guarda resultado |
| **Backend (FastAPI)** | OK | ENV=dev, /dev/reset, /dev/seed-simulator, endpoints de trips |
| **Stripe** | OK | Webhooks 200 OK, fluxo create → confirm → capture |
| **Base de dados** | OK | PostgreSQL, trips + payments, consistência validada |
| **Scripts de automação** | OK | 1_start_db.ps1, 2_reset_db.ps1, 3_collect_data.ps1 |

### Fluxo end-to-end

```
PassengerBot (cria viagem) → Backend (POST /trips)
    → Stripe (payment_intent, autorização 0,50€)
    → DriverBot (aceita) → Backend (accept, webhook)
    → DriverBot (arriving → start → complete)
    → Stripe (capture valor final)
    → Backend (webhooks payment_intent.succeeded, charge.captured)
```

### Cancelamentos

- **Passageiro cancela** (20% probabilidade, 10–30 s após criar): Backend retorna 409 em `arriving`/`start`; DriverBot trata com skip.
- **Autorização Stripe** (0,50€) fica em "Incomplete" no Dashboard — esperado (nunca capturada).

---

## 2. Resultados dos testes realizados

### Testes de carga (06/03/2026) — com reset entre cenários

| Cenário | Duração | Trips created | Trips accepted | Trips completed | Trips cancelled | Driver skipped | Peak concurrent | Avg accept latency | Avg complete latency |
|---------|---------|---------------|----------------|-----------------|-----------------|----------------|-----------------|-------------------|----------------------|
| **Normal** | 501 s | 66 | 27 | 10 | 12 | 5 | 40 | 95,51 s | 304,87 s |
| **Flash crowd** | 566 s | 20 | 20 | 20 | 0 | 0 | 20 | 107,67 s | 310,07 s |
| **Heavy load** | 1260 s | 217 | 52 | 29 | 37 | 3 | 150 | 264,86 s | 468,20 s |

**Notas:**
- Flash crowd: 20 viagens criadas simultaneamente — 100% aceites e concluídas.
- Heavy load: 20 min, fases progressivas (20p/8d → 30p/12d → 50p/20d).
- Em todos os cenários: **0 accept failures**, **0 cancel failed**.

### Teste inicial 06/03/2026 (410 s)

| Métrica | Valor |
|---------|-------|
| Duração | 410 s (~6,8 min) |
| Viagens criadas | 53 |
| Viagens canceladas | 9 |
| Concluídas | 4 |
| Aceites | 22 |
| Motorista skip | 6 |
| Cancel falhou | 0 |
| Aceite falhou | 0 |

### Consistência entre fontes

| Fonte | Total | Completed | Cancelled |
|-------|-------|-----------|-----------|
| test_report | 53 | 4 | 9 |
| simulator_result | 53 | 4 | 9 |
| unified_payments.csv | 53 | 4 | 9 |
| Base de dados | 53 | 4 | 9 |

### Viagens concluídas (unified_payments.csv)

| Trip ID | Final price | Commission | Driver payout | Payment status |
|---------|-------------|------------|---------------|----------------|
| b3e75a1a | 5,26 € | 0,79 € | 4,47 € | succeeded |
| 825c8a66 | 4,42 € | 0,66 € | 3,76 € | succeeded |
| 42de96b1 | 4,96 € | 0,74 € | 4,22 € | succeeded |
| 95c3e898 | 5,55 € | 0,83 € | 4,72 € | succeeded |

---

## 3. Stripe Dashboard

### Resumo (ambiente de teste)

- **Total transações:** 183 (acumulado de vários testes)
- **OK (capturadas):** 77
- **Incomplete (0,50€):** Autorizações de viagens canceladas ou em curso — esperado
- **Reembolsados / Contestados / Malsucedidos / Não capturados:** 0

### Validação

- As 4 viagens concluídas do último teste aparecem como **OK** com os valores corretos (5,26 €, 4,42 €, 4,96 €, 5,55 €).
- As transações "Incomplete" de 0,50 € correspondem a autorizações de viagens canceladas ou ainda em curso — comportamento correto.

---

## 4. Correções aplicadas

### Bug de duplicação no simulator_result

- **Problema:** O ficheiro `logs/simulator_result_*.txt` apresentava o resumo repetido dezenas de vezes.
- **Correção:** Uso de `threading.RLock` em `_save_result` e proteção com `_result_saved` para garantir uma única escrita.
- **Ficheiro:** `backend/tools/simulator/simulator.py`

---

## 5. Checklist — O que está validado

- [x] Simulador cria viagens
- [x] Motoristas aceitam viagens
- [x] Passageiros cancelam (20%) — 409 tratado
- [x] Motoristas completam viagens (arriving → start → complete)
- [x] Stripe: autorização no aceite, captura na conclusão
- [x] Webhooks Stripe 200 OK
- [x] Base de dados consistente (trips, payments)
- [x] Export unified_payments.csv
- [x] Scripts de automação (start DB, reset, collect data)
- [x] Stripe Dashboard — transações OK e Incomplete corretas
- [x] Testes de carga: normal, flash_crowd, heavy_load
- [x] Heavy load 20 min — 150 viagens concorrentes no pico

---

## 6. Conclusão dos testes

Os testes realizados em 06/03/2026 validam o sistema TVDE em cenários de carga variada:

1. **Estabilidade:** Zero erros de aceite e zero falhas de cancelamento em todos os cenários, incluindo pico de 150 viagens concorrentes.

2. **Flash crowd:** As 20 viagens criadas simultaneamente foram todas aceites e concluídas, sem conflitos (409) entre motoristas. O backend trata corretamente a contenção.

3. **Heavy load:** O sistema suportou 20 minutos de carga progressiva (50 passageiros, 20 motoristas), com 217 viagens criadas e 29 concluídas. A latência de aceite aumenta com a carga (95 s → 265 s), mas sem degradação crítica.

4. **Reset vs. sem reset:** Com reset entre cenários, os resultados são consistentes e isolados. Sem reset, viagens pendentes de testes anteriores são processadas (ex.: flash crowd aceitou 24 viagens quando só 20 foram criadas nesse run).

5. **Prontidão para beta:** O sistema sobreviveu a 50 passageiros, 20 motoristas, flash crowd e 20 minutos de heavy load sem falhas. Tecnicamente pronto para beta público pequeno.

---

## 7. Próximos passos (opcional)

| Item | Prioridade |
|------|------------|
| Teste manual na web app (browser) | Média |
| Teste em Render (produção) | Média |
| LogicCheck (validator) — se usado | Baixa |
| Testes automáticos (pytest) | Baixa |

---

## 8. Referências

- **Protocolo:** [PROTOCOLO_TESTE_SIMULADOR.md](PROTOCOLO_TESTE_SIMULADOR.md)
- **Simulador:** [backend/tools/simulator/README.md](backend/tools/simulator/README.md)
- **Scripts:** [scripts/README.md](scripts/README.md)
