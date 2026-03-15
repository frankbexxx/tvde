# TVDE — Configuração do Ambiente de Teste

Este documento explica como iniciar todo o sistema para testes manuais.

---

## Sequência completa antes de testes

| # | Ação | Documento/Comando |
|---|------|-------------------|
| 1 | Arrancar sistema | `.\scripts\start_test_env.ps1` ou Passos 1-4 abaixo |
| 2 | (Opcional) Reset BD | `.\scripts\2_reset_db.ps1` — para estado limpo |
| 3 | (Obrigatório) Ter motoristas/passageiros | Seed via `POST /dev/seed` ou `driver_simulator.py` — ver `TEST_STATE_DEFINITION.md` |
| 4 | Verificação pré-teste | `docs/testing/PRE_TEST_VERIFICATION.md` — VER-001 a VER-005 |
| 5 | Executar testes | `docs/testing/TEST_BOOK_*.md` |

Sem o passo 3, VER-005 falhará (sem motoristas/passageiros). Sem o passo 4 aprovado, os testes não são válidos.

---

## Diretório do Projeto

**PROJECT_ROOT** — O diretório raiz do projeto (onde se encontram as pastas `backend`, `web-app`, `scripts`).

Para navegar para o projeto:

```
cd <PROJECT_ROOT>
```

Substitui `<PROJECT_ROOT>` pelo caminho real do teu projeto.

---

## Requisitos

- **Docker Desktop** — para PostgreSQL
- **Python 3.11+** — para o backend
- **Node.js 18+** — para o frontend
- **PowerShell** (Windows) ou **Bash** (Linux/macOS)

---

## Variáveis de Ambiente

O backend usa ficheiro `backend/.env`. Para criar ou adicionar chaves em falta (com valores reais, sem placeholders):

```
.\scripts\merge_env_keys.ps1
```

O script nunca sobrescreve valores existentes. O backend espera:

- `DATABASE_URL` — conexão PostgreSQL
- `JWT_SECRET_KEY`
- `OTP_SECRET`
- `STRIPE_SECRET_KEY` (modo teste: `sk_test_...`)
- `ENV=dev` — para endpoints /dev/reset e /dev/seed-simulator
- `ENABLE_DEV_TOOLS=true` — para seed e simulador

Para BETA (login com telemóvel):

- `BETA_MODE=true`

---

## Ordem de Arranque

### Passo 1

Navega para o diretório raiz do projeto.

**Comando:**

```
cd <PROJECT_ROOT>
```

**Resultado esperado**

O diretório atual é a raiz do projeto (contém as pastas `backend`, `web-app`, `scripts`).

---

### Passo 2

Inicia o PostgreSQL.

**Comando (PowerShell):**

```
.\scripts\1_start_db.ps1
```

**Resultado esperado**

Mensagem: `PostgreSQL pronto.`

---

### Passo 3

Inicia o backend.

**Comando (a partir de PROJECT_ROOT):**

```
cd <PROJECT_ROOT>
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Resultado esperado**

Mensagem: `Application startup complete.` e `Uvicorn running on http://0.0.0.0:8000`

---

### Passo 4

Numa nova janela de terminal, navega para PROJECT_ROOT e inicia o frontend.

**Comando:**

```
cd <PROJECT_ROOT>
cd web-app
npm run dev
```

**Resultado esperado**

Mensagem: `Local: http://localhost:5173/`

---

### Passo 5

Verifica o estado do backend.

Abre no browser:

```
http://localhost:8000/docs
```

**Resultado esperado**

A interface Swagger (OpenAPI) aparece.

---

### Passo 6

Verifica o estado do frontend.

Abre no browser:

```
http://localhost:5173
```

**Resultado esperado**

A app TVDE aparece. Se BETA_MODE=true, vês o ecrã de login (Telemóvel, Password). Se não, vês "A carregar..." e depois o dashboard.

---

### Passo 7 (Opcional — Reset antes de testes)

Se quiseres começar com base de dados limpa (sem viagens nem pagamentos):

**Comando (PowerShell, em PROJECT_ROOT):**

```
cd <PROJECT_ROOT>
.\scripts\2_reset_db.ps1
```

**Resultado esperado**

Mensagem: `Reset OK`

---

## Script Automatizado

Para arranque automático (executar a partir de PROJECT_ROOT):

**PowerShell:**

```
cd <PROJECT_ROOT>
.\scripts\start_test_env.ps1
```

**Bash (Linux/macOS):**

```
cd <PROJECT_ROOT>
./scripts/start_test_env.sh
```

**Resultado esperado**

Mensagem: `Sistema pronto para testes.`

---

## Verificação Pré-Teste (Obrigatória)

Antes de executar qualquer teste, completa a verificação em:

```
docs/testing/PRE_TEST_VERIFICATION.md
```

Nenhum teste é válido sem verificação prévia aprovada.
