# Fluxo Git: comitar **tudo** o pendente + **um** PR

Convenção do projeto (para o agente e para humanos).

## Quando pedir “commita” / “commit”

1. **Não comitar só o último ficheiro.** Correr `git status` e incluir **todo** o trabalho em curso.
2. **`git add -A`** na raiz do repo (obedece ao `.gitignore`). Só fazer add selectivo se alguém disser explicitamente o que **excluir**.
3. **Não deixar metade das alterações por comitar** para “ir testar” — ou está tudo no branch, ou não está.
4. Se **`main` estiver protegido**: usar branch `feat/…` ou `fix/…`, **push**, e **um** PR para `main`.

## Comandos (bloco único)

Na raiz do repositório (`APP`):

```bash
git status
git add -A
git commit -m "tipo(âmbito): descrição curta"
git push -u origin NOME_DO_BRANCH
gh pr create --base main --head NOME_DO_BRANCH --title "…" --body "…"
```

Se o PR já existir:

```bash
git push origin NOME_DO_BRANCH
gh pr view NOME_DO_BRANCH --web
```

Na resposta ao pedido de commit: indicar o **link da PR** para merge e confirmar que `git status` está limpo.

## Excepção

Só omitir ficheiros do `git add` quando for pedido **explicitamente**.
