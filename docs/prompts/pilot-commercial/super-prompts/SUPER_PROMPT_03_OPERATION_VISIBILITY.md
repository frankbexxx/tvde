# Roteiro — Pacote 3 (Operação + visibilidade) — **executar antes de SP4**

**O que é isto:** pacote de execução em série — **não** é uma prompt única.  
Este pacote resolve “não consigo operar sem saber IDs”.

**Ordem interna (obrigatória):** **I012 → C018 → H009 → H010 → J009 → K008**

---

## Contexto

O sistema já funciona (partner + admin + driver).

Problema atual:
- Não é possível operar facilmente
- IDs não são visíveis
- O utilizador não consegue agir sem “saber coisas”

Objetivo:
- Tornar o sistema **operacional dentro da app**

---

## Itens (prompts granulares)

### I012 — Admin Data Visibility Layer (prioridade máxima)

No `AdminDashboard`, criar uma secção clara com:

- **USERS (todos)**: `name`, `phone`, `role`, `user_id` (UUID)
- **PARTNERS**: `name`, `partner_id` (UUID)
- **DRIVERS**: `user_id`, `partner_id` (se existir), `status`

**UX obrigatória**
- Cada ID tem botão **Copiar**
- Layout simples (lista/cards)
- Zero lógica complexa

---

### C018 — Partner Driver Discovery

Dentro de `/partner`:

- Procurar drivers existentes (search por `telefone` e `nome`)
- Botão direto **Adicionar à frota** sem pedir:
  - `driver_user_id` manual
  - `partner_id` manual

---

### H009 — Weekly Report (simples)

- Trips por semana (agregação simples, sem gráficos complexos)

---

### H010 — Alerts (mínimo)

- Alertas quando:
  - zero drivers ativos
  - zero viagens
- Pode ser flag ou texto simples

---

### J009 — Runner (mínimo útil): Auto discovery

No runner DEV:
- Detetar automaticamente `partner_id`
- Detetar automaticamente drivers disponíveis

---

### K008 — Usage Summary (mínimo)

Visão simples:
- trips
- drivers
- atividade

---

## Regras

- Nada de Swagger
- Nada de inputs manuais de IDs (após este pacote)
- Tudo visível na UI

---

## Output

- Sistema operável sem conhecimento técnico
- Dados visíveis e copiáveis
- Ações simples, diretas

---

## Validação (tu — sem código)

Após merge + redeploy:

- Consigo ver todos os IDs? ✔
- Consigo copiar? ✔
- Consigo adicionar driver sem pensar? ✔

Se tiveres de “pensar” → falhou.

