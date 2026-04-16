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
