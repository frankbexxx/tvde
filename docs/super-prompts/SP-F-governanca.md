# SP-F — Governança (quem pode o quê)

## Intenção

**Nem todo o admin é igual**; ações críticas exigem **justificação** e ficam no trilho (SP-B).

## Critérios de aceite

- Matriz **ação × papel** (v1 pode distinguir só `super_admin` vs `admin` se for o mínimo viável).
- Campo **motivo** obrigatório em acções destrutivas ou de override (lista fechada ou texto livre mínimo N caracteres — decidir na implementação).

## Dependências

- **SP-B** estável.
- **SP-A** com conjunto de acções já conhecido.

## Exclusões

- SSO enterprise, 2FA obrigatório (salvo decisão explícita de prioridade).

## Estado (implementação v1)

- **Papel `super_admin`:** valor novo em `Role` + migração Alembic `role_enum`. Promover um utilizador na BD: `UPDATE users SET role = 'super_admin' WHERE id = '…';` (um ou poucos operadores).
- **Matriz (v1):** `admin` e `super_admin` acedem ao mesmo conjunto de rotas **excepto** `DELETE /admin/users/{id}` e `POST /admin/users/bulk-block`, reservados a **`super_admin`**. Corpo JSON com `governance_reason` (10–500 chars) obrigatório nesses dois endpoints; fica em `audit_events`.
- **Protecção de contas:** utilizadores com `role` `admin` ou `super_admin` não podem ser editados/bloqueados/eliminados pelos fluxos BETA de utilizador (detalhes `cannot_*_staff_role` na API).
- **WebSocket admin:** aceita token de `admin` ou `super_admin`.
- **Web:** prompts de motivo antes de eliminar / bloqueio em massa; mensagens para `super_admin_required` e afins.

**Próxima evolução (fora deste slice):** restringir mais acções a `super_admin`; motivo obrigatório em mais overrides (ex.: `recover_driver`); matriz documentada por endpoint.
