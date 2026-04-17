# SP-E — Mutabilidade com memória (RGPD + realidade)

## Intenção

Alterar dados identificáveis (nome, telefone, …) **sem apagar** o passado auditável quando a política o exigir.

## Critérios de aceite

- Histórico de revisões (tabela dedicada ou revisões em `audit_events` com before/after completos).
- **Sem** hard-delete de factos financeiros.
- Estados **reversíveis** apenas onde a lei/negócio o permitir (explicitar no desenho).

## Exclusões

- Motor automático completo de “direito ao esquecimento” (projeto legal + produto).

## Estado (implementação parcial)

- **Persistência:** `audit_events` com `event_type` `admin.*`; revisões de utilizador em `admin.user_patch` com `payload.before` / `payload.after` alinhados (nome, telefone, status); `admin.user_block` / `admin.user_unblock` com `before_status` / `after_status`; `admin.user_password_clear` com `had_password` (sem expor segredo).
- **Leitura:** `GET /admin/audit-trail?entity_type=user&entity_id=<uuid>` (SP-B).
- **Web (admin):** na tab **Utilizadores**, bloco expansível **Trilho admin (identidade)** por cartão de utilizador não-admin, que lista os eventos filtrados por esse `entity_id`.
