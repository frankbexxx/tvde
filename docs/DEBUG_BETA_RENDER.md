# Depuração BETA no Render

## O que está a acontecer

A app mostra **Seed** e **"Falha ao carregar - executar Seed"** → está a usar o fluxo **dev** (getDevTokens), não o fluxo **BETA** (login com telefone).

Em BETA, deverias ver o **LoginScreen** (telemóvel + password), não o Seed.

---

## Passo 1: Verificar se o backend está em BETA

Abre no browser (ou Postman):

```
https://tvde-api-XXXX.onrender.com/config
```

(Substitui pelo URL real do teu tvde-api no Render.)

**Esperado:** `{ "beta_mode": true }`

**Se vier** `{ "beta_mode": false }`:
- O backend não tem `BETA_MODE=true` nas variáveis de ambiente
- No Render: tvde-api → Environment → adiciona `BETA_MODE` = `true`
- Faz redeploy

---

## Passo 2: Verificar se o frontend aponta para o backend certo

No Render, serviço **tvde-app**:
- Environment → `VITE_API_URL` deve ser o URL do tvde-api (ex: `https://tvde-api-XXXX.onrender.com`)
- Sem barra no fim
- **Importante:** variáveis `VITE_` são usadas no build. Se alterares, é preciso **redeploy** para aplicar.

---

## Passo 3: Verificar se o frontend tem o código BETA

O frontend precisa do código que:
1. Chama `/config`
2. Se `beta_mode: true` → mostra LoginScreen em vez de carregar tokens

Confirma que o último push foi deployado:
- GitHub → repo → último commit deve ter "modo BETA operacional"
- Render → tvde-app → Deploys → último deploy deve ser recente

Se o deploy for antigo, faz **Manual Deploy** no Render.

---

## Passo 4: Verificar a coluna na base de dados

Se o erro `column users.requested_role does not exist` continuar:

1. No Render: tvde-api → conecta ao PostgreSQL (Shell ou connection string)
2. Executa:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS requested_role VARCHAR(32);
```

3. Para o enum (se der erro ao criar users com status=pending):

```sql
ALTER TYPE user_status_enum ADD VALUE 'pending';
```

(Se "IF NOT EXISTS" não funcionar na 2ª linha, usa só a 1ª.)

---

## Passo 5: Ordem de verificação

| # | O que verificar | Onde | Como |
|---|-----------------|------|------|
| 1 | `/config` devolve `beta_mode: true` | Browser | GET tvde-api-XXX/config |
| 2 | `BETA_MODE=true` no backend | Render tvde-api | Environment |
| 3 | `VITE_API_URL` correto no frontend | Render tvde-app | Environment |
| 4 | Frontend com código BETA | Render tvde-app | Deploys (último) |
| 5 | Coluna `requested_role` existe | PostgreSQL Render | SQL acima |

---

## Resumo rápido

1. **Backend:** `BETA_MODE=true` + redeploy
2. **GET /config** → deve devolver `{ "beta_mode": true }`
3. **Frontend:** redeploy com código mais recente
4. **DB:** executar o `ALTER TABLE` se o erro continuar

Depois disto, ao abrir a app deverás ver o **LoginScreen** (telemóvel, password, Passageiro/Motorista), não o Seed.
