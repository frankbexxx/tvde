# Roteiro — Pacote 3 (Pilot ready)

**O que é isto:** pacote de execução em série — **não** é uma prompt única.  
Ordem: **H009 → H010 → J009 → J010 → K008 → K009** (cada ID no respetivo `PROMPT_<ID>_*.md` nas fases 7 / 9 / 10).

**Estado:** roteiro + referência.  
**Stack:** backend ops/reporting, runner/scripts, `web-app` onde aplicável.  
**Alinhamento:** [`../REALITY_NOTES.md`](../REALITY_NOTES.md).

---

## Contexto

Preparar **piloto real**: operação, automação e visão mínima de negócio.

---

## Fase H — Operação

| ID       | Tema                                                                          |
| -------- | ----------------------------------------------------------------------------- |
| **H009** | Weekly Report — viagens por semana, agregação simples                         |
| **H010** | Alerts — zero motoristas online, zero viagens; resposta simples (log ou flag) |

---

## Fase J — Runner

| ID       | Tema                                                                                  |
| -------- | ------------------------------------------------------------------------------------- |
| **J009** | Auto Discovery — obter motoristas automaticamente; obter `partner_id` automaticamente |
| **J010** | Non-Interactive Mode — eliminar OTP manual em modo dev; fluxo automático              |

---

## Fase K — Negócio

| ID       | Tema                                                            |
| -------- | --------------------------------------------------------------- |
| **K008** | Usage Summary — visão simples: viagens, motoristas, atividade   |
| **K009** | Billing Stub — estrutura futura, **sem** lógica financeira real |

---

## Output esperado

- Sistema testável sem esforço manual excessivo.
- Métricas mínimas de negócio.
- Preparado para piloto.

---

## Texto base (referência rápida)

```text
🚀 SUPER PROMPT 3 — PILOT READY
🧪 FASE H — OPERAÇÃO
H009 — Weekly Report
trips por semana
agregação simples
H010 — Alerts
zero drivers online
zero trips
resposta simples (log ou flag)
🚀 FASE J — RUNNER
J009 — Auto Discovery
obter drivers automaticamente
obter partner_id automaticamente
J010 — Non-Interactive Mode
eliminar OTP manual (modo dev)
flow automático
💰 FASE K — NEGÓCIO
K008 — Usage Summary
visão simples:
trips
drivers
activity
K009 — Billing Stub
estrutura futura
sem lógica financeira real
OUTPUT
sistema testável sem esforço manual
métricas mínimas de negócio
preparado para piloto
```
