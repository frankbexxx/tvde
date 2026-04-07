# PROMPT H010 — ALERTS (MÍNIMO)

**Estado:** pronta para execução.  
**Fase:** 7 — Pilot ops  
**Objetivo:** alertas operacionais mínimos dentro da app.

---

## Regras

- Alertas simples (flag/texto) — sem engine complexa

---

## Tarefas

- Definir 2 alertas:
  - **zero drivers ativos**
  - **zero viagens** (ex.: hoje)
- Implementar via endpoint admin-only ou computar no frontend com dados existentes (preferir backend se já houver query pronta).
- Mostrar no `AdminDashboard`.

