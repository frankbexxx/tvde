# Runbook de Testes (Local Dev) — ARQUIVADO

> **Arquivado em:** Substituído por [TESTE_STRIPE_COMPLETO.md](../TESTE_STRIPE_COMPLETO.md) e [BACKEND_STATUS.md](../BACKEND_STATUS.md).
> Consultar DOCS_INDEX.md para documentação atual.

---

Projeto: Ride Sharing Backend  
Ambiente: Windows + Docker Desktop + Python venv  
Objetivo: testes reprodutiveis do fluxo OTP -> JWT -> Trip -> Audit

## Estado atual do backend (à data do arquivo)

- Autenticacao OTP + JWT: implementado e funcional.
- Criacao de trip (passageiro): implementado (`/trips`).
- Eventos/Auditoria: `audit_events` grava `trip.status_changed` (corrigido).
- Driver/Admin: endpoints principais ainda nao implementados (stubs).

## 0) Pre-requisitos (instalar 1x)

- Docker Desktop a funcionar
- Python 3.12+
- Projeto em `C:\dev\APP` (fora do OneDrive)
- `.env` em `C:\dev\APP\backend`

Conteudo minimo do `.env` (exemplo):

```
DATABASE_URL=postgresql+psycopg2://ride:ride@localhost:5432/ride_db
JWT_SECRET_KEY=dev-secret-super-inseguro
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_MINUTES=60
OTP_SECRET=dev-otp-secret
OTP_EXPIRATION_MINUTES=5
ENV=dev
```

## 1) Janelas necessarias

- PowerShell #1: Backend (uvicorn) em `C:\dev\APP\backend`
- PowerShell #2: Postgres (psql)
- Docker Desktop: iniciado

## 2) Arranque do zero

1) Iniciar Docker Desktop
2) Confirmar Docker: `docker ps`
3) Iniciar Postgres: `docker start ride-postgres`
4) Ativar venv + arrancar backend: `.\venv\Scripts\activate` e `uvicorn app.main:app --reload`
5) Health check: `http://127.0.0.1:8000/health` → `{"status":"ok"}`

## 3) Teste completo (passageiro)

OTP request → verify → Authorize → Criar Trip. Ver TESTE_STRIPE_COMPLETO.md para fluxo completo.

## 4–7) Verificacao DB, Admin, Erros

Ver TESTE_STRIPE_COMPLETO.md e BACKEND_STATUS.md.
