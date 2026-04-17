# SP-G — Verdade operacional (“30 segundos”)

## Intenção

Uma vista (ou bloco no dashboard) responde em segundos: **o que está a correr mal agora** e **para onde ir**.

## Critérios de aceite

- Indicadores mínimos: viagens activas (ou contagem equivalente já exposta), **alertas de saúde** agregados, pagamentos “presos” (definição fechada alinhada a `system_health`).
- Ligações para as tabs/acções já existentes (Viagens, Saúde, Operações).
- **Sem** dashboards BI, gráficos ou drill-down infinito.

## Estado (repo)

- **Web-app:** tab **«Agora»** no painel admin (primeira na barra); URL sem `tab` ou com `tab` inválido abre **Agora**. Mostra estado `system-health`, contagens de anomalias e `stuck_payments`, números de **métricas** (viagens activas, motoristas disponíveis, em curso), pendentes de aprovação, alertas `zero_drivers` / `zero_trips_today`, e botões **Ir para Viagens / Saúde / Operações / Métricas**.

## Exclusões

- Novo motor de métricas paralelo ao existente.
