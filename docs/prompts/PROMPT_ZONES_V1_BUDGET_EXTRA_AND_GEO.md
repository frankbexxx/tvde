# Prompt — Zonas v1: orçamento extra (partner) + geo por `zone_id`

**Objectivo:** fechar a linha pendente em [`docs/product/DRIVER_MENU_SPEC.md`](../product/DRIVER_MENU_SPEC.md) §7 — **mudança extra (>2/dia) com autorização do partner** e reforço de **geo canónica por `zone_id`** no catálogo.

**Contexto já em `main`:**

- `DriverZoneDayBudget` (`used` / `max` / dia civil Lisboa); consumo só na 1.ª viagem `completed` após `arrived_at`.
- `POST /driver/zones/sessions`, `arrived`, `request-extension`; partner `approve-extension` (tempo no `deadline_at`).
- Catálogo estático em `app/services/zone_catalog.py` com `zone_arrived_geo_gate` e âncoras expostas em `GET /driver/zones/catalog`.

---

## 1. Backend — partner aumenta `max_changes`

1. Serviço em `app/services/driver_zones.py`:
   - `grant_partner_zone_budget_extra(db, *, partner_id, driver_user_id, service_date | None, extra_max_changes, partner_actor_user_id)`:
     - Garantir motorista da frota (`get_driver_for_partner`).
     - Dia de serviço = `service_date` ou `service_date_local_now()` (`Europe/Lisbon`).
     - Obter ou criar `DriverZoneDayBudget` para `(driver_id, service_date)`.
     - `max_changes_count += extra_max_changes` com `extra_max_changes` ∈ [1, N] (ex. N=5 por pedido) e tecto global (ex. 20) para evitar abuso por API.
     - `log_event` com partner, driver, datas, valores antes/depois.
2. API partner em `app/api/routers/partner.py`:
   - `POST /partner/drivers/{driver_user_id}/zones/budget/grant-extra` — body `{ "extra_max_changes": 1, "service_date": "YYYY-MM-DD" | null }`.
   - `GET /partner/drivers/{driver_user_id}/zones/budget/today` — mesma forma que o motorista vê (used/max/remaining), com verificação de frota.
3. Erros: `404` se motorista não é da org; `400` se parâmetros inválidos; `409` desnecessário se só somamos max.

## 2. Geo `zone_id`

- Manter modelo: só zonas no mapa `_ZONE_ARRIVED_GATES` validam «Cheguei»; outras continuam sem gate (compatível).
- Acrescentar ao catálogo zonas PT óbvias em falta (ex. **Porto centro**) com âncora + raio moderado, espelhando o padrão Faro/Portimão.

## 3. Web (partner)

- `web-app/src/api/partner.ts`: funções tipadas para GET budget + POST grant-extra.
- `PartnerDriverDetail.tsx`: bloco «Mudanças de zona hoje» — mostrar `used/max/remaining` (GET) e botão «+1 mudança autorizada (hoje)» (POST com confirmação curta).

## 4. Testes

- `backend/tests/test_driver_zones.py` (ou ficheiro dedicado):
  - Com `used=2`, `max=2`, grant +1 → `remaining=1` → `POST /driver/zones/sessions` **201**.
  - Partner errado → **404**.
  - `extra_max_changes` 0 ou > cap → **400**.

## 5. Documentação e quadros (no **mesmo** PR que o código)

- `DRIVER_MENU_SPEC.md` §7.3 — documentar os dois endpoints partner.
- [`docs/todo-em-curso.md`](../todo-em-curso.md) e [`TODOdoDIA.md`](../../TODOdoDIA.md) — marcar fecho da fatia **Zonas v1** (geo catálogo + orçamento extra) ou reduzir rasto a itens ainda abertos.

## 6. Definição de feito

- `pytest` relevante verde; `npm run lint` + `npm run build` no `web-app`.
- Smoke manual opcional: partner concede +1 → motorista vê novo limite no menu zonas e cria sessão.

---

_Organização: prompt reutilizável para sessões; última revisão **2026-05-06**._
