# Teste BETA — Modo Operacional

Modo BETA para testes presenciais com 15–20 utilizadores reais, apenas telemóveis.

---

## Configuração (.env)

```env
BETA_MODE=true
ADMIN_PHONE=+351924075365
MAX_BETA_USERS=30
DEFAULT_PASSWORD=123456
```

---

## Fluxo no Café

1. **Enviar link** da app aos participantes
2. **Registo:** utilizadores entram com telemóvel (+351XXXXXXXXX) e password 123456
3. **Pending:** novos utilizadores ficam `status=pending` até aprovação
4. **Admin aprova:** organizador (ADMIN_PHONE) entra e aprova na aba Admin
5. **Utilizadores entram:** após aprovação, podem fazer login
6. **Passageiros** pedem viagens
7. **Motoristas** aceitam viagens

---

## Checklist de Testes

| # | Teste | Como verificar |
|---|-------|----------------|
| 1 | Admin login automático | Entrar com ADMIN_PHONE → role=admin, sem aprovação |
| 2 | Registo pending | Novo número → status=pending, erro "pending_approval" ao fazer login |
| 3 | Aprovação admin | Admin → Pending Users → Aprovar → user fica active |
| 4 | Driver promotion | Aprovar user com requested_role=driver → driver_profile criado |
| 5 | Limite 30 users | Criar 30º user → próximo regista → erro "BETA cheio" |
| 6 | Regex telefone | +351912345678 ✓ / +351123 ✗ / +449123456789 ✗ |

---

## Endpoints

| Método | Path | Descrição |
|--------|------|-----------|
| GET | /config | `{ beta_mode: bool }` — frontend detecta modo |
| POST | /auth/login | BETA: phone + password + requested_role |
| GET | /admin/pending-users | Lista users com status=pending |
| POST | /admin/approve-user | Body: `{ phone }` — aprova e cria driver se pedido |

---

## Regras

- **Telemóvel:** apenas `+351` + 9 dígitos
- **Password:** 123456 (pré-preenchida)
- **Rate limit:** 5 request_trip/min (mantido)
- **Motorista = passageiro:** pode pedir viagens e aceitar viagens
- **Nenhuma alteração** em Trip, Stripe, pagamentos
