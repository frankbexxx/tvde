# Roteiro — Testes 1 e 5

Quando voltares, segue este guia. Cada passo indica **onde** estás a agir (Render, Stripe, app web, etc.) para não te confundires.

---

## Legenda de contexto

| Sigla | Significado |
|-------|-------------|
| **RENDER** | Backend ou frontend hospedados no Render (tvde-api, tvde-app) |
| **APP** | Web app no browser (https://tvde-app-j5tt.onrender.com) |
| **STRIPE** | Stripe Dashboard (https://dashboard.stripe.com) — modo teste |
| **STRIPE_CLI** | Stripe CLI no terminal (só se usares para webhooks locais) |
| **DOCKER** | Docker / ambiente local (não usamos nestes testes) |
| **LOGS** | Export de logs da app (Dev → Export logs) |

**Nota:** Nestes testes **não usas** Docker nem Stripe CLI. Tudo corre no Render e na app em produção.

---

# Teste 1 — Runs normais + deixar Render adormecer

**Objetivo:** Fazer fluxos normais e depois deixar o Render sem tráfego ~15–20 min para ele adormecer (útil para depois testar cold start).

---

## Parte A — Fluxos normais

1. **[APP]** Abre a web app em janela privada:  
   `https://tvde-app-j5tt.onrender.com`

2. **[APP]** Faz login (OTP) — passageiro e motorista (podes usar 2 janelas privadas ou 2 browsers).

3. **[APP]** Executa **1–2 fluxos completos**:
   - Passageiro: Pedir viagem (origem/destino)
   - Motorista: Aceitar → Cheguei → Iniciar → Concluir
   - Passageiro: Pagar com cartão `4242 4242 4242 4242` (data futura, CVC 123)

4. **[APP]** No menu Dev → **Export logs**. Guarda o ficheiro (ex.: `interaction_logs_run1_2026-03-07.csv`).

5. **[RENDER]** Não precisas de fazer nada no Render. O backend está lá; o ping keep-alive (cron-job) pode estar ativo — se estiver, o Render pode não adormecer. Para este teste, **desativa temporariamente o cron** ou espera mais tempo (ex.: 20–25 min) para garantir que adormece.

---

## Parte B — Esperar o Render adormecer

6. **[APP]** Deixa a app aberta no browser (pode ficar em background). **Não feches** a janela.

7. **[RENDER]** Durante **15–20 minutos** (ou mais se o ping estiver ativo):
   - Não abras a app
   - Não faças requests ao backend
   - Não abras `https://tvde-api-fd2z.onrender.com/health` no browser

8. **[RENDER]** Após a espera, o backend no Render deve estar em cold start (adormecido). Estás pronto para o Teste 2 (cold start) quando quiseres — mas hoje o foco é 1 e 5.

---

## Checklist Teste 1

- [ ] 1–2 fluxos completos (passageiro + motorista)
- [ ] Export logs guardado
- [ ] Espera 15–20 min sem tráfego
- [ ] App deixada aberta (não fechada)

---

# Teste 5 — Regressão: passageiro cancela após aceite

**Objetivo:** Confirmar que, quando o passageiro cancela depois do motorista aceitar, o motorista volta à lista de viagens e vê a nova viagem.

**Contexto:** Tudo no **[APP]** e no **[RENDER]**. Nada no Stripe Dashboard nem Docker.

---

## Sequência

1. **[APP]** Abre a app em **2 janelas privadas** (ou 2 browsers):
   - Janela A: passageiro
   - Janela B: motorista

2. **[APP]** Login OTP em ambas.

3. **[APP] Janela A (passageiro):** Pedir viagem (origem/destino). Estado: "À procura" ou "Motorista atribuído".

4. **[APP] Janela B (motorista):** Ver viagens disponíveis → **Aceitar** a viagem. Estado no passageiro: "Motorista a caminho" / "A caminho do passageiro".

5. **[APP] Janela A (passageiro):** Clica em **Cancelar** (o botão deve estar visível em "Motorista a caminho").

6. **[APP] Janela B (motorista):** Verifica:
   - O motorista deve **voltar automaticamente** à lista de viagens disponíveis
   - Não deve ficar preso na vista da viagem cancelada

7. **[APP] Janela A (passageiro):** Pedir **nova viagem** (outra origem/destino).

8. **[APP] Janela B (motorista):** Verifica:
   - A **nova viagem** deve aparecer na lista
   - O motorista pode aceitar e completar normalmente

---

## O que NÃO precisas de fazer

- **[STRIPE]** Não precisas de abrir o Stripe Dashboard para este teste.
- **[STRIPE_CLI]** Não usas Stripe CLI.
- **[DOCKER]** Não usas Docker.
- **[RENDER]** Não precisas de configurar nada no Render; só usas a app que já aponta para a API.

---

## Checklist Teste 5

- [ ] Passageiro pede viagem
- [ ] Motorista aceita
- [ ] Passageiro cancela (botão Cancelar)
- [ ] Motorista volta à lista automaticamente
- [ ] Passageiro pede nova viagem
- [ ] Motorista vê a nova viagem na lista

---

# Resumo rápido

| Teste | Onde | O que fazer |
|-------|------|-------------|
| **1** | APP + RENDER (espera) | Fluxos completos → export logs → esperar 15–20 min |
| **5** | APP (2 janelas) | Pedir → Aceitar → Cancelar → Motorista volta → Nova viagem |

---

# Se algo correr mal

- **App não carrega:** [RENDER] Pode ser cold start. Espera 30–60 s ou verifica se o ping keep-alive está ativo.
- **Botão Cancelar não aparece:** [APP] Deve estar visível em "Motorista a caminho" (accepted/arriving). Se não estiver, regista e avisa.
- **Motorista não volta à lista:** [APP] O polling deve detectar `cancelled` e limpar `activeTripId`. Regista o comportamento.

Boa sorte. Quando voltares, é só seguir o roteiro.
