# Roteiro — Pacote 1 (Partner UX core)

**O que é isto:** «Super prompt» aqui = **pacote de execução em série** — **não** é uma única prompt.  
Ordem **recomendada no repo** (dependências técnicas + onboarding primeiro): **C017 → C013 → C014 → C015 → C016 → I009 → I010 → I011** (C017 = onboarding admin; C013–C014 = API controlo motorista; depois filtros/pesquisa; por fim detalhe e ações). Cada ID no seu `PROMPT_<ID>_*.md` quando existir. Este ficheiro agrega contexto, tabelas e texto de referência.

**Estado:** roteiro + referência (implementação prompt a prompt).  
**Stack:** monorepo `APP` — `web-app/`, `backend/` (FastAPI).  
**Alinhamento:** [`../REALITY_NOTES.md`](../REALITY_NOTES.md), [`../IMPLEMENTATION_SEQUENCE.md`](../IMPLEMENTATION_SEQUENCE.md).

---

## Ajuste ao roadmap (pré-execução)

- **C017 — Partner Onboarding UI (Admin)** é **obrigatório** e não pode voltar a faltar: criar frota e criar gestor **dentro da app** (sem Swagger, sem API externa).
- **Estado no código (última verificação):** existe UI Admin — separador «Frota» com fluxo `POST /admin/partners` e `POST /admin/partners/{id}/create-admin` (`web-app`). Confirmar em deploy antes de marcar C017 como concluído.

---

## Contexto

Backend já funcional.  
Foco: tornar **partner** utilizável sem ferramentas externas.

---

## Fase C — Controlo de frota

| ID       | Tema                          | Notas                                                                                                                                                 |
| -------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C013** | Driver Enable/Disable         | `PATCH /partner/drivers/{id}/status` — enable / disable driver                                                                                        |
| **C014** | Driver Force State            | Forçar online/offline sem alterar lógica core do backend (wrapper / endpoint dedicado)                                                                |
| **C015** | Filtering                     | Motoristas: online, offline, active. Viagens: ongoing, completed                                                                                      |
| **C016** | Search                        | Pesquisa por nome / telefone — **client-side simples**                                                                                                |
| **C017** | Partner Onboarding UI (Admin) | Botões **«Criar Frota»** e **«Criar Gestor»**; `POST /admin/partners`, `POST /admin/partners/{id}/create-admin`; **sem** Swagger, **sem** API externa |

**Verificação ao código (antes de implementar C013–C014):** no router `partner`, confirmar se os endpoints de status/force já existem; se não existirem, a implementação inclui **contrato + backend mínimo + UI**, alinhado a [`REALITY_NOTES.md`](../REALITY_NOTES.md).

---

## Fase I — UI detalhe

| ID       | Tema                                                      |
| -------- | --------------------------------------------------------- |
| **I009** | Driver Detail UI — dados completos, last location, status |
| **I010** | Trip Detail UI — detalhe completo, timestamps             |
| **I011** | Actions UI — reatribuir motorista (`POST /partner/trips/{id}/reassign-driver`). *Retirar atribuição* (unassign para `requested`) fica em backlog — implica visibilidade de viagens sem motorista na frota. |

---

## Regras

- Zero lógica de negócio no frontend além de apresentação e chamadas API.
- Tudo via API.
- UI simples e funcional.

---

## Output esperado

- UI funcional.
- Onboarding completo dentro da app (C017).
- Zero dependência de Swagger para estes fluxos.

---

## Texto base (referência rápida)

```text
🚀 SUPER PROMPT 1 — PARTNER UX REAL
CONTEXTO

Backend já funcional.
Foco: tornar partner utilizável sem ferramentas externas.

🔵 FASE C — CONTROLO DE FROTA
C013 — Driver Enable/Disable
endpoint: PATCH /partner/drivers/{id}/status
enable / disable driver
C014 — Driver Force State
forçar online/offline
sem alterar lógica backend core
C015 — Filtering
drivers:
online
offline
active
trips:
ongoing
completed
C016 — Search
search por nome / telefone
client-side simples
C017 — 🔥 Partner Onboarding UI (ADMIN)

Criar na app:

botão “Criar Frota”
botão “Criar Gestor”

Ligação:

POST /admin/partners
POST /admin/partners/{id}/create-admin

SEM swagger
SEM API externa

🎨 FASE I — UI DETALHE
I009 — Driver Detail UI
mostrar dados completos
last location
status
I010 — Trip Detail UI
detalhe completo
timestamps
I011 — Actions UI
assign driver
unassign driver
REGRAS
zero lógica de negócio no frontend
tudo via API
UI simples, funcional
OUTPUT
UI funcional
onboarding completo dentro da app
zero dependência de Swagger
```
