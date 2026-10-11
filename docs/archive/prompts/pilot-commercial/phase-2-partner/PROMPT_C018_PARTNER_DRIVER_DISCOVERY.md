# PROMPT C018 — PARTNER DRIVER DISCOVERY

**Estado:** pronta para execução.  
**Fase:** 2 — Partner (critical path)  
**Objetivo:** adicionar drivers à frota sem inputs manuais de IDs.

---

## Contexto

Partner UI já existe em `/partner`. Admin já consegue atribuir driver a frota via API.

Problema:
- Partner não consegue “descobrir” motoristas existentes e adicioná-los sem saber UUIDs

---

## Regras

- Nada de Swagger
- Nada de inputs manuais de `driver_user_id`/`partner_id` no fluxo partner
- Partner usa contexto da sessão (`partner_id`) automaticamente
- Zero lógica de negócio no frontend; só UX

---

## Tarefas

1) Em `/partner`, adicionar “Descobrir motoristas”:
- Pesquisa por `nome` e `telefone`
- Lista de resultados com botão **Adicionar à frota**

2) Backend mínimo (partner-scoped):
- Endpoint para pesquisar motoristas “disponíveis para adicionar” (definir critério simples, ex.: motoristas na frota default)
- Endpoint para “Adicionar à frota” que usa `ctx.partner_id` (sem pedir partner_id no body)

---

## Output

- Partner adiciona motorista à frota sem “pensar em IDs”.

