# Interaction Logging — Telemetria Comportamental

Sistema mínimo de observação: quem clicou, o que aconteceu, quanto tempo, estado resultante.

**Princípio:** Observação passiva. Não toca no core financeiro, webhook ou state machine.

---

## Eventos capturados

### Ações de utilizador (backend)

| action        | role     | descrição                    |
|---------------|----------|------------------------------|
| request_trip  | passenger| Pedir viagem                 |
| accept_trip   | driver   | ACEITAR viagem               |
| arriving      | driver   | Cheguei                      |
| start_trip    | driver   | Iniciar viagem               |
| complete_trip | driver   | Concluir viagem              |
| cancel_trip   | passenger/driver | Cancelar            |

### Ciclo de vida da app (frontend → POST /logs/lifecycle)

| action         | descrição                                      |
|----------------|------------------------------------------------|
| app_start      | App arrancou (mount inicial)                   |
| dormancy_enter | Tab/ecrã ficou oculto (visibility hidden)      |
| dormancy_exit  | Tab/ecrã voltou visível (acordou)              |

**Nota:** Ao acordar (`dormancy_exit`), o estado é actualizado automaticamente (refetch imediato dos dados em polling).

---

## Campos registados

- `timestamp` — quando ocorreu
- `user_id` — quem executou
- `role` — passenger | driver
- `action` — nome da ação
- `trip_id` — viagem (se aplicável)
- `previous_state` — estado da trip antes
- `new_state` — estado após a operação
- `latency_ms` — tempo da request (ms)
- `payment_status` — estado do pagamento (se aplicável)

---

## Exportar logs

**Frontend:** Após Seed, expande Dev → **Export logs** — descarrega CSV automaticamente.

**Nome do ficheiro:** `interaction_logs_{deviceId}_run{seq}_{date}.csv`  
Exemplo: `interaction_logs_a3f2b1c8_run3_2026-02-22.csv`

- **deviceId:** 8 caracteres, único por dispositivo (localStorage)
- **run:** Sequencial por dispositivo (1, 2, 3…); incrementa em cada export
- **Reset run:** Botão em Dev para reiniciar a sequência (próximo export será run 1)

**Endpoint:** `GET /admin/export-logs` (requer token admin)

- **JSON:** `GET /admin/export-logs` (por defeito)
- **CSV:** `GET /admin/export-logs?format=csv`

**Exemplo (curl):**

```bash
curl -H "Authorization: Bearer <admin_token>" \
  "https://tvde-api.onrender.com/admin/export-logs?format=csv" \
  -o interaction_logs.csv
```

Para obter o admin token: Seed → usar o token `admin` do `getDevTokens` (frontend DevTools ou POST `/dev/tokens`).

---

## Uso em testes concorrentes

- Quem perdeu corrida de accept
- Tempo entre requested → assigned
- Estados que demoram mais sob concorrência
- Latência com múltiplas requests
