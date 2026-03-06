# TVDE Traffic Simulator

Simulador de tráfego leve para testes concorrentes do backend TVDE. Cria bots passageiros e motoristas que usam a API existente.

**Objetivo:** Gerar comportamento concorrente plausível para validar state machine, race conditions, dispatch, cancelamentos, disponibilidade e consistência financeira.

## Pré-requisitos

- Backend a correr (local ou Render) com ENV=dev
- **Local:** `stripe listen --forward-to localhost:8000/webhooks/stripe` e `STRIPE_WEBHOOK_SECRET` no .env = secret que o stripe listen mostra
- O simulador chama `POST /dev/seed-simulator` para criar N passageiros e M motoristas automaticamente
- Para Render sem dev tools: definir `TVDE_SIM_TOKEN_PASSENGER` e `TVDE_SIM_TOKEN_DRIVER` (modo legado)

## Instalação

```bash
cd backend
pip install -r tools/simulator/requirements.txt
```

## Execução

A partir da raiz do projeto (recomendado):

```bash
python run_simulator.py
python run_simulator.py --scenario normal
python run_simulator.py --scenario flash_crowd
python run_simulator.py --scenario heavy_load
```

Ou a partir do backend:

```bash
cd backend
python -m tools.simulator --scenario flash_crowd
```

Ao premir Ctrl+C, o resultado é guardado em `logs/simulator_result_{data}_{hora}.txt`.

### Cenários

| Cenário | Descrição |
|---------|-----------|
| `normal` | 20 passageiros e 8 motoristas, criação de viagens espaçada (20–120 s) |
| `flash_crowd` | 20 passageiros criam viagens **simultaneamente** (asyncio.gather), depois motoristas processam |
| `heavy_load` | Densidade progressiva: 0–5 min 20p/8d, 5–10 min 30p/12d, 10–20 min 50p/20d |

## Configuração

Editar `config.py` ou variáveis de ambiente:

| Variável | Default | Descrição |
|----------|---------|-----------|
| `TVDE_SIM_API_BASE_URL` | `http://localhost:8000` | URL da API |
| `TVDE_SIM_PASSENGER_BOTS` | `20` | Número de bots passageiros (normal) |
| `TVDE_SIM_DRIVER_BOTS` | `12` | Número de bots motoristas |
| `TVDE_SIM_SCENARIO` | `normal` | normal \| flash_crowd \| heavy_load |
| `TVDE_SIM_FLASH_CROWD_PASSENGERS` | `20` | Passageiros no flash crowd |
| `TVDE_SIM_MAX_REQUESTS_PER_SECOND` | `0` | Rate limit (0 = sem limite) |
| `TVDE_SIM_RANDOM_SEED` | — | Seed para reprodutibilidade |
| `TVDE_SIM_TOKEN_PASSENGER` | — | Token override (Render) |
| `TVDE_SIM_TOKEN_DRIVER` | — | Token override (Render) |

## Exemplo para Render

```bash
export TVDE_SIM_API_BASE_URL=https://tvde-api.onrender.com
export TVDE_SIM_TOKEN_PASSENGER="eyJ..."
export TVDE_SIM_TOKEN_DRIVER="eyJ..."
python -m tools.simulator.simulator
```

## Comportamento

- **PassengerBot:** Espera 20–120 s, cria viagem, 20% probabilidade de cancelar após 10–30 s
- **DriverBot:** Polling de viagens disponíveis, aceita uma, simula arriving → start → complete (delays humanos)

Cada bot tem o seu próprio token (20 passageiros distintos, 12 motoristas distintos).

## Análise de resultados (teste 05/03/2026)

### Resumo do teste
- **Duração:** 276 s (~4,6 min)
- **Viagens criadas:** 41
- **Viagens canceladas:** 8 (passageiros)
- **Cancel falhou:** 0
- **Aceites:** 11
- **Concluídas:** 3
- **Aceite falhou:** 0
- **Motorista skip:** 1 (passageiro cancelou a caminho)

### Stripe
- Todos os webhooks com **200 OK**
- Fluxo: `payment_intent.created` → `confirm` → `capture` para as 3 viagens concluídas
- Eventos `charge.succeeded`, `charge.captured`, `payment_intent.succeeded` recebidos corretamente

### Backend
- Um **409 Conflict** em `arriving` (trip cancelada pelo passageiro) — tratado pelo DriverBot com skip
- Seed-simulator chamado 2× (possível duplo arranque do simulador)

### Conclusão
O fluxo end-to-end está a funcionar: criação de viagens, aceite, arriving, start, complete, cancelamentos e integração Stripe. O 409 é esperado quando o passageiro cancela antes do motorista chegar.
