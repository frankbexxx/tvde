# PROMPT J009 — RUNNER AUTO DISCOVERY

**Estado:** pronta para execução.  
**Fase:** 9 — Delivery / tooling  
**Objetivo:** reduzir configuração manual do `tools/api_runner`.

---

## Regras

- Ferramenta DEV: não alterar backend core
- Objetivo é reduzir “inputs manuais” (driver_id/partner_id)

---

## Tarefas

- Atualizar `tools/api_runner/runner.py` para descobrir automaticamente:
  - `partner_id` (quando executa flow partner)
  - um `driver_user_id` candidato (quando há passo de assign e não há config)
- Usar endpoints existentes sempre que possível; se faltar, criar endpoints admin-only mínimos de listagem/descoberta.

