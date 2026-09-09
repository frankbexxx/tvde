# Baseline de utilizadores (dev / teste)

**Verdade canónica** para «casa limpa»: mesma lógica em **código** (`app/services/baseline_reset.py` → `BASELINE_USERS`) e neste quadro.

## Quadro (E.164)

| Telemóvel | Papel | Nome em ecrã | Notas |
|-----------|--------|--------------|--------|
| +351911111111 | driver | test_driver | Frota **Default fleet** (`DEFAULT_PARTNER_UUID`) — incluso no discover «pool default». Vehicle DEMO `DEMO-DF-01` + docs dummy compliant. |
| +351911111114 | driver | test_driver_b | Frota **test_partner**. Vehicle DEMO `DEMO-TP-03` + docs dummy compliant. |
| +351912345678 | passenger | test_passenger | Conta teste. |
| +351924075365 | super_admin | frank | |
| +351955555502 | partner | test_partner | Org **`test_partner`** (`BASELINE_PARTNER_FLEET_UUID`). |
| +351938874006 | passenger | Kenia | Nome real; conta virtual. |
| +351918304615 | driver | Marly | Frota **test_partner** (não no pool default de discover). Vehicle DEMO `11-AA-22`. |
| +351918870365 | passenger | Jeff | |
| +351967330628 | passenger | Maria João | |
| +351939694569 | driver | Manel Perez | Frota **test_partner**. Vehicle DEMO `33-BB-44`. |
| +351900000000 | admin | dev_admin | Útil para promover outras contas em dev; BETA OTP. |

## Frotas

- **Default fleet** — UUID fixo `00000000-0000-4000-8000-000000000001` (migração + código).
- **test_partner** — UUID fixo `a0000002-0000-4000-8000-000000000001` (`BASELINE_PARTNER_FLEET_UUID`).

## Vehicles DEMO + compliance (G-KYC-P0-04 readiness)

O `seed_baseline_users` cria **4** Vehicles DEMO (1 por Driver baseline), com os 4 documentos obrigatórios `approved` e `expires_at=2099-06-30` (dummy — não são documentos legais reais).

| Plate | Partner | Driver |
|-------|---------|--------|
| `DEMO-DF-01` | Default fleet | test_driver |
| `11-AA-22` | test_partner | Marly |
| `33-BB-44` | test_partner | Manel Perez |
| `DEMO-TP-03` | test_partner | test_driver_b |

Helper: `app/services/seed_demo_vehicle_compliance.py` (idempotente).

### Sync NON-WIPE (prod demo — sem wipe)

Para alinhar **apenas** o dataset DEMO acima sem `baseline_reset`:

- Service: `app/services/sync_demo_vehicle_compliance.py`
- CLI: `backend/scripts/sync_demo_vehicle_compliance.py`
- Default: **dry-run** (sem writes)
- Apply: `--apply --confirm SYNC_DEMO_VEHICLE_COMPLIANCE`
- Remoto: `ALLOW_REMOTE_DEMO_SYNC=YES` (não reutilizar `ALLOW_REMOTE_BASELINE_WIPE`)

Identificadores estáveis dos Drivers: phones E.164
`+351911111111`, `+351918304615`, `+351939694569`, `+351911111114`
(com `is_test_account=true`).

## Como aplicar (wipe completo + seed)

### API local (stack dev)

Com **`ENVIRONMENT` ≠ prod** e **`ENV=dev`** ou **`ENABLE_DEV_TOOLS=true`**:

```http
POST /dev/baseline-reset
```

Sem corpo. Resposta inclui `users` (ids por telefone), `partners` e `demo_vehicle_compliance`.

### Script (local por defeito)

```powershell
cd backend
$env:DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/test_db"
python scripts/baseline_reset.py --confirm WIPE_ALL_TVDE_BASELINE
```

O CLI **recusa** hosts remotos salvo `ALLOW_REMOTE_BASELINE_WIPE=YES` (wipe remoto intencional).  
O flag `--confirm` tem de corresponder **exactamente**.

**Não** usar este wipe em produção como forma de «só corrigir docs» — ver procedimento separado para demo prod.

### O que é apagado

Todos os dados das tabelas de negócio listadas em `app/services/baseline_reset.py` (`TRUNCATE … CASCADE`), **sem** mexer em `alembic_version`.

## Relação com `/dev/seed`

- **`POST /dev/seed`** é o seed **mínimo** para desenvolvimento rápido: **passageiro + admin + motorista** (pool default) **+ partner** **`+351955555502`** (org `test_partner` quando o registo `Partner` for criado pelo seed). **`POST /dev/tokens`** devolve JWTs `passenger`, `admin`, `driver` e **`partner`**.
- **`POST /dev/baseline-reset`** substitui **tudo** pelo quadro acima — usar quando quiseres **alinhamento total** entre máquinas.
