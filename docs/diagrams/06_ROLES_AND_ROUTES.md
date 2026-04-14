# Diagrama — papéis e superfícies

Valores de `Role` em `backend/app/models/enums.py`. As rotas exactas estão na API e no router do `web-app` (ex.: `/passenger`, `/driver`, `/admin`, `/partner`).

```mermaid
flowchart TB
  subgraph roles["Role no token / sessão"]
    passenger[passenger]
    driver[driver]
    admin[admin]
    partner[partner]
  end

  subgraph ui["Superfícies web típicas"]
    PUI[Dashboard passageiro]
    DUI[Dashboard motorista]
    AUI[Admin / ops]
    KUI[Partner / frota]
  end

  passenger --> PUI
  driver --> DUI
  admin --> AUI
  partner --> KUI
```

## Leitura cruzada

- Onboarding técnico de frota: [`docs/PARTNER_ONBOARDING.md`](../PARTNER_ONBOARDING.md)

Índice: [README.md](README.md)
