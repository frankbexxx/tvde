# Testes em Ambiente de Desenvolvimento

Guia focado **apenas** em desenvolvimento. Sem referências a produção até estarmos prontos para isso.

---

## Princípio

Tudo o que fazemos está em **desenvolvimento**:
- Stripe em **modo teste** (cartões 4242...)
- Backend com `ENV=dev`
- Base de dados de desenvolvimento

---

## 1. Testar Backend no Render (ambiente dev)

**Objetivo:** Backend deployado no Render, mas a funcionar como dev.

### Configuração no Render

| Variável | Valor |
|----------|-------|
| `ENV` | `dev` |
| `STRIPE_SECRET_KEY` | Chave de **teste** (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Do Stripe Dashboard, secção **Developers → Webhooks** (modo teste) |
| `DATABASE_URL` | PostgreSQL do Render ou local |

### Webhook Stripe (modo teste)

1. Stripe Dashboard → **Developers** → **Webhooks**
2. **Add endpoint**
3. URL: `https://tvde-api.onrender.com/webhooks/stripe` (ou o teu URL)
4. Eventos: `payment_intent.*`, `charge.*` (ou os que usas)
5. Copiar o **Signing secret** (`whsec_...`) → `STRIPE_WEBHOOK_SECRET` no Render

**Importante:** O signing secret vem do **Dashboard**, não do `stripe listen`. O `stripe listen` é só para testes locais.

### Reset da base de dados

Com `ENV=dev`, o endpoint `POST /dev/reset` está disponível:

```http
POST https://tvde-api.onrender.com/dev/reset
```

Ou usar o script local (se o backend estiver acessível):

```powershell
.\scripts\2_reset_db.ps1
```

(Ajustar o script para o URL do Render se necessário.)

---

## 2. Testar Web App (ambiente dev)

**Objetivo:** Web app a falar com o backend (local ou Render), Stripe em modo teste.

### Configuração

- Web app aponta para o backend (ex.: `http://localhost:8000` ou `https://tvde-api.onrender.com`)
- Stripe usa chaves de **teste** no frontend (se aplicável)

### Cartões de teste (Stripe)

- **Sucesso:** `4242 4242 4242 4242`
- **Recusa:** `4000 0000 0000 0002`
- Data futura qualquer, CVC qualquer (ex.: 123)

### Fluxo a testar

1. Login (OTP)
2. Passageiro: criar viagem
3. Motorista: aceitar → arriving → start → complete
4. Verificar pagamento no Stripe Dashboard (modo teste)

### Boas práticas

- Usar janela **privada/incógnito** para evitar cache e sessões antigas
- Reset da BD antes dos testes se quiseres estado limpo

---

## 3. Testar Simulador contra Backend (dev)

**Objetivo:** Simulador local a gerar carga contra o backend (local ou Render).

### Backend local

```powershell
.\scripts\2_reset_db.ps1
python run_simulator.py --scenario normal
```

### Backend no Render

```powershell
$env:TVDE_SIM_API_BASE_URL="https://tvde-api.onrender.com"
.\scripts\2_reset_db.ps1   # ou POST /dev/reset manual
python run_simulator.py --scenario normal
```

**Nota:** O seed (`/dev/seed-simulator`) só funciona com `ENV=dev`.

---

## Resumo

| Componente | Ambiente dev |
|------------|--------------|
| Backend | `ENV=dev` |
| Stripe | Modo teste, chaves `_test_` |
| Webhook secret | Do Dashboard (modo teste) |
| Cartões | 4242 4242 4242 4242 |
| Reset | `POST /dev/reset` disponível |

**Produção:** Só quando decidirmos avançar. Este guia não cobre produção.
