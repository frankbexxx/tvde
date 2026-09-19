# Diagrama — autenticação OTP (e login password)

Rotas: `backend/app/api/routers/auth.py` — `POST /auth/otp/request`, `POST /auth/otp/verify`; também `POST /auth/login` (telefone + palavra-passe; independente de `BETA_MODE`).

**SMS:** em `dev` o código pode ir para **consola** (`print`); produção real exige gateway SMS (fora deste diagrama).

**Roles:** o JWT usa sempre `user.role` da BD. `ADMIN_PHONE` **não** promove nem activa contas no login (L-AUTH-01).

## Pedido + verificação OTP

```mermaid
sequenceDiagram
  participant C as Cliente (web-app)
  participant A as FastAPI /auth
  participant DB as PostgreSQL

  C->>A: POST /auth/otp/request\n{ phone, requested_role? }
  A->>A: normalizar telefone;\ncapacidade / PT phone flags
  A->>A: gerar código;\nhash + expiração
  A->>DB: INSERT OtpCode
  A-->>C: { request_id, expires_at }

  Note over C,A: Em dev: código no log do servidor.

  C->>A: POST /auth/otp/verify\n{ phone, code, requested_role? }
  A->>DB: SELECT OtpCode válido
  A->>A: verificar hash;\nconsumir OTP
  alt novo utilizador
    A->>DB: INSERT User\n(passenger pending se REQUIRE_PENDING_APPROVAL;\nsenão passenger active)
  else user existente
    A->>A: role/status inalterados\n(sem ADMIN_PHONE side effect)
  end
  alt status pending ou blocked
    A-->>C: 403 pending_approval / blocked
  else active
    A->>A: create_access_token(role=user.role)
    A-->>C: JWT + user_id + role
  end
```

## Password login

```mermaid
sequenceDiagram
  participant C as Cliente
  participant A as FastAPI /auth
  participant DB as PostgreSQL

  C->>A: POST /auth/login\n{ phone, password }
  A->>DB: SELECT User by phone
  A->>A: verificar password;\nchecks pending/blocked
  Note over A: Sem mutação de role.\nJWT = role persistida na BD.
  A-->>C: JWT (mesmo formato que OTP)
```

## Parceiro

Não há signup público para `Role.partner` — gestores de frota são criados por **admin** (`POST /admin/partners/.../create-admin`). Ver [06_ROLES_AND_ROUTES.md](06_ROLES_AND_ROUTES.md).

Índice: [README.md](README.md)
