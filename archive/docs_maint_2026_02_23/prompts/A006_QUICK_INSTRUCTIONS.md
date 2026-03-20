# A006 Geo Stability Layer — Instruções Rápidas

## O que foi implementado

1. **Envio imediato de localização** — O motorista envia a localização assim que fica disponível (antes era só a cada 3s).
2. **Controlo de staleness** — Localizações com mais de 15s são ignoradas no dispatch.
3. **Retry do dispatch** — Se não houver ofertas, o sistema tenta até 3 vezes com 2s de intervalo.
4. **Logs estruturados** — `driver_location_first_send`, `stale_location_filtered`, `NO_READY_DRIVERS_AT_DISPATCH`, `dispatch_retry_*`.

## Como testar

```bash
# Backend (PostgreSQL a correr)
cd backend
python -m pytest tests/test_geo_stability.py -v

# Todos os testes
python -m pytest -v
```

## Configuração

- `LOCATION_MAX_AGE_SECONDS=15` em `config.py` (ajustável via env).
- Retry: 3 tentativas, 2s entre cada.

## Verificação rápida

1. **Motorista** — Abrir dashboard, ficar online → primeira localização enviada imediatamente (ver Network: `POST /drivers/location`).
2. **Dispatch** — Criar viagem com motorista offline → sem ofertas. Ligar motorista e criar nova viagem → ofertas criadas.
3. **Logs** — Procurar `driver_location_first_send` e `dispatch_retry_success` nos logs do backend.
