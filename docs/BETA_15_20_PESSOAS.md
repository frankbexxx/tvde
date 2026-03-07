# Beta 15–20 Pessoas — Tudo Pronto

Configuração única. Depois só envias o link por WhatsApp.

---

## 1. Configuração no Render (uma vez)

No painel do Render → **tvde-api** → **Environment**:

| Variável | Valor | Já tens? |
|----------|-------|-----------|
| `ENABLE_DEV_TOOLS` | `true` | ✅ (para OTP fixo e promote-to-driver) |
| `BETA_MODE` | `true` | ➕ **Adicionar** (rate limit 5 pedidos/min) |

**Depois de alterar:** O Render faz redeploy automático. Espera 1–2 min.

---

## 2. Mensagem para enviar por WhatsApp

Copia e cola (ou adapta):

```
Olá! 👋

Teste da app TVDE — beta com 15–20 pessoas.

🔗 Abre no telemóvel ou PC:
https://tvde-app-j5tt.onrender.com

📱 Como entrar:
1. Abre o link
2. Escolhe Passageiro ou Motorista (canto superior direito)
3. Introduz o teu número (ex: +351912345678)
4. Clica "Pedir código"
5. Código: 123456
6. Entra

🚗 Como testar:
• Passageiro: Pedir viagem (origem/destino)
• Motorista: Ver viagens → Aceitar → Cheguei → Iniciar → Concluir
• Cartão de teste: 4242 4242 4242 4242 (data futura, CVC 123)

O primeiro carregamento pode demorar 30–60 s. Depois fica rápido.

Perguntas? Responde aqui.
```

---

## 3. Para ti (organizador) — antes de enviar

### Opcional: limpar BD

Se quiseres começar do zero:

```
POST https://tvde-api-fd2z.onrender.com/dev/reset
```

(Usa Postman, curl ou Insomnia. Sem body.)

### Motoristas

Quando 5–6 pessoas disserem que vão ser motoristas, promove-as:

```
POST https://tvde-api-fd2z.onrender.com/dev/promote-to-driver?phone=+351912345678
```

Substitui o número pelo número de telefone que cada motorista usou.

**Exemplo curl:**
```bash
curl -X POST "https://tvde-api-fd2z.onrender.com/dev/promote-to-driver?phone=%2B351912345678"
```

**Importante:** Depois de promover, diz ao motorista para fazer **logout e login novamente** (o token antigo ainda tem papel de passageiro).

---

## 4. URLs de referência

| Uso | URL |
|-----|-----|
| **App (enviar aos testadores)** | https://tvde-app-j5tt.onrender.com |
| **Passageiro** | https://tvde-app-j5tt.onrender.com/passenger |
| **Motorista** | https://tvde-app-j5tt.onrender.com/driver |
| **Reset BD** | `POST` https://tvde-api-fd2z.onrender.com/dev/reset |
| **Promover a motorista** | `POST` https://tvde-api-fd2z.onrender.com/dev/promote-to-driver?phone=+351912345678 |

---

## 5. O que está configurado

- **OTP fixo:** 123456 (em ENABLE_DEV_TOOLS)
- **Rate limit:** 5 pedidos de viagem/min por user (em BETA_MODE)
- **Ping keep-alive:** Cron a cada 14 min (evita cold start)
- **Stripe:** Modo teste, webhooks 200 OK
- **Promote-to-driver:** Endpoint para criar motoristas

---

## 6. Resumo

1. Adicionar `BETA_MODE=true` no Render
2. (Opcional) `POST /dev/reset` para limpar
3. Enviar a mensagem por WhatsApp
4. Quando alguém disser que é motorista → `POST /dev/promote-to-driver?phone=+351XXX`

Não precisas de configurar mais nada. Só enviar o link.
