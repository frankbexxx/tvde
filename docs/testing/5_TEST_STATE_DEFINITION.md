# TVDE — Definição do Estado do Sistema

Este documento define o **estado exato do sistema** antes dos testes começarem.

Os testes não devem começar a menos que o sistema corresponda a estas condições.

**PROJECT_ROOT** — O diretório raiz do projeto. Ver `TEST_ENVIRONMENT_SETUP.md` para definição.

---

## Estado da Base de Dados

- **Viagens ativas:** Nenhuma viagem em estado requested, assigned, accepted, arriving ou ongoing.
- **Viagens concluídas:** Podem existir (histórico).
- **Pagamentos:** Podem existir para viagens concluídas.

---

## Contas de Motorista

- **Pelo menos um motorista** deve existir na base de dados.
- **Estado do motorista:** `approved`
- **Disponibilidade:** `is_available = true`

---

## Contas de Passageiro

- **Pelo menos um passageiro** deve existir na base de dados.
- O passageiro deve conseguir fazer login com telemóvel e password.

---

## Modo BETA

Se `BETA_MODE=true`:

- O testador deve fazer login com:
  - **Telemóvel:** +351XXXXXXXXX (número de teste)
  - **Password:** 123456 (DEFAULT_PASSWORD)

Se `BETA_MODE=false` e `ENV=dev`:

- A app usa tokens de desenvolvimento (Seed).
- Não é necessário login. O testador vê o dashboard diretamente após "A carregar...".

---

## Como Obter o Estado Correto

### Opção A — Reset + Seed (modo dev)

1. A partir de PROJECT_ROOT, executa `.\scripts\2_reset_db.ps1` para limpar viagens e pagamentos.
2. Cria utilizadores via `POST /dev/seed` ou `POST /dev/seed-simulator` (via API ou simulador).

### Opção B — Utilizadores BETA existentes

Se já tens utilizadores aprovados com telemóvel e password conhecidos, usa esses para login.

---

## Verificação Pré-Teste

Antes de executar qualquer teste, o testador **deve** completar:

```
docs/testing/PRE_TEST_VERIFICATION.md
```

Essa verificação confirma:

1. Backend responde e API Docs visível
2. Frontend responde e app carrega
3. Comunicação frontend ↔ backend funciona
4. Estado do sistema cumpre os requisitos acima (motoristas, passageiros, sem viagens bloqueantes)

**Sem verificação aprovada, os testes não são válidos.**
