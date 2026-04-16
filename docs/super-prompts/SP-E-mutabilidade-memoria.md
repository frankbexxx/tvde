# SP-E — Mutabilidade com memória (RGPD + realidade)

## Intenção

Alterar dados identificáveis (nome, telefone, …) **sem apagar** o passado auditável quando a política o exigir.

## Critérios de aceite

- Histórico de revisões (tabela dedicada ou revisões em `audit_events` com before/after completos).
- **Sem** hard-delete de factos financeiros.
- Estados **reversíveis** apenas onde a lei/negócio o permitir (explicitar no desenho).

## Exclusões

- Motor automático completo de “direito ao esquecimento” (projeto legal + produto).
