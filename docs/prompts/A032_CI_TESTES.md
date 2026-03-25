# A032 — CI (TESTES AUTOMÁTICOS)

## OBJETIVO

Garantir que todos os testes correm automaticamente a cada push.

Evitar:

- regressões silenciosas
- código não testado em produção
- dependência de testes manuais

---

## PRINCÍPIOS

- simples > completo
- rápido > sofisticado
- adaptar ao código existente
- sem overengineering

---

## ESCOPO

1. Pipeline automático (GitHub Actions)
2. PostgreSQL em CI
3. Execução de pytest
4. Falha bloqueia merge (configurar em **Settings → Branches → Branch protection** no GitHub: exigir o check **Backend CI**)

---

## 1. TRIGGER

Executar CI em:

- push para `main`
- pull requests para `main`

---

## 2. POSTGRES EM CI

Serviço:

- `postgres:15`
- porta `5432`
- user: `postgres`
- password: `postgres`
- db: `test_db`

---

## 3. VARIÁVEIS

`DATABASE_URL`:

`postgresql://postgres:postgres@localhost:5432/test_db`

(O backend normaliza para `postgresql+psycopg2://` em `app/db/session.py`.)

Além disso, `Settings` exige no CI (sem `.env`):

- `JWT_SECRET_KEY`, `OTP_SECRET`, `STRIPE_SECRET_KEY`
- `STRIPE_MOCK=true`, `ENV=dev` (evita exigir `STRIPE_WEBHOOK_SECRET` no arranque)

---

## 4. EXECUÇÃO

Na pasta `backend`:

```bash
pip install -r requirements.txt
pytest tests/ -v
```

Workflow: `.github/workflows/backend-ci.yml`.

---

## 5. DEFINIÇÃO DE SUCESSO

- pipeline corre automaticamente
- todos os testes passam
- falhas bloqueiam integração (via branch protection + required checks)

---

## NÃO FAZER

- não adicionar serviços externos
- não usar docker-compose
- não complicar pipeline

---

## RESULTADO

Sistema protegido contra regressões.

---

**FIM**
