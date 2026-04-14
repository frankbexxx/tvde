# Diagrama — cron e jobs agregados

O host externo (ex.: cron-u.org ou similar) chama a API com o header **`X-Cron-Secret`** alinhado a `CRON_SECRET`. Documentação operacional: `docs/CRON_JOB_ORG_INSTRUCOES.md`, `docs/ops/OPERATION_CHECKLIST.md`.

```mermaid
sequenceDiagram
  participant H as Host cron\n(exterior)
  participant API as FastAPI\nGET /cron/jobs
  participant DB as PostgreSQL

  H->>API: GET /cron/jobs\n(?secret=… ou header X-Cron-Secret)
  API->>API: valida segredo
  API->>DB: jobs / reconciliação\n(conforme implementação)
  API-->>H: 200 + corpo JSON
```

Índice: [README.md](README.md)
