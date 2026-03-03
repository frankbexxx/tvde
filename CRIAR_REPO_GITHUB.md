# Criar Repositório no GitHub — Passos para o Utilizador

Seguir **por esta ordem**. Os passos marcados com 👤 são feitos por ti no browser.

---

## Pré-requisito

O projeto já está preparado localmente (`.gitignore`, `README`, etc.). O Git foi inicializado e o primeiro commit foi feito.

---

## 👤 Passo 1 — Criar o repositório no GitHub

1. Abre o browser e vai a [https://github.com/new](https://github.com/new)
2. Preenche:
   - **Repository name:** `tvde`
   - **Description:** (opcional) "Ride sharing MVP"
   - **Visibility:** **Private**
   - **NÃO** marques "Add a README file"
   - **NÃO** marques "Add .gitignore"
   - **NÃO** marques "Choose a license"
3. Clica **Create repository**

---

## 👤 Passo 2 — Ligar e fazer push (no terminal)

O GitHub vai mostrar instruções. No PowerShell, na pasta do projeto (`C:\dev\APP`), executa:

```powershell
git remote add origin https://github.com/frankbexxx/tvde.git
git branch -M main
git push -u origin main
```


Se pedir autenticação:
- **Username:** `frankbexxx`
- **Password:** usa um **Personal Access Token** (o GitHub já não aceita password normal). Cria em: [GitHub → Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)

---

## 👤 Passo 3 — Adicionar o parceiro como colaborador

1. No repositório, vai a **Settings** (tab do repo)
2. No menu esquerdo, clica em **Collaborators** (ou **Collaborators and teams**)
3. Clica **Add people**
4. Escreve o username: **ventosferteis**
5. Escolhe a permissão (sugestão: **Write** para poder fazer push)
6. Clica **Add** — o parceiro recebe um convite por email

---

## Verificação

- [ ] Repo criado como **Private**
- [ ] Código enviado com `git push`
- [ ] Parceiro adicionado como colaborador
- [ ] Parceiro aceitou o convite (verifica em Collaborators)

---

## Nota para o parceiro

O parceiro deve:

1. Clonar o repo: `git clone https://github.com/frankbexxx/tvde.git` (ou `git@github.com:frankbexxx/tvde.git` com SSH)
2. Criar `backend/.env` a partir de `backend/.env.example` (pedir os valores sensíveis por canal seguro)
3. Seguir o `GUIA_TESTES.md` para correr localmente
