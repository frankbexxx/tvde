# Manual Git + GitHub — TVDE

Fluxo único para o repositório **https://github.com/frankbexxx/tvde** (backend, web-app, docs). A **ordem dos passos importa**.

---

## Antes de começares (uma vez por máquina)

### 1. Ferramentas

- **Git** instalado (`git --version`).
- Conta **GitHub** com acesso ao repositório `frankbexxx/tvde`.
- Autenticação ao GitHub: **HTTPS** (credencial manager / token) ou **SSH** (chave pública na conta GitHub).

### 2. Clonar (se ainda não tens a pasta do projeto)

**No GitHub:** abre o repositório → botão verde **Code** → copia URL (HTTPS ou SSH).

**No terminal:**

```powershell
cd c:\dev
git clone https://github.com/frankbexxx/tvde.git APP
cd APP
```

_(Ajusta pasta/nome se já usares `c:\dev\APP`.)_

### 3. Identidade Git (commits com o teu nome)

```powershell
git config user.name "O Teu Nome"
git config user.email "teu-email@exemplo.com"
```

_(Opcional global: `git config --global ...`)_

### 4. Ramo padrão

O projeto usa **`main`** como ramo principal. Confirma:

```powershell
git branch
# deve mostrar * main
```

**No GitHub:** em **Settings → General**, o default branch deve ser **`main`**:  
https://github.com/frankbexxx/tvde/settings

---

## Antes de cada sessão de trabalho

Faz isto **sempre** que fores codar (abrir o projeto de manhã, mudar de máquina, etc.).

| Passo | Onde     | O quê                                                                          |
| ----- | -------- | ------------------------------------------------------------------------------ |
| 1     | Terminal | `cd` para a pasta do repo (ex. `c:\dev\APP`).                                  |
| 2     | Terminal | `git fetch origin` — atualiza referências do GitHub **sem** alterar ficheiros. |
| 3     | Terminal | `git checkout main`                                                            |
| 4     | Terminal | `git pull origin main` — **iguala o teu `main` ao GitHub.**                    |
| 5     | Terminal | `git status` — deve dizer _up to date with 'origin/main'_ (ou só untracked).   |

**Verificação rápida:**

```powershell
git rev-parse main origin/main
```

Os dois hashes devem ser **iguais**.

**No GitHub:** podes confirmar o último commit em **main** aqui:  
https://github.com/frankbexxx/tvde/commits/main

---

## Durante — começar uma alteração nova (feature ou fix)

**Regra:** não commits diretos em `main` se o repositório exige PR (branch protection). Trabalha numa **branch nova** a partir de `main` atualizado.

| Ordem | Onde     | O quê                                                                                                    |
| ----- | -------- | -------------------------------------------------------------------------------------------------------- |
| 1     | Terminal | Garante **“Antes de cada sessão”** feito (`main` + `pull`).                                              |
| 2     | Terminal | Cria branch: `git checkout -b feat/descricao-curta` ou `fix/descricao-curta` _(um conceito por branch)._ |
| 3     | IDE      | Editas ficheiros, testas localmente.                                                                     |
| 4     | Terminal | `git status` — revê o que mudou.                                                                         |
| 5     | Terminal | `git add <ficheiros>` ou `git add -A` _(com cuidado)_                                                    |
| 6     | Terminal | `git commit -m "tipo(âmbito): mensagem clara"` _(ex.: `fix(cron): …`)_                                   |
| 7     | Terminal | Primeiro push desta branch: `git push -u origin nome-da-branch`                                          |

**No GitHub:** após o primeiro push, aparece faixa amarela **“Compare & pull request”** no repositório:  
https://github.com/frankbexxx/tvde

Ou cria PR manualmente: **Pull requests → New pull request** → base **`main`** ← compare **`tua-branch`**:  
https://github.com/frankbexxx/tvde/compare

---

## Durante — se o PR ainda não foi mergeado e o `main` avançou

Outra pessoa mergeou PRs; o teu `main` local está velho **e** queres atualizar a **tua branch** antes de continuar.

| Ordem | Terminal                                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------------------ |
| 1     | `git checkout main`                                                                                                |
| 2     | `git pull origin main`                                                                                             |
| 3     | `git checkout tua-branch`                                                                                          |
| 4     | `git merge main` _(ou `git rebase main` se a equipa preferir rebase — combinar primeiro)_                          |
| 5     | Resolver conflitos se o Git avisar → `git add` → `git commit` (merge) ou `git rebase --continue`                   |
| 6     | `git push origin tua-branch` _(se rebasaste, pode ser necessário `git push --force-with-lease` — só se combinado)_ |

**No GitHub:** o PR atualiza sozinho quando fazes push na mesma branch.

---

## No GitHub — abrir e fechar um Pull Request

### Abrir

1. Vai a **Pull requests → New pull request**:  
   https://github.com/frankbexxx/tvde/pulls
2. **base:** `main` ← **compare:** a tua branch.
3. Título e descrição objetivos (o que muda, como testar).
4. **Create pull request**.
5. Espera **CI** (ex. `backend-ci`) verde, se estiver configurado.

### Depois do merge

1. No GitHub, no PR mergeado, usa **Delete branch** na branch do PR (limpa o remoto).
2. No teu PC (ver seção seguinte).

---

## Depois do merge — alinhar o teu PC e limpar

Faz **sempre** após merge do teu PR (ou para apanhar trabalho da equipa).

| Ordem | Onde     | O quê                                                                             |
| ----- | -------- | --------------------------------------------------------------------------------- |
| 1     | Terminal | `git checkout main`                                                               |
| 2     | Terminal | `git pull origin main`                                                            |
| 3     | Terminal | Apagar branch local do PR já mergeado: `git branch -d nome-da-branch`             |
| 4     | Terminal | `git fetch origin --prune` — remove referências a branches **apagadas no GitHub** |

**No GitHub:** apagar branches mergeadas evita lista gigante em **Branches**:  
https://github.com/frankbexxx/tvde/branches

---

## Limpeza periódica — branches locais antigas

Só quando tens a certeza de que **não** precisas dessas branches.

| Ordem | Terminal                                                                    |
| ----- | --------------------------------------------------------------------------- |
| 1     | `git checkout main` && `git pull origin main`                               |
| 2     | `git branch --merged main` — lista branches cujo trabalho já está em `main` |
| 3     | Para cada uma que queres remover: `git branch -d nome`                      |

**Não uses** `git branch -D` (forçar) sem saber que perdes trabalho não mergeado.

---

## Referência rápida — links GitHub úteis

| O quê                           | URL                                             |
| ------------------------------- | ----------------------------------------------- |
| Repositório                     | https://github.com/frankbexxx/tvde              |
| Commits em `main`               | https://github.com/frankbexxx/tvde/commits/main |
| Pull requests                   | https://github.com/frankbexxx/tvde/pulls        |
| Novo PR (compare)               | https://github.com/frankbexxx/tvde/compare      |
| Branches                        | https://github.com/frankbexxx/tvde/branches     |
| Actions / CI                    | https://github.com/frankbexxx/tvde/actions      |
| Settings (default branch, etc.) | https://github.com/frankbexxx/tvde/settings     |

---

## Se algo correr mal

| Situação                                         | O quê fazer                                                                                                       |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| **“Your branch is behind origin/main”**          | `git pull origin main` (em `main`).                                                                               |
| **“Your branch is ahead”**                       | Ou fizeste commits em `main` local: idealmente `git checkout -b fix/...` e PR, ou falar com a equipa.             |
| **“would be overwritten by merge”** (pull falha) | `git stash` ou commit das alterações locais, depois `git pull`.                                                   |
| **Conflitos no merge/rebase**                    | Edita ficheiros marcados, remove marcadores `<<<<<<<`, `git add`, completa merge/rebase.                          |
| **Push rejeitado (non-fast-forward)**            | Alguém pushou a mesma branch: `git fetch origin` + `git pull --rebase origin tua-branch` (ou merge) + `git push`. |

---

## Checklist mínimo (copiar para o dia a dia)

```
[ ] cd para o repo
[ ] git fetch origin
[ ] git checkout main && git pull origin main
[ ] git checkout -b feat/ou-fix/nome   (trabalho novo)
[ ] … desenvolvimento …
[ ] git add / git commit
[ ] git push -u origin nome-branch
[ ] GitHub: abrir PR → base main
[ ] Após merge: git checkout main && git pull && git branch -d nome-branch
[ ] git fetch origin --prune
```

---

## Princípios deste manual

1. **`origin/main` (GitHub)** é a referência do que está aceite.
2. **`main` local** deve coincidir com **`origin/main`** antes de ramificar.
3. **Uma branch por tarefa/PR**; depois do merge, **apagar** branch local (e no GitHub quando possível).
4. **Não reutilizar** branches antigas como “base permanente” — evita andar para trás e para a frente.

---

_Manual do projeto TVDE; ajusta URLs se o repositório for forkado ou renomeado._
