# PROMPT I012 — ADMIN DATA VISIBILITY LAYER

**Estado:** pronta para execução.  
**Fase:** 5 — Admin (operação)  
**Objetivo:** tornar o sistema operável na UI (IDs visíveis e copiáveis).

---

## Contexto

Admin já tem painel (`AdminDashboard`) e endpoints admin (`/admin/*`).

Problema atual:
- IDs não são visíveis na UI
- Para operar (atribuir motoristas, criar frotas, debug) é preciso “saber UUIDs”

---

## Regras (crítico)

- Nada de Swagger para operar
- Zero lógica complexa
- UI simples (listas/cards)
- Cada ID tem botão **Copiar**
- Só via API; não inventar dados no frontend

---

## Tarefas

No `AdminDashboard`, criar uma secção clara (tab “Dados” ou equivalente) com 3 blocos:

1) **USERS (todos)**
- Mostrar `name`, `phone`, `role`, `user_id`

2) **PARTNERS**
- Mostrar `name`, `partner_id`

3) **DRIVERS**
- Mostrar `user_id`, `partner_id`, `status`

Se faltar API, criar endpoints admin-only mínimos:
- `GET /admin/partners`
- `GET /admin/drivers`

---

## Output

- Admin consegue ver e copiar todos os IDs relevantes sem recorrer a tooling externo.

