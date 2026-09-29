# Identidades de login — Fase I e II-A

**Estado:** Fase I **CLOSED** (2026-09-29). Fase II-A **CLOSED** (2026-09-29). Fase II-B **OPEN**.

Uma pessoa real corresponde a um `User` VAMULÁ. Telefone principal, `User.role` e a capacidade base de Passageiro ficam como estão. Emails e identidades Google passam a ter uma tabela própria. Nesta fase essa tabela é só um espelho.

## O que a Fase I fez

- Tabela `user_identities` (revisão Alembic `b3c4d5e6f7a8`).
- Backfill idempotente a partir de `users.email` e `users.oauth_google_sub`.
- A conta parcial `35ddb821` recebe apenas a identidade que já lhe pertence. Não foi ligada a `09c539d1`, nem fundida, bloqueada ou apagada.

## O que a autenticação ainda lê

O login, o onboarding Google e o linking **não** consultam `user_identities`.

Continuam a ler:

- `users.email`
- `users.oauth_google_sub`

`users.phone`, `users.password_hash`, `users.role` e `users.status` não mudam nesta fase.

A Fase II-A repete o backfill no deploy (revisão `c4d5e6f7a8b9`, sem mudança de schema) e espelha na mesma transacção cada escrita actual de `users.email` e `users.oauth_google_sub`. Se o mesmo User já tem uma linha `email` com esse endereço, essa linha passa a `google` em vez de nascer uma segunda. A autenticação continua a ler só `users`. `oauth_google_sub` continua a ser escrito e lido. Não há mudança de ecrã, de JWT, nem de onboarding. A Fase II-B é que passa a ler `user_identities`.

## Fora desta fase

| Fase | Âmbito | Estado |
|------|--------|--------|
| I | Tabela, constraints, índices, backfill, testes | **CLOSED** |
| II-A | Backfill repetido, dual-write, auth ainda lê `users` | **CLOSED** 2026-09-29 · revisão `c4d5e6f7a8b9` |
| II-B | Login, onboarding e linking passam a ler `user_identities` | **OPEN** |
| III | Transferir uma identidade para outro `User` (`UPDATE user_id` da mesma linha) | Por iniciar |
| IV | `BillingProfile` | Por iniciar |
| V | Documentos / KYC por domínio | Por iniciar |
| VI | Logout visível e revogação de sessão | Por iniciar |

`Person` / `Identity` como entidade separada fica fora do MVP.

## Regras da tabela

Providers desta fase: `email` e `google`.

- `google`: `provider_subject` obrigatório; `email` pode ser null.
- `email`: `email` obrigatório e normalizado (`lower` + `trim`); `provider_subject` null.
- Identidade com `revoked_at` não pode ter `is_primary = true`.

Unicidade:

- `lower(email)` quando `email IS NOT NULL`, incluindo linhas revogadas.
- `(provider, provider_subject)` quando `provider_subject IS NOT NULL`, incluindo linhas revogadas.
- no máximo uma primária activa por `user_id` (`is_primary` e `revoked_at IS NULL`).

Um email ou um `sub` revogado continua reservado a essa linha. Outro `User` não o reutiliza. Transferir a linha para outra conta é trabalho da Fase III e não está implementado.

## Backfill

| `users` actual | Linha criada |
|----------------|--------------|
| email + `oauth_google_sub` | uma linha `google`, primária, verificada |
| email sem sub | uma linha `email`, primária, verificada |
| só sub | uma linha `google`, email null, primária |
| sem email nem sub | nenhuma |

Não é criada uma segunda linha `email` para o mesmo endereço quando a linha Google já o traz. String vazia ou só espaços conta como ausência. O backfill aborta, sem insert parcial, se houver emails duplicados ignorando maiúsculas, `oauth_google_sub` duplicado, ou sub não-nulo mas vazio.

Downgrade: `DROP TABLE user_identities`. As colunas de `users` ficam.
