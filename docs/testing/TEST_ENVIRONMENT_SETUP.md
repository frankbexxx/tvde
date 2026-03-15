# TVDE — Configuração do Ambiente de Teste

Este documento explica como iniciar todo o sistema para testes manuais.

---

## Requisitos

- **Docker Desktop** — para PostgreSQL
- **Python 3.11+** — para o backend
- **Node.js 18+** — para o frontend
- **PowerShell** (Windows) ou **Bash** (Linux/macOS)

---

## Variáveis de Ambiente

O backend usa ficheiro `backend/.env`. Deve existir com:

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

Inicia o PostgreSQL.

**Comando (PowerShell):**

```
.\scripts\1_start_db.ps1
```

**Resultado esperado**

Mensagem: `PostgreSQL pronto.`

---

### Passo 2

Inicia o backend.

**Comando:**

```
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Resultado esperado**

Mensagem: `Application startup complete.` e `Uvicorn running on http://0.0.0.0:8000`

---

### Passo 3

Numa nova janela de terminal, inicia o frontend.

**Comando:**

```
cd web-app
npm run dev
```

**Resultado esperado**

Mensagem: `Local: http://localhost:5173/`

---

### Passo 4

Verifica o estado do backend.

Abre no browser:

```
http://localhost:8000/docs
```

**Resultado esperado**

A interface Swagger (OpenAPI) aparece.

---

### Passo 5

Verifica o estado do frontend.

Abre no browser:

```
http://localhost:5173
```

**Resultado esperado**

A app TVDE aparece. Se BETA_MODE=true, vês o ecrã de login (Telemóvel, Password). Se não, vês "A carregar..." e depois o dashboard.

---

### Passo 6 (Opcional — Reset antes de testes)

Se quiseres começar com base de dados limpa (sem viagens nem pagamentos):

**Comando (PowerShell, na raiz do projeto):**

```
.\scripts\2_reset_db.ps1
```

**Resultado esperado**

Mensagem: `Reset OK`

---

## Script Automatizado

Para arranque automático:

**PowerShell:**

```
.\scripts\start_test_env.ps1
```

**Bash (Linux/macOS):**

```
./scripts/start_test_env.sh
```

**Resultado esperado**

Mensagem: `Sistema pronto para testes.`
