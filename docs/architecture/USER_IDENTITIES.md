# Identidades de login — Fase I, II-A e II-B

**Estado:** Fase I **CLOSED** (2026-09-29). Fase II-A **CLOSED** (2026-09-29). Fase II-B **CLOSED** (2026-09-29). Smoke prod **S-ID-01 CLOSED** (2026-09-29). Fase II-C **OPEN**. Fase III **OPEN**. Fase VI **OPEN**.

Uma pessoa real corresponde a um `User` VAMULÁ. Telefone principal, `User.role` e a capacidade base de Passageiro ficam como estão. Emails e identidades Google vivem em `user_identities`. A autenticação Google lê essa tabela.

## O que a Fase I fez

- Tabela `user_identities` (revisão Alembic `b3c4d5e6f7a8`).
- Backfill idempotente a partir de `users.email` e `users.oauth_google_sub`.
- A conta parcial `35ddb821` recebe apenas a identidade que já lhe pertence. Não foi ligada a `09c539d1`, nem fundida, bloqueada ou apagada.

## O que a autenticação lê

Depois de validar o token Google, o login procura `user_identities` por `provider = google` e `provider_subject = sub`.

- Identity activa: o JWT é o de sempre (`sub` = `user_id`, `role`, `token_version`). Não leva `identity_id`.
- Conta bloqueada: `403 blocked`. Onboarding Google pendente: `google_onboarding_required`. Outro pending: `pending_approval`.
- Identity revogada: `identity_revoked`. Não é tratada como Google desconhecido e não cria `User`.
- Sem identity: `google_account_choice_required`. Não cria `User`. O ecrã oferece criar conta ou ligar uma conta existente com telefone e palavra-passe.

Não há auto-link por email, para nenhum papel. Admin e super_admin confirmam a palavra-passe actual no próprio pedido. `POST /auth/reauth` emite uma prova curta (`purpose = strong_auth`, cerca de 10 minutos, ligada ao `iat` do access token). Essa prova não serve de access token e não fica em `localStorage`.

Criar conta só acontece no fim do onboarding: `User` com telefone real, nome, termos e uma identity Google primária. Ligar uma conta promove, no mesmo `identity_id`, a linha `email` do mesmo User quando o email verificado coincide. Email de outro User, linha revogada ou `sub` de outra identity recusam a ligação. O máximo é 5 identities activas (`revoked_at IS NULL`).

`users.oauth_google_sub` fica deprecated, nullable e histórico. A auth não o lê nem escreve. A coluna não foi removida. `users.email` continua a espelhar o email da identity primária activa. `users.phone` e `users.password_hash` não mudam por este corte.

A Fase II-A (revisão `c4d5e6f7a8b9`) sincronizou o espelho antes deste corte. Não há migration nova na II-B. A gestão de identities no perfil fica para a II-C. A conta `35ddb821` não foi transferida: o `sub` dela continua na identity dessa conta. `09c539d1` continua intacta. Transferir a linha é a Fase III.

O primeiro write desta fase em produção torna o rollback para o código legacy não equivalente.

## Smoke PROD S-ID-01

**CLOSED** em 2026-09-29.

- Google desconhecido `vamula.qa@gmail.com` mostrou criar conta ou ligar uma conta existente. Não criou `User` nem identity.
- A ligação foi para a fixture de QA `dev_admin` (`2481222c-50f6-403f-aa59-8d386f1cd00a`, admin, active). A password dessa fixture foi definida para o smoke e o `token_version` subiu. Os restantes campos ficaram intactos. Não nasceu outro `User` e não houve delete.
- O login seguinte com `vamula.qa@gmail.com` entrou na mesma conta, sem ecrã de escolha. Os contextos Passageiro e Admin funcionaram.
- `vamula.qa@gmail.com` fica como Google QA de teste, ligado a `dev_admin`.
- `35ddb821` e `09c539d1` continuam intactas. `35ddb821` não foi transferida.
- `users.oauth_google_sub` continua deprecated e fora da auth.

No contexto Admin em produção não aparece o botão Sair. O logout fez-se ao mudar para Passageiro. Isto não reabre a Fase II-B. Logout e sessões são a Fase VI.

## Fora desta fase

| Fase | Âmbito | Estado |
|------|--------|--------|
| I | Tabela, constraints, índices, backfill, testes | **CLOSED** |
| II-A | Backfill repetido, dual-write, auth ainda lê `users` | **CLOSED** 2026-09-29 · revisão `c4d5e6f7a8b9` |
| II-B | Login, onboarding e linking lêem `user_identities`. Sem auto-link. Escolha criar/ligar. Prova curta | **CLOSED** 2026-09-29 · sem migration |
| II-C | Gestão de identities na área de perfil | **OPEN** |
| III | Transferir uma identidade para outro `User` (`UPDATE user_id` da mesma linha). `35ddb821` não foi transferida | **OPEN** |
| IV | `BillingProfile` | Por iniciar |
| V | Documentos / KYC por domínio | Por iniciar |
| VI | Logout visível e revogação de sessão. Em prod o Admin não mostra Sair; não reabre a II-B | **OPEN** |

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
