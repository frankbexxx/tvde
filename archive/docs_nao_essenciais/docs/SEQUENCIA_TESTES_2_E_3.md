# Sequência — Testes 2 e 3 (Render + Web App)

Configuração já feita. Só a ordem de arranque e os testes.

---

## Pré-requisito: Ping Keep-Alive

Antes de testar, configura o ping (ver `PING_KEEP_ALIVE_RENDER.md`).  
Ou espera 1–2 min após abrir a app para o Render acordar.

---

## Teste 2 — Backend no Render

### Ordem

1. Nada a iniciar localmente — o backend está no Render.
2. Verificar: `https://tvde-api-fd2z.onrender.com/health` → deve responder 200.
3. (Opcional) Reset: `POST https://tvde-api-fd2z.onrender.com/dev/reset` (com ENABLE_DEV_TOOLS=true funciona).

### O que validar

- Health responde.
- `/dev/reset` funciona (se quiseres BD limpa).
- Webhooks Stripe a dar 200 (ver Dashboard após um pagamento).

---

## Teste 3 — Web App (manual)

### Ordem

1. Abrir a web app em **janela privada**: `https://tvde-app-j5tt.onrender.com` (ou o teu URL).
2. A app usa `VITE_API_URL` → aponta para o TVDE-api.
3. Se o Render estiver a dormir, o primeiro carregamento pode demorar 30–60 s.

### Sequência de teste

1. **Login** — OTP, receber código, entrar.
2. **Passageiro** — Criar viagem (origem/destino).
3. **Motorista** — (noutra sessão ou outro browser) Ver viagens disponíveis → Aceitar → Arriving → Start → Complete.
4. **Verificar** — Stripe Dashboard: pagamento em modo teste com valor correto.

### Cartão de teste

`4242 4242 4242 4242` — data futura, CVC qualquer (ex.: 123).

---

## Resumo

| Passo | Ação |
|-------|------|
| 1 | Configurar ping (UptimeRobot) ou esperar warm-up |
| 2 | Abrir web app em janela privada |
| 3 | Login → Criar viagem → Motorista completa |
| 4 | Verificar Stripe Dashboard |
