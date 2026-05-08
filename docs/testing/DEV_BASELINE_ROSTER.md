# Baseline de utilizadores (dev / teste)

**Verdade canónica** para «casa limpa»: mesma lógica em **código** (`app/services/baseline_reset.py` → `BASELINE_USERS`) e neste quadro.

## Quadro (E.164)

| Telemóvel | Papel | Nome em ecrã | Notas |
|-----------|--------|--------------|--------|
| +351911111111 | driver | test_driver | Frota **Default fleet** (`DEFAULT_PARTNER_UUID`) — incluso no discover «pool default». |
| +351912345678 | passenger | test_passenger | Conta teste. |
| +351924075365 | super_admin | frank | |
| +351955555502 | partner | test_partner | Org **`test_partner`** (`BASELINE_PARTNER_FLEET_UUID`). |
| +351938874006 | passenger | Kenia | Nome real; conta virtual. |
| +351918304615 | driver | Marly | Frota **test_partner** (não no pool default de discover). |
| +351918870365 | passenger | Jeff | |
| +351967330628 | passenger | Maria João | |
| +351939694569 | driver | Manel Perez | Frota **test_partner**. |
| +351900000000 | admin | dev_admin | Útil para promover outras contas em dev; BETA OTP. |

## Frotas

- **Default fleet** — UUID fixo `00000000-0000-4000-8000-000000000001` (migração + código).
- **test_partner** — UUID fixo `a0000002-0000-4000-8000-000000000001` (`BASELINE_PARTNER_FLEET_UUID`).

## Como aplicar (wipe completo + seed)

### API local (stack dev)

Com **`ENVIRONMENT` ≠ prod** e **`ENV=dev`** ou **`ENABLE_DEV_TOOLS=true`**:

```http
POST /dev/baseline-reset
```

Sem corpo. Resposta inclui `users` (ids por telefone) e `partners`.

### Script (local **ou** Render)

Em **produção** o router `/dev/*` **não** é montado. Para igualar a BD alojada, usa o mesmo código via CLI (connection string da variável **`DATABASE_URL`**):

```powershell
cd backend
$env:DATABASE_URL = "<postgres do Render ou local>"
python scripts/baseline_reset.py --confirm WIPE_ALL_TVDE_BASELINE
```

O flag `--confirm` tem de corresponder **exactamente** para evitar apagamentos acidentais.

### O que é apagado

Todos os dados das tabelas de negócio listadas em `app/services/baseline_reset.py` (`TRUNCATE … CASCADE`), **sem** mexer em `alembic_version`.

## Relação com `/dev/seed`

- **`POST /dev/seed`** é o seed **mínimo** para desenvolvimento rápido: **passageiro + admin + motorista** (pool default) **+ partner** **`+351955555502`** (org `test_partner` quando o registo `Partner` for criado pelo seed). **`POST /dev/tokens`** devolve JWTs `passenger`, `admin`, `driver` e **`partner`**.
- **`POST /dev/baseline-reset`** substitui **tudo** pelo quadro acima — usar quando quiseres **alinhamento total** entre máquinas.
