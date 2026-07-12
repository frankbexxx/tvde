# TVDE-BKP — backups Postgres + restore test

Runbook operacional para validar que a BD de produção (`tvde-db` no Render) tem backup utilizável e que conseguimos restaurar para uma base **isolada**.

**Complementa:** [`TODO_CODIGO_TVDE.md`](../TODO_CODIGO_TVDE.md) §3 · [`FORWARD_PLAN_2026-07.md`](FORWARD_PLAN_2026-07.md) · [Render Postgres Recovery](https://render.com/docs/postgresql-backups)

---

## Regras

| Permitido | Proibido |
|-----------|----------|
| `pg_dump` via **External Database URL** (sessão PowerShell) | Gravar URLs/passwords no repo ou em `.env` commitado |
| Restore em Docker local ou BD Render **nova/vazia** | Restore sobre `tvde-db` (produção) |
| Registar contagens e flags (`is_test_account`) | Imprimir `password_hash`, OTP, dumps no chat/Git |

---

## 1. Render — confirmar backups (`tvde-db`)

1. [Render Dashboard](https://dashboard.render.com) → PostgreSQL **`tvde-db`**
2. Separador **Recovery**
3. Separador **Info** (versão PostgreSQL, sem copiar URL para ficheiros do repo)

| Campo | O que registar |
|-------|----------------|
| **PITR** | activo sim/não |
| **Janela** | Hobby: 3 dias · Pro+: 7 dias |
| **Export lógico** | disponível sim/não · retenção Render: **7 dias** |
| **Plano** | ex. Basic-256mb (paid → PITR activo) |

> Instâncias **Free** não têm PITR nem export no painel — usar só `pg_dump` manual.

---

## 2. Export manual (`pg_dump`)

### Pré-requisitos

- **External Database URL** no password manager (Render → Info)
- Pasta de dumps **fora** de `C:\dev\APP`
- Cliente PostgreSQL: instalado localmente **ou** imagem Docker `postgres:18` (versão ≥ servidor)

### Nome do ficheiro

```
tvde-prod_YYYY-MM-DD_HHmm.dump
```

### PowerShell — export via Docker (validado 2026-07-12)

```powershell
$backupRoot = "<pasta fora do repo>"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

$ts = Get-Date -Format "yyyy-MM-dd_HHmm"
$dumpFile = Join-Path $backupRoot "tvde-prod_$ts.dump"

# URL só na sessão; nunca echo nem commit
$env:DATABASE_URL_PROD = "<External Database URL do Render>"
$pgUrl = $env:DATABASE_URL_PROD -replace '\+psycopg2',''

docker run --rm `
  -v "${backupRoot}:/backup" `
  postgres:18 `
  pg_dump `
    --dbname="$pgUrl" `
    --format=custom `
    --no-owner `
    --no-privileges `
    --file="/backup/tvde-prod_$ts.dump"

Get-Item $dumpFile | Select-Object Name, Length, LastWriteTime

docker run --rm -v "${backupRoot}:/backup" postgres:18 `
  pg_restore --list "/backup/tvde-prod_$ts.dump" | Select-Object -First 5
```

**Esperado:** ficheiro com `Length > 0`; `pg_restore --list` lista objectos `public.*`.

---

## 3. Restore isolado (Docker local)

**Destino validado:** Postgres 18 em Docker, porta **5433**, BD `tvde_restore`.

```powershell
docker run -d --name tvde-restore-test `
  -e POSTGRES_PASSWORD=restore_local_only `
  -e POSTGRES_DB=tvde_restore `
  -p 5433:5432 `
  postgres:18

$restoreUrl = "postgresql://postgres:restore_local_only@localhost:5433/tvde_restore"

psql --dbname="$restoreUrl" -c "SELECT version();"

docker run --rm `
  -v "${backupRoot}:/backup" `
  --network host `
  postgres:18 `
  pg_restore `
    --dbname="$restoreUrl" `
    --verbose `
    --no-owner `
    --no-privileges `
    --clean `
    --if-exists `
    "/backup/tvde-prod_$ts.dump"
```

> **Nunca** usar a External URL de produção como destino do `pg_restore`.

### Restore numa BD Render nova (opcional, não executado em 2026-07-12)

Criar instância PostgreSQL vazia (ex. `tvde-bkp-restore-test`), obter External URL **dessa** instância, repetir `pg_restore` para essa URL. Apagar/suspender após validação.

---

## 4. Validação pós-restore

Ligar **só** à BD restore.

### Contagens

```powershell
psql --dbname="$restoreUrl" -v ON_ERROR_STOP=1 -c @"
SELECT 'users' AS tbl, COUNT(*)::bigint AS n FROM users
UNION ALL SELECT 'drivers', COUNT(*) FROM drivers
UNION ALL SELECT 'trips', COUNT(*) FROM trips
UNION ALL SELECT 'trip_offers', COUNT(*) FROM trip_offers;
"@

psql --dbname="$restoreUrl" -c "SELECT version_num FROM alembic_version;"
```

Comparar `version_num` com `alembic heads` no repo (`backend/`).

### Contas real vs teste (sem dados sensíveis)

```powershell
psql --dbname="$restoreUrl" -c @"
SELECT phone, role, is_test_account
FROM users
WHERE phone IN ('+351924075365', '+351912345678', '+351911111111', '+351955555502')
ORDER BY phone;
"@
```

| Telefone | Esperado |
|----------|----------|
| `+351924075365` | `is_test_account = false` (conta real) |
| `+351912345678` | teste (passageiro) |
| `+351911111111` | teste (motorista) |
| `+351955555502` | teste (partner) |

---

## 5. Segurança e limpeza

| Tema | Regra |
|------|--------|
| **Armazenamento dump** | Fora do repo; retenção manual sugerida ≤ 30 dias |
| **Apagar dump** | Após registo documental ou quando já não necessário |
| **Sessão PowerShell** | `Remove-Item Env:DATABASE_URL_PROD -ErrorAction SilentlyContinue` |
| **Docker** | `docker stop tvde-restore-test; docker rm tvde-restore-test` |
| **Git** | Nunca commitar `.dump`, `.sql`, `.tar.gz` |

---

## 6. Critérios TVDE-BKP

### OK

- PITR activo **ou** export lógico recente no Render
- `pg_dump` concluído; `pg_restore --list` OK
- Restore completo em BD isolada sem erros fatais
- Contagens coerentes; `alembic_version` = head do repo
- Conta real e contas teste piloto presentes
- Produção intacta; nenhum secret/dump no repo

### INCOMPLETO

- Falha export/restore; schema desalinhado; contas em falta; dump exposto

---

## 7. Registo de execução — 2026-07-12

Execução manual (Frank). Sem alteração de código nem de dados de produção.

### Render (`tvde-db`)

| Campo | Resultado |
|-------|-----------|
| PITR | sim |
| Janela | 3 dias |
| Export lógico | sim (retenção 7 dias) |
| Plano | Basic-256mb |

### `pg_dump`

| Campo | Resultado |
|-------|-----------|
| Estado | OK |
| Ferramenta | Docker `postgres:18` |
| Ficheiro | `tvde-prod_2026-07-12_1521.dump` |
| Tamanho | 149 280 bytes |
| `pg_restore --list` | OK |
| Versão origem | PostgreSQL 18.3 |
| Formato | CUSTOM |

### Restore local

| Campo | Resultado |
|-------|-----------|
| Estado | OK |
| Destino | Docker `postgres:18`, BD `tvde_restore`, porta 5433 |
| Erros fatais | nenhum |
| Produção | intacta |

### Validação

| Métrica | Valor |
|---------|-------|
| users | 13 |
| drivers | 4 |
| trips | 117 |
| trip_offers | 74 |
| `alembic_version` | `b5c6d7e8f9a0` (= head repo) |

| Telefone | role | `is_test_account` | OK |
|----------|------|-------------------|-----|
| +351924075365 | super_admin | false | sim |
| +351912345678 | passenger | true | sim |
| +351911111111 | driver | true | sim |
| +351955555502 | partner | true | sim |

### Limpeza

- Variável `DATABASE_URL_PROD` removida da sessão
- Container `tvde-restore-test` removido
- Dump guardado fora do repo (pasta local dedicada)
- Nenhum secret/dump no repositório

**Estado:** **TVDE-BKP = OK**

---

## 8. Próximos passos (opcional)

- Restore de validação numa BD Render nova (cloud path)
- Rotina periódica de export manual ou backup para S3 ([Render guide](https://render.com/docs/backup-postgresql-to-s3))
- Fechar **O-STRIPE-1** para completar **TVDE-PROD**
