# Roteiro — Pacote 2 (Consistência / hardening)

**O que é isto:** pacote de execução em série — **não** substitui prompts individuais.  
Ordem: **G008 → G009 → G010** (ficheiros `PROMPT_G008_*.md` … quando existirem em `phase-6-multitenant-rbac/` ou pasta acordada).

**Estado:** roteiro + referência.  
**Stack:** `backend/` + auth + logging; impacto transversal.  
**Alinhamento:** [`../REALITY_NOTES.md`](../REALITY_NOTES.md).

---

## Ajuste ao roadmap (pré-execução)

- **G008 — Token consistency** foi **reclassificado**: de «hardening» genérico para **prioridade máxima** — **bloqueador de consistência** (comportamento determinístico em todo o sistema).

---

## Contexto

Sistema funcional mas não totalmente determinístico.

Objetivo: comportamento **único** e **previsível**.

---

## Itens

| ID       | Tema                              | Detalhe                                                                                                                                                                                                                                           |
| -------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **G008** | Token consistency (**mandatory**) | Identificar **todos** os caminhos de login; unificar emissão de token. **Regra:** o role vem **sempre** da BD — nunca de input, nunca de lógica condicional espúria. Eliminar: hacks de `requested_role`, overrides `ADMIN_PHONE` inconsistentes. |
| **G009** | Request ID → logs                 | Propagar `request_id` para `log_event`; cada pedido rastreável.                                                                                                                                                                                   |
| **G010** | Tenant guardrails                 | Impedir queries sem `partner_id` em contextos partner; validação mínima em dev.                                                                                                                                                                   |

---

## Regras

- Não alterar comportamento **visível** para o utilizador final, exceto onde corrigir **inconsistências** (login/roles).
- Zero duplicação desnecessária; simplicidade máxima.

---

## Output esperado

- Login consistente.
- Comportamento determinístico.
- Logs rastreáveis por pedido.

---

## Texto base (referência rápida)

```text
🚀 SUPER PROMPT 2 — CONSISTÊNCIA ABSOLUTA
CONTEXTO

Sistema funcional mas não totalmente determinístico.

Objetivo:
→ comportamento único, previsível

🔴 G008 — TOKEN CONSISTENCY (MANDATORY)
identificar TODOS os caminhos de login
unificar emissão de token

Regra:

role vem SEMPRE da BD
nunca de input
nunca de lógica condicional

Eliminar:

requested_role hacks
ADMIN_PHONE overrides inconsistentes
G009 — Request ID → Logs
propagar request_id para log_event
cada request rastreável
G010 — Tenant Guardrails
impedir queries sem partner_id em contextos partner
validação mínima em dev
REGRAS
não alterar comportamento visível (exceto inconsistências)
zero duplicação
simplicidade máxima
OUTPUT
login consistente
comportamento determinístico
logs rastreáveis
```
