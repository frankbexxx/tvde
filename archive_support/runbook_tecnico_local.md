# RUNBOOK TÉCNICO — EXECUÇÃO LOCAL — ARQUIVADO

> **Arquivado em:** Substituído por [TESTE_STRIPE_COMPLETO.md](../TESTE_STRIPE_COMPLETO.md) e [BACKEND_STATUS.md](../BACKEND_STATUS.md).
> Consultar DOCS_INDEX.md para documentação atual.

---

## Objetivo (original)

Permitir que qualquer pessoa (dev ou parceiro técnico) consiga:
1. Arrancar o ambiente local
2. Testar o backend completo
3. Validar dados na base de dados
4. Reiniciar corretamente após alterações

## Conteúdo original

- CAMADA 1: Arranque (Docker, Postgres, Backend, .env)
- CAMADA 2: Teste funcional (OTP, Trip, DB, Audit)
- CAMADA 3: Troubleshooting (reinício, reset DB, erros comuns)

## Estado à data do arquivo

| Componente      | Estado  |
| --------------- | ------- |
| OTP             | ✅      |
| JWT             | ✅      |
| Trip Create     | ✅      |
| Audit Log       | ✅      |
| Admin Assign    | ✅      |
| WebSocket Admin | ✅      |
| Driver Flow     | Parcial |

**Nota:** Driver Flow e Stripe estão agora completos. Ver BACKEND_STATUS.md.
