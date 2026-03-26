# Cursor + Git — worktrees e erro "worktree not found"

## Contexto do projecto

- **Uma única root** no dia-a-dia (ex.: `C:\dev\APP`) — não é obrigatório usar Git worktrees manualmente.
- O **Cursor** (multi-agent / funcionalidades em segundo plano) pode criar pastas de worktree em `C:\Users\<user>\.cursor\worktrees\...` sem ser óbvio no UI.

## Opção B — Limpar referências órfãs

No **repositório principal** (onde está `.git`):

```powershell
cd C:\dev\APP
git worktree list
git worktree prune -v
git worktree list
```

Ou, se existir o script no repo:

```powershell
.\scripts\git-prune-stale-worktrees.ps1
```

Isto remove entradas de worktrees cujo directório **já não existe** no disco.

## Política: um clone, branches, uma pasta no Cursor

1. Trabalhar em **branches** (`git switch -c feat/...`).
2. Abrir **só** a pasta do clone no Cursor.
3. Evitar multi-root (duas pastas do mesmo repo ao mesmo tempo).

## Se o "Apply" do Cursor falhar

Limitação conhecida (multi-agent + paths). Workaround: `git pull` / `git diff` / alterações manuais.

---

---

---

_Documento operacional._
