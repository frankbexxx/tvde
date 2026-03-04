# TVDE Traffic Simulator

Simulador de tráfego leve para testes concorrentes do backend TVDE. Cria bots passageiros e motoristas que usam a API existente.

**Objetivo:** Gerar comportamento concorrente plausível para validar state machine, race conditions, dispatch, cancelamentos, disponibilidade e consistência financeira.

## Pré-requisitos

- Backend a correr (local ou Render) com ENV=dev
- O simulador chama `POST /dev/seed-simulator` para criar N passageiros e M motoristas automaticamente
- Para Render sem dev tools: definir `TVDE_SIM_TOKEN_PASSENGER` e `TVDE_SIM_TOKEN_DRIVER` (modo legado, 1 user por role)

## Instalação

```bash
cd backend
pip install -r tools/simulator/requirements.txt
```

## Execução

A partir da raiz do projeto:

```bash
python run_simulator.py
```

Ou a partir do backend:

```bash
cd backend
python -m tools.simulator
```

## Configuração

Editar `config.py` ou variáveis de ambiente:

| Variável | Default | Descrição |
|----------|---------|-----------|
| `TVDE_SIM_API_BASE_URL` | `http://localhost:8000` | URL da API |
| `TVDE_SIM_PASSENGER_BOTS` | `20` | Número de bots passageiros |
| `TVDE_SIM_DRIVER_BOTS` | `8` | Número de bots motoristas |
| `TVDE_SIM_MAX_ACTIVE_TRIPS` | `30` | (reservado) |
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

Todos os bots de cada tipo partilham o mesmo token (seed cria 1 passageiro, 1 motorista).
