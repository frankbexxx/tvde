# Supervisão obrigatória — Frank

**Regra operacional:** toda alteração e operação git requer confirmação explícita do Frank antes de executar.

## Proibido sem confirmação explícita prévia

- Alterar código, configs, docs
- `git add`, `git commit`, `git push`, `git branch`, merge, rebase
- Abrir/fechar PR, apagar branches, qualquer operação remota
- Executar deploy ou comandos destrutivos

## Fluxo obrigatório

1. Explicar **exactamente** o que se propõe fazer (comandos incluídos).
2. **Parar** e aguardar «sim» / «faz» / «ok» do Frank.
3. Só então executar **só** o que foi aprovado — nada extra.

## Git

- Push **sempre** pede confirmação, mesmo de 1 ficheiro.
- Se push a `main` falhar (branch protection): reportar erro **uma vez** e **parar**. Não criar branch nem PR salvo pedido explícito.

## Excepção

- Modo **READ-ONLY** explícito: só ler/pesquisar/responder, zero writes.

**Cópia local (gitignored):** `.cursor/rules/supervision-required.mdc`
