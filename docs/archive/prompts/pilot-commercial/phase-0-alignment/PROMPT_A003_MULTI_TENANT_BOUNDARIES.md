# PROMPT A003 — Multi-tenant boundaries

**Estado:** contém as instruções (prompt) e a secção **Execução (resultado)**; no fim, verificação ao código e **última revisão** do ficheiro.  
**Fase:** 0 — Alinhamento & contrato de produto

**Realidade do código (hoje):** não há coluna `partner_id` nem organização tenant na BD conforme modelo abaixo; isolamento **completo** entre parceiros **ainda não está enforced**. A execução define o **contrato alvo** e riscos até lá.

---

## Prompt (instruções)

### Contexto

Múltiplos parceiros (fleets); cada um com vários drivers; viagens ligadas a passageiro e motorista; passageiros tratados como **clientes da plataforma** (não pertencem a um partner).

### Objetivo

Definir multi-tenant: o que pertence a quem; como evitar leaks entre parceiros.

### Instruções

1. Entidades principais e ownership (global vs isolado).
2. Regras de ownership explícitas.
3. Regras de acesso por role.
4. Pontos de risco.
5. Estratégia de enforcement (sem código).
6. Casos limite.

### Restrições

- Pensar em dados reais; não ignorar edge cases críticos.

### Output esperado

Lista de entidades, regras de acesso, riscos, estratégia de enforcement.

---

## Execução (resultado)

### 1. Entidades principais

| Entidade                        | Natureza                                  | Pertence / isolamento                                                                                                          |
| ------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **User** (conta)                | Global na plataforma                      | Identidade única (ex.: telefone). Pode ter `role` passenger, driver, partner, admin.                                           |
| **Partner** (organização)       | Tenant                                    | Entidade **nova** no modelo alvo: `id`, nome, estado, …                                                                        |
| **Driver** (perfil operacional) | Ligado a **um** User e **um** Partner     | Dados de condução, disponibilidade, comissão **no contexto do tenant**.                                                        |
| **Trip**                        | Global no sentido “negócio da plataforma” | `passenger_id` global; `driver_id` implica **partner_id** derivado do driver. **Filtro partner** = via join driver.partner_id. |
| **Payment / Stripe**            | Ligado à trip                             | Acesso partner: apenas trips do tenant; admin: global.                                                                         |

**Passageiro:** não tem `partner_id`; não “pertence” a uma frota. **Parceiro** nunca “possui” passageiros — apenas vê viagens **executadas pelos seus** motoristas.

---

### 2. Regras de ownership

- **Driver (perfil)** → **um** `partner_id` obrigatório para operação em modelo multi-parceiro (MVP).
- **Trip** → propriedade lógica: passageiro (cliente) + plataforma; **visibilidade partner** = derivada do motorista atribuído/aceite.
- **Métricas agregadas partner** → escopo `partner_id` único.

---

### 3. Regras de acesso (filtros implícitos)

| Role      | Filtro                                                                     |
| --------- | -------------------------------------------------------------------------- |
| Passenger | `passenger_id = me`                                                        |
| Driver    | trips onde é motorista atribuído / ofertas elegíveis para si               |
| Partner   | `driver.partner_id = meu_tenant` em todas as listagens e detalhes de frota |
| Admin     | sem filtro tenant (com auditoria)                                          |

---

### 4. Pontos de risco (crítico)

1. **Listagens** `GET /trips`, `GET /driver/...` sem `partner_id` quando o caller é partner → **vazamento**.
2. **IDs adivinháveis** (UUID) com autorização só por “é autenticado” → partner poderia abrir trip de outro se o endpoint não validar tenant.
3. **Joins** trip → driver sem filtrar partner ao servir partner.
4. **Admin impersonation** sem log → perda de trilho legal.
5. **Reports / exports** gerados a partir de queries partilhadas sem `WHERE partner_id`.

---

### 5. Estratégia de enforcement (alvo)

1. **Coluna `partner_id`** em `drivers` (mínimo); opcional `partners` table e FK.
2. **Dependency ou policy** no FastAPI: para rotas partner, injetar `current_partner_id` a partir do JWT e **recusar** se role ≠ partner.
3. **Serviço de domínio** para queries de trip por partner: sempre `JOIN drivers ON … AND drivers.partner_id = :tenant`.
4. **Testes** automatizados: dois partners, dados cruzados, garantir 403/404 e lista vazia.
5. **Middleware** sozinho é insuficiente se cada rota não usar o contexto tenant — preferir **camada de repositório/serviço** com API estreita.

---

### 6. Casos limite

| Caso                          | Decisão recomendada (produto)                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Driver muda de partner        | Congelar ou histórico: trips antigas mantêm contexto do partner à data; novas operações só no partner novo. **Migrar** só com processo admin.                |
| Trips antigas pré-tenant      | Backfill `partner_id` a partir do driver; ou marcar “legacy” e visíveis só a admin.                                                                          |
| Admin vê tudo                 | Sim, com política interna e audit log.                                                                                                                       |
| Mesma pessoa partner + driver | Duas contas ou dual-role **explícito** na UI; JWT deve carregar contexto de **shell** (já usado no front) sem misturar permissões num único request ambíguo. |

---

### Nota final (A003)

Multi-tenant mal definido ou mal enforced = **bug crítico** em produção. Até existir `partner_id` e testes de isolamento, **não** comercializar operação multi-parceiro real.

---

### Primeiros pontos de implementação (ordem no código)

Sincronizado com [`../IMPLEMENTATION_SEQUENCE.md`](../IMPLEMENTATION_SEQUENCE.md).

1. **Tabela `drivers`** — coluna `partner_id` (FK → `partners.id`) + migração + backfill para ambiente de desenvolvimento/piloto único.
2. **Modelo ORM** — [`backend/app/db/models/driver.py`(../../../../backend/app/db/models/driver.py): mapear FK; relação `partner` se existir modelo `Partner`.
3. **Queries de trips para partner** — novos métodos de serviço: sempre `Trip` JOIN `Driver` com `Driver.partner_id == tenant_id`. Não reaproveitar `list_completed_trips_for_passenger` / `list_completed_trips_for_driver` sem novo wrapper com filtro tenant.
4. **Endpoints críticos a isolar** — ao introduzir `GET /partner/trips`, `GET /partner/trips/{id}`, `GET /partner/drivers`: cada um valida tenant; para `trip_id` por UUID, **recusar** se `trip.driver.partner_id != current_partner_id`.
5. **Listagens genéricas** — auditar [`matching.py`(../../../../backend/app/api/routers/matching.py), ofertas, e qualquer `select(Trip)` futuro acoplado a role partner (hoje inexistente — evitar copy-paste sem JOIN).
6. **Testes** — dois tenants, prova de não-vazamento (lista vazia ou 403/404).

---

### Verificação cruzada com o código

- `backend/app/db/models/*.py` — grep sem ocorrências de `partner` / `partner_id`; tenant multi-parceiro **ainda não** modelado na ORM.

---

_Última revisão deste ficheiro: 2026-04-05_
