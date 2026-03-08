Ficheiros criados
1. PROTOCOLO_TESTE_SIMULADOR.md
Guia passo a passo com:
•	Ordem de arranque (Docker → BD → Backend → Stripe CLI)
•	Tempos de espera (ex.: 1–2 min Docker, 8 s PostgreSQL)
•	Notas (Stripe webhook secret, ENV=dev, etc.)
•	Reset via POST /dev/reset (TRUNCATE payments, trips CASCADE)
•	Execução do simulador
•	Recolha de dados (6 blocos)
•	Checklist e troubleshooting
2. Scripts em scripts/
Script	Função
1_start_db.ps1	Inicia o contentor PostgreSQL (cria se não existir), espera 8 s
2_reset_db.ps1	Chama POST /dev/reset (o backend tem de estar a correr)
3_collect_data.ps1	Gera logs/test_report_*.txt e unified_payments.csv
________________________________________
Dados que preciso para analisar
#	Dado	Como obter
1	Resultado do simulador	logs/simulator_result_*.txt (mais recente)
2	Viagens por estado	Output de 3_collect_data.ps1 ou query SQL manual
3	unified_payments.csv	Gerado por 3_collect_data.ps1
4	Stripe CLI	Copiar output do terminal do stripe listen
5	Backend	Copiar output do terminal do uvicorn
6	Stripe Dashboard	(Opcional) Screenshot ou lista de requests
________________________________________
Sequência rápida
# Janela 1 — Docker
cd C:\dev\APP
.\scripts\1_start_db.ps1
# Janela 2 — Backend
cd C:\dev\APP\backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
# Janela 3 — Stripe (copiar whsec_... para .env e reiniciar backend)
stripe listen --forward-to localhost:8000/webhooks/stripe
# Janela 4 — Reset + Simulador
cd C:\dev\APP
.\scripts\2_reset_db.ps1
python run_simulator.py
# ... deixar correr 3–5 min ...
# Ctrl+C
# Recolher dados
.\scripts\3_collect_data.ps1
Depois envia o conteúdo de:
•	logs/simulator_result_*.txt
•	logs/test_report_*.txt
•	unified_payments.csv
•	Output do Stripe CLI
•	Output do Backend

