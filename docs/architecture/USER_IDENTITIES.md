# Identidades de login — Fase I, II e III

**Estado:** Fase I **CLOSED** (2026-09-29). Fase II-A **CLOSED** (2026-09-29). Fase II-B **CLOSED** (2026-09-29). Smoke prod **S-ID-01 CLOSED** (2026-09-29). Fase III **CLOSED** (2026-09-30): transferência PROD **PASS** e smoke Google humano **PASS**. Fase II-C: listagem visual PROD **PASS**; escrita PROD por fazer; **OPEN**. Fase VI **OPEN**.

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

A Fase II-A (revisão `c4d5e6f7a8b9`) sincronizou o espelho antes deste corte. Não há migration nova na II-B. A gestão de identities no perfil é a II-C, ainda **OPEN** até ao smoke prod. A identity Google de `35ddb821` foi movida para `09c539d1` na Fase III: a mesma linha, não-primária. A origem ficou `blocked` e sem email. `09c539d1` continua `super_admin` e `active`, com a primary original.

O primeiro write desta fase em produção torna o rollback para o código legacy não equivalente.

## Smoke PROD S-ID-01

**CLOSED** em 2026-09-29.

- Google desconhecido `vamula.qa@gmail.com` mostrou criar conta ou ligar uma conta existente. Não criou `User` nem identity.
- A ligação foi para a fixture de QA `dev_admin` (`2481222c-50f6-403f-aa59-8d386f1cd00a`, admin, active). A password dessa fixture foi definida para o smoke e o `token_version` subiu. Os restantes campos ficaram intactos. Não nasceu outro `User` e não houve delete.
- O login seguinte com `vamula.qa@gmail.com` entrou na mesma conta, sem ecrã de escolha. Os contextos Passageiro e Admin funcionaram.
- `vamula.qa@gmail.com` fica como Google QA de teste, ligado a `dev_admin`.
- Neste smoke, `35ddb821` e `09c539d1` continuavam intactas. A transferência foi feita depois, na Fase III.
- `users.oauth_google_sub` continua deprecated e fora da auth.

No contexto Admin em produção não aparece o botão Sair. O logout fez-se ao mudar para Passageiro. Isto não reabre a Fase II-B. Logout e sessões são a Fase VI.

## Fase III — transferência de uma identity

**CLOSED** em 2026-09-30. Transferência PROD **PASS**. Smoke Google humano **PASS**. II-C e Fase VI continuam **OPEN**.

PR #680 está em produção. `POST /admin/identities/transfer` devolveu HTTP 200 uma vez. A identity `bf19df73-aa66-409e-ae41-53b5715a2bb7` passou de `35ddb821-cfe7-4a4d-bbb1-1fc899f8f1d9` para `09c539d1-fd0a-4c02-813a-771c4df454b3`. O `identity_id` manteve-se. A linha ficou activa e não-primária. O destino continua `super_admin` e `active`, com 2 identities activas; a primary original manteve-se e `users.email` do destino não mudou. A origem continua a existir, ficou `blocked`, sem identities activas e com `users.email` a `NULL`. Continuam 20 Users. Nenhum User foi apagado. Viagens, pagamentos, aceitações legais e logs mantiveram o dono. `oauth_google_sub` não foi lido nem escrito. A auditoria registou `identity_transferred` e `source_account_blocked`, sem email, telefone nem subject. `frankbex.dev@gmail.com` entrou na APK directamente em Passageiro, sem onboarding, sem linking e sem User ou identity novos.

`transfer_identity` move a mesma linha de `user_identities` para outro User. Não duplica, não apaga Users e não move histórico. A identity transferida fica não-primária. A primary do destino mantém-se. Se a linha movida era a primary da origem, `users.email` da origem fica `NULL`. O email do destino não muda. A origem fica `blocked` na mesma transacção, para não voltar à fila de pending. Push tokens activos da origem, se existirem, ficam inactivos e continuam nesse User.

`users.oauth_google_sub` não é lido nem escrito. Depois de uma transferência pode ficar historicamente incoerente na origem. A auth continua a ignorá-lo.

A acção é `POST /admin/identities/transfer`, só `super_admin`, com `confirmation = TRANSFERIR_IDENTITY` e motivo. O serviço não tem UUIDs de produção. Recusa origem e destino iguais, identity de outro User, identity revogada, destino inactivo, destino sem primary activa, 5 identities activas, email ou subject noutra linha, origem staff, ou actor que não seja super_admin activo.

Rollback antes do commit desfaz a transacção. Depois de um commit, a operação inversa é manual e só se for mesmo preciso: a mesma linha volta à origem com `is_primary = true`, `users.email` da origem volta ao email dessa identity, e o status da origem volta ao valor anterior (`pending` neste caso). Não mexer em `oauth_google_sub`. Tokens desactivados não se reactivam sozinhos. Não executar esta inversa sem necessidade.

## Fase II-C — gestão no perfil

Implementação pronta no painel Conta, secção «Métodos de início de sessão». Não há migration. Os testes automatizados passam. A listagem visual em produção, na fixture `dev_admin`, passou: uma identity Google primary e verificada. A escrita em produção ainda não foi feita, por isso a fase continua **OPEN**. A Fase VI continua **OPEN**.

O botão Revogar não aparece na identity principal nem quando só há uma identity activa. Nesses casos o painel explica que é preciso outro método, ou que é preciso torná-lo principal primeiro. O backend continua a recusar as duas operações.

Sem password, o painel só oferece «Definir palavra-passe». Google não serve de step-up. Definir password usa `POST /auth/me/password`, que já incrementa `token_version`; a sessão actual deixa de valer. Mudar a primary, revogar e adicionar Google não alteram `token_version`, não terminam sessão e não mexem no logout.

Com password, o pedido leva a password. Staff não pode substituí-la pela prova. Uma password errada responde 403, para o access token continuar válido. A prova de `POST /auth/reauth` vale 10 minutos, fica ligada ao `iat` desse access token e não fica em `localStorage`.

`GET /auth/identities` lista só identities activas: provider, email, primary, verified, `created_at`. Não devolve subject. `POST /auth/identities/{id}/make-primary` troca a primary e espelha `users.email`, ou deixa esse email `NULL` se a nova primary não tiver email. `POST /auth/identities/{id}/revoke` recusa a última identity e a primary actual; a linha fica, com `revoked_at`. `POST /auth/identities/google` valida o `id_token` nativo ou o `code` web e reutiliza `attach_google_identity`. Não cria User, não muda role nem telefone, e não torna a nova linha primary se já existir uma. O redirect web não chama o login nem o onboarding.

Auditoria: `identity_primary_changed`, `identity_revoked`, `identity_google_added`. Sem email, telefone, subject, token ou password.

## Fora desta fase

| Fase | Âmbito | Estado |
|------|--------|--------|
| I | Tabela, constraints, índices, backfill, testes | **CLOSED** |
| II-A | Backfill repetido, dual-write, auth ainda lê `users` | **CLOSED** 2026-09-29 · revisão `c4d5e6f7a8b9` |
| II-B | Login, onboarding e linking lêem `user_identities`. Sem auto-link. Escolha criar/ligar. Prova curta | **CLOSED** 2026-09-29 · sem migration |
| II-C | Listar, mudar primary, revogar e adicionar Google no painel Conta | Listagem visual PROD **PASS** · escrita PROD por fazer · **OPEN** |
| III | Mover a mesma linha de identity e bloquear a origem | **CLOSED** 2026-09-30 · transferência PROD **PASS** · smoke Google humano **PASS** · PR #680 |
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

Um email ou um `sub` revogado continua reservado a essa linha. Outro `User` não o reutiliza. Mover a mesma linha para outra conta é a Fase III, **CLOSED** em 2026-09-30: muda `user_id` e deixa de ser primária.

## Backfill

| `users` actual | Linha criada |
|----------------|--------------|
| email + `oauth_google_sub` | uma linha `google`, primária, verificada |
| email sem sub | uma linha `email`, primária, verificada |
| só sub | uma linha `google`, email null, primária |
| sem email nem sub | nenhuma |

Não é criada uma segunda linha `email` para o mesmo endereço quando a linha Google já o traz. String vazia ou só espaços conta como ausência. O backfill aborta, sem insert parcial, se houver emails duplicados ignorando maiúsculas, `oauth_google_sub` duplicado, ou sub não-nulo mas vazio.

Downgrade: `DROP TABLE user_identities`. As colunas de `users` ficam.
