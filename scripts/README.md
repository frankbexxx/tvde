# Scripts de automação — Teste do Simulador

Scripts PowerShell e Python para automatizar o protocolo de teste. Executar a partir da raiz do projeto (`C:\dev\APP`).

| Script | O que faz |
|--------|-----------|
| `driver_simulator.py` | Simula N motoristas (location, accept, lifecycle). Requer backend com ENABLE_DEV_TOOLS. |
| `1_start_db.ps1` | Inicia o contentor PostgreSQL (cria se não existir), espera 8 s |
| `2_reset_db.ps1` | TRUNCATE payments, trips via `POST /dev/reset` (backend deve estar a correr) |
| `3_collect_data.ps1` | Recolhe dados da BD e exporta `unified_payments.csv` + relatório em `logs/` |

## Driver Simulator (PROMPT_02)

```bash
# 10 motoristas, intervalo 3s
python scripts/driver_simulator.py --drivers 10

# 50 motoristas, API no Render
API_BASE=https://tvde-api-fd2z.onrender.com python scripts/driver_simulator.py --drivers 50
```

Requer: `pip install httpx` (ou venv do backend).

## Uso

```powershell
cd C:\dev\APP

# 1. Iniciar BD
.\scripts\1_start_db.ps1

# 2. (Backend e Stripe CLI a correr noutras janelas)
# 3. Reset antes do teste
.\scripts\2_reset_db.ps1

# 4. python run_simulator.py (correr manualmente)
# 5. Ctrl+C para parar
# 6. Recolher dados
.\scripts\3_collect_data.ps1
```

## Política de execução

Se der erro "cannot be loaded because running scripts is disabled":

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
