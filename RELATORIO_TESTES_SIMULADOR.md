# Relatório Completo — Testes do Simulador TVDE

**Data:** Março 2026  
**Última atualização:** 06/03/2026

---

## 1. Estado atual do sistema

### Componentes validados

| Componente | Estado | Notas |
|------------|--------|-------|
| **Simulador** | OK | 20 passageiros, 8 motoristas (configurável), Ctrl+C guarda resultado |
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

### Teste 06/03/2026 (410 s)

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

---

## 6. Próximos passos (opcional)

| Item | Prioridade |
|------|------------|
| Teste manual na web app (browser) | Média |
| Teste em Render (produção) | Média |
| LogicCheck (validator) — se usado | Baixa |
| Testes automáticos (pytest) | Baixa |

---

## 7. Referências

- **Protocolo:** [PROTOCOLO_TESTE_SIMULADOR.md](PROTOCOLO_TESTE_SIMULADOR.md)
- **Simulador:** [backend/tools/simulator/README.md](backend/tools/simulator/README.md)
- **Scripts:** [scripts/README.md](scripts/README.md)
