# Scripts de automação — Teste do Simulador

Scripts PowerShell para automatizar o protocolo de teste. Executar a partir da raiz do projeto (`C:\dev\APP`).

| Script | O que faz |
|--------|-----------|
| `1_start_db.ps1` | Inicia o contentor PostgreSQL (cria se não existir), espera 8 s |
| `2_reset_db.ps1` | TRUNCATE payments, trips via `POST /dev/reset` (backend deve estar a correr) |
| `3_collect_data.ps1` | Recolhe dados da BD e exporta `unified_payments.csv` + relatório em `logs/` |

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
