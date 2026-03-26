# Worktree de desenvolvimento (CSW)

Este clone activo:

`C:\Users\frank\.cursor\worktrees\APP\csw`

- Branch habitual: `feat/a021-visual-system` (ou a branch em curso).
- O repositório principal Git está em `C:\dev\APP\.git`; os outros caminhos em `git worktree list` são worktrees antigos — **não é obrigatório apagá-los**, mas abre **só esta pasta** no Cursor/VS Code para evitar confusão e erros de sincronização.

## `.cursorignore`

Manter **igual** ao do `csw` se copiares ficheiros entre worktrees. Evitar o padrão `*secrets*` isolado (faz match a `DEPLOY_SECRETS.md` e pode quebrar operações do Cursor).

## VS Code

Se usares extensões que alteram ficheiros do projecto, confirma que o **directório aberto** é `...\csw` e não `C:\dev\APP`, para não misturar estado.
