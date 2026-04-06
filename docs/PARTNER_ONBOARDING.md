# Partner onboarding (piloto)

Fluxo mínimo para uma frota entrar no TVDE com isolamento multi-tenant.

## 1. Criar organização (admin)

Autenticar como **admin** (OTP ou credenciais conforme ambiente).

```http
POST /admin/partners
Authorization: Bearer <admin_token>
Content-Type: application/json

{"name": "Nome da frota"}
```

Resposta: `id` (UUID da org) — guardar como `partner_id`.

## 2. Criar gestor de frota (admin)

```http
POST /admin/partners/{partner_id}/create-admin
Authorization: Bearer <admin_token>
Content-Type: application/json

{"name": "Gestor", "phone": "+351..."}
```

O utilizador fica com `role=partner` e `partner_org_id` ligado à org. O telefone serve para login OTP (não há signup público para `partner`).

## 3. Atribuir motoristas à frota (admin)

Cada motorista já deve existir como utilizador `driver` com perfil em `drivers`.

```http
POST /admin/drivers/{driver_user_id}/assign-partner
Authorization: Bearer <admin_token>
Content-Type: application/json

{"partner_id": "<uuid da org>"}
```

- **409** `driver_has_active_trip` se o motorista tiver viagem em `assigned|accepted|arriving|ongoing`.
- Reatribuir à frota default (remover da org atual):

```http
DELETE /admin/drivers/{driver_user_id}/assign-partner
Authorization: Bearer <admin_token>
```

(idempotente; mesma regra de viagem ativa.)

## 4. Primeiro uso (gestor partner)

Login OTP com o telefone do gestor. Chamadas típicas:

- `GET /partner/metrics` — indicadores da frota
- `GET /partner/drivers` — lista de motoristas
- `GET /partner/drivers/{driver_user_id}` — detalhe
- `GET /partner/trips` — viagens atribuídas a motoristas **atualmente** nesta frota
- `GET /partner/trips/export` — CSV (`trip_id`, `driver_id`, `status`, `created_at`, `completed_at` em UTC)

Todas exigem Bearer do utilizador **partner**; dados filtrados por `partner_id` do contexto.

## 5. Ferramenta local (opcional)

```bash
cd tools/api_runner
python runner.py admin_flow    # OTP admin + cria partner
python runner.py partner_flow  # OTP partner + métricas
python runner.py full_flow     # fluxo encadeado (requer `assign_driver_user_id` no config se houver passo de assign)
```

Configurar `tools/api_runner/config.json`: `base_url`, `phones.admin`, `phones.partner`, e opcionalmente `assign_driver_user_id` para o `full_flow`.
