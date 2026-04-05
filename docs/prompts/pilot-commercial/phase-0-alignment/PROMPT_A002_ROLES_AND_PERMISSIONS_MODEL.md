# PROMPT A002 — Roles and permissions model

**Estado:** contém as instruções (prompt) e a secção **Execução (resultado)**; no fim, verificação ao código e **última revisão** do ficheiro.  
**Fase:** 0 — Alinhamento & contrato de produto

**Realidade do código (hoje):** `Role` em `backend/app/models/enums.py` = `passenger` | `driver` | `admin` apenas. **Não existe** `partner` nem multi-tenant no modelo de utilizador. A execução abaixo define o **modelo alvo** para piloto comercial e marca o gap.

---

## Prompt (instruções)

### Contexto

O sistema já possui autenticação JWT, utilizadores com `role`, e necessidade de introduzir **Partner** (fleet owner). Evolução para **multi-role** e **multi-tenant**.

### Objetivo

Definir modelo claro de roles, permissões e fronteiras, sem ambiguidade entre driver vs partner e partner vs admin.

### Instruções

1. Lista de roles explícitos (passenger, driver, partner_admin, admin; sub-roles opcional).
2. Permissões por role: ver / fazer / não fazer — trips, drivers, financeiro, sistema.
3. Relações: driver pertence a partner? partner controla drivers? admin sobrepõe?
4. Tabela crítica de ações × roles.
5. Fronteiras de segurança: o que **nunca** pode acontecer.

### Restrições

- Pensar backend-first. Clareza > flexibilidade.

### Output esperado

Secção por role, tabela, regras críticas de segurança.

---

## Execução (resultado)

### Gap actual vs alvo

| Aspecto    | Hoje (código)                         | Alvo (piloto comercial)                                              |
| ---------- | ------------------------------------- | -------------------------------------------------------------------- |
| Roles JWT  | `passenger`, `driver`, `admin`        | + `partner` (ou `partner_admin`)                                     |
| Tenant     | Sem `partner_id` em `drivers` / users | Cada driver (operacional) ligado a **um** partner; queries filtradas |
| UI Partner | Inexistente                           | Rota `/partner` (ou equivalente) com guard por role                  |

---

### 1. Roles propostos

| Role                                         | Descrição                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| **passenger**                                | Utilizador que pede viagens.                                           |
| **driver**                                   | Utilizador com perfil `drivers` que executa viagens.                   |
| **partner** (nome canónico: _partner_admin_) | Utilizador que gere **uma** organização (tenant) e os seus motoristas. |
| **admin**                                    | Operador da plataforma; visão global conforme política.                |

**Sub-roles (opcional, fase posterior):** `partner_viewer` (só leitura), `admin_support` (sem override destrutivo) — **fora do MVP** salvo necessidade legal.

---

### 2. Permissões por role (resumo)

**Passenger**

- **Trips:** criar, ver as próprias, cancelar as próprias em estados permitidos.
- **Drivers:** não gere entidades Driver de terceiros.
- **Financeiro:** ver estado de pagamento **da sua** viagem na UI, sem painel de reconciliação.
- **Sistema:** não.

**Driver**

- **Trips:** ver disponíveis (matching), aceitar, fluxo até `completed` / cancelamentos permitidos **nas suas** viagens.
- **Drivers:** apenas o **próprio** perfil operacional (online, localização).
- **Financeiro:** não comissões de outros; eventualmente **própria** comissão na UI se existir.
- **Sistema:** não.

**Partner (partner_admin)**

- **Trips:** ver viagens onde `driver` ∈ frota do tenant; não aceitar viagem “como motorista” nesta role (salvo regra explícita de dual-account).
- **Drivers:** CRUD / convite / desactivar **dentro do tenant**; não tocar em drivers de outro partner.
- **Financeiro:** métricas e relatórios **do tenant**; não alterar preços globais da plataforma.
- **Sistema:** não health global nem utilizadores admin.

**Admin**

- **Trips:** ver/intervir conforme política (suporte, disputas).
- **Drivers / users:** aprovar (BETA), bloquear, ver cross-tenant.
- **Financeiro / sistema:** conforme ferramentas existentes (Stripe, health, cron).
- **Override:** apenas com trilho de auditoria quando implementado.

---

### 3. Relações entre roles

- **Driver → Partner:** no **alvo**, cada driver operacional está associado a **exactamente um** `partner_id` (organização). Hoje: **a implementar** no modelo de dados.
- **Partner → Drivers:** gere apenas motoristas do seu tenant; não “possui” passageiros.
- **Admin:** sobrepõe-se para compliance, suporte e emergência; não deve usar rotinas diárias do partner.

---

### 4. Tabela de ações críticas

| Ação                            | Passenger             | Driver                    | Partner            | Admin                     |
| ------------------------------- | --------------------- | ------------------------- | ------------------ | ------------------------- |
| Criar trip (pedido)             | Sim                   | Não                       | Não                | Não (salvo teste interno) |
| Aceitar trip (execução)         | Não                   | Sim (ofertas elegíveis)   | Não                | Não                       |
| Ver trip própria / atribuída    | Sim (como passageiro) | Sim (como motorista)      | Não directamente\* | Sim                       |
| Ver trips da frota              | Não                   | Não                       | Sim (tenant)       | Sim (global)              |
| Gerir drivers (convite, estado) | Não                   | Não (só self operacional) | Sim (tenant)       | Sim                       |
| Aprovar utilizador BETA         | Não                   | Não                       | Não                | Sim                       |
| Overrides / debug sistema       | Não                   | Não                       | Não                | Sim (política)            |

\*Partner vê viagens **dos seus** motoristas, não “como passageiro”.

---

### 5. Fronteiras de segurança (nunca)

1. **Partner A** não lê nem altera dados cujo `partner_id` ≠ A (trips, drivers, métricas).
2. **Driver** não lista viagens “de frota” nem utilizadores de gestão.
3. **Passenger** não acede a endpoints de admin/partner por troca de token.
4. **Qualquer** query de listagem multi-registo para Partner **obriga** filtro de tenant no backend (não só no frontend).
5. **Admin** não deve ser confundido com “super partner”; acções administrativas devem ser **explicitamente** roteadas e logadas.

---

### Nota final (A002)

Este modelo é a base para RBAC e multi-tenant. **Implementação:** exige extensão do enum `Role`, entidade ou FK `partner`, e revisão de **todos** os routers que listam trips/drivers.

---

### Impacto no backend (obrigatório) — mapeamento para o repo

Referência passo-a-passo: [`../IMPLEMENTATION_SEQUENCE.md`](../IMPLEMENTATION_SEQUENCE.md). Abaixo: **o quê** tocar, não o código.

| Área                  | Acção                                                                                                                                                                                                           | Ficheiros / notas                                                                                                                                                                                                                                                |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Enum `Role`**       | Adicionar `partner`.                                                                                                                                                                                            | [`backend/app/models/enums.py`](../../../../backend/app/models/enums.py). Migrar Postgres: tipo `role_enum` (Alembic `ALTER TYPE ... ADD VALUE` ou recriação conforme política do projeto).                                                                      |
| **Sessão / contexto** | Estender `UserContext` com identificador de tenant (`partner_id` / `partner_org_id`).                                                                                                                           | [`backend/app/api/deps.py`](../../../../backend/app/api/deps.py) — hoje só `user_id` + `role` carregados do [`User`](../../../../backend/app/db/models/user.py) após JWT `sub`.                                                                                  |
| **JWT**               | Opcional: claim `partner_id` em `create_access_token` para a UI.                                                                                                                                                | [`backend/app/auth/security.py`](../../../../backend/app/auth/security.py); emissão em [`backend/app/api/routers/auth.py`](../../../../backend/app/api/routers/auth.py). **Validação:** continuar a derivar tenant da BD no `get_current_user`, não só do token. |
| **Guards**            | `require_role(Role.partner)` em routers dedicados.                                                                                                                                                              | [`backend/app/api/deps.py`](../../../../backend/app/api/deps.py) — `require_role` já aceita vários roles; evitar overload de `get_current_admin`.                                                                                                                |
| **Rotas existentes**  | **Não** alterar semântica de [`passenger_trips.py`](../../../../backend/app/api/routers/passenger_trips.py) / [`driver_trips.py`](../../../../backend/app/api/routers/driver_trips.py) para “fazer de partner”. | Novo router (ex. `/partner/...`) registado em [`backend/app/main.py`](../../../../backend/app/main.py).                                                                                                                                                          |
| **Signup BETA / OTP** | Restringir quem pode ficar com `role=partner` (criação por admin ou DEV).                                                                                                                                       | [`backend/app/api/routers/auth.py`](../../../../backend/app/api/routers/auth.py) (`requested_role` só `passenger`/`driver` até decisão explícita).                                                                                                               |

---

### Verificação cruzada com o código

- `backend/app/models/enums.py` — `Role` inclui só `passenger`, `driver`, `admin` (**sem** `partner`).

---

_Última revisão deste ficheiro: 2026-04-05_
