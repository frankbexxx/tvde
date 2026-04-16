# SP-B — Trilho de auditoria (obrigatório)

## Intenção

Toda ação **sensível** de administrador fica **append-only**, **consultável** e **correlacionável** (utilizador / viagem / pagamento quando existir).

## Critérios de aceite

- Registo com: **actor_user_id**, **ação** (`admin.*`), **entidade** (`entity_type` + `entity_id`), **payload** JSON (antes/depois ou metadados), **occurred_at**.
- **Leitura:** endpoint admin autenticado para listar eventos `admin.*` com paginação e filtros opcionais (`entity_type`, `entity_id`).
- **Sem** apagar linhas de auditoria pelo API normal (cleanup cron existente mantém política de retenção já definida no produto).

## Implementação canónica (repo)

- Reutiliza a tabela **`audit_events`** com `event_type` prefixado por `admin.` para distinguir de eventos de domínio (ex. viagem).
- Serviço: `app/services/admin_audit.py` — `record_admin_action(...)`.

## Exclusões (outras ondas)

- Export legal completo “tribunal-ready” (SP-B só prepara dados brutos / CSV pode vir depois).
- UI rica no web-app (pode ser onda seguinte ligada ao mesmo endpoint).

## Estado

- **Primeira entrega (repo):** `record_admin_action` + `GET /admin/audit-trail` + instrumentação nas mutações admin acordadas; testes em `backend/tests/test_admin_audit_trail.py` (bloquear utilizador → linha `admin.user_block` + listagem no endpoint).
- **Seguinte (opcional):** UI no web-app; export CSV se fizer falta operacional.
