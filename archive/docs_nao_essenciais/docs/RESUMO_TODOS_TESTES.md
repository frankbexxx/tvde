# Resumo — Todos os Testes TVDE

Visão consolidada do que foi testado e do que falta.

---

## 1. Testes Técnicos (Simulador)

**Ficheiro:** `RELATORIO_TESTES_SIMULADOR.md`

| Cenário | Data | Resultado |
|---------|------|-----------|
| **Normal** | 06/03/2026 | 20 viagens, 100% concluídas |
| **Flash crowd** | 06/03/2026 | 20 viagens simultâneas, 100% aceites e concluídas |
| **Heavy load** | 06/03/2026 | 20 min, 217 viagens, 50p/20d no pico, 150 concorrentes — sem falhas |

**Validações:** Stripe webhooks 200 OK, cancelamentos 409 tratados, consistência DB.

---

## 2. Testes Render (Cold Start, Dormancy, Regressão)

**Ficheiro:** `TESTES_RENDER_TIMING.md`

| Teste | Descrição | Data | Estado |
|-------|-----------|------|--------|
| **1** | Runs normais + esperar 15–20 min (Render adormece) | 04/03, 07/03 | ✅ |
| **2** | Cold start (abrir app após backend dormir) | 04/03 | ✅ ~2 s, request_trip 25–71 ms |
| **3** | Dormancy (trocar app, voltar — estado atualizado?) | 04/03 | ✅ Auto-refresh OK |
| **4** | Análise de timings nos logs | 04/03, 07/03 | ✅ |
| **5** | Regressão: passageiro cancela após aceite → motorista volta à lista | 04/03, 07/03 | ✅ |
| **6** | Fricção de rede + Stripe imperfeito | 04/03 | ✅ "Sem conectividade" offline, webhook 200 OK |

---

## 3. Testes Backend + Web App (Render)

**Ficheiro:** `docs/SEQUENCIA_TESTES_2_E_3.md`

| Teste | Descrição | Estado |
|-------|-----------|--------|
| **Backend** | `/health` 200, `/dev/reset`, webhooks Stripe 200 OK | ✅ |
| **Web app** | Login OTP, fluxo completo (passageiro → motorista → pagamento), Stripe Dashboard | ✅ |

**Ping keep-alive:** Cron-job.org a cada 14 min (até 07/03/2026).

---

## 4. Validação Humana em Campo

**Ficheiro:** `VALIDACAO_HUMANA_CAMPO.md`

| Data | Participantes | Resultado |
|------|---------------|-----------|
| **28/02/2026** | 4 telemóveis, 1 motorista + 3 passageiros, rede móvel | ✅ 100% positivo |

**Foco:** Fricção cognitiva, clareza de estado, feedback visual, confiança no preço.

---

## 5. O que falta — Beta com 15–20 Pessoas Reais

Os documentos referem **"beta público pequeno e controlado"** (PROMPT_FERRAMENTAS_OPERACIONAIS_BETA.md) e **"prontidão para beta público pequeno"** (RELATORIO_TESTES_SIMULADOR.md).

A validação em campo foi com **4 pessoas**. O próximo passo lógico é:

| Fase | Descrição |
|------|-----------|
| **Beta 15–20 pessoas** | Testes com utilizadores reais (não simulador), fluxo orgânico, observação de UX e fricções |

**O que validar:**
- Fluxo completo em contexto real (vários passageiros, vários motoristas)
- Comportamento sob carga real (viagens concorrentes)
- Fricções de UX (hesitação, confusão, cliques repetidos)
- Stripe em modo teste com cartões reais (ou teste) de vários utilizadores
- Rate limit (BETA_MODE) com 5 request_trip/min por user

**Pré-requisitos:**
- BETA_MODE=true no Render (rate limit ativo)
- Seed ou onboarding de 15–20 utilizadores (emails/OTP)
- Proporção passageiros/motoristas realista (ex.: 10p / 5d)
- Guia curto para testadores (ver VALIDACAO_HUMANA_CAMPO.md — Cenários 1, 2, 3)

---

## Resumo Visual

```
Simulador (carga)     → ✅ Normal, Flash crowd, Heavy load
Render (cold/dormancy)→ ✅ Testes 1–6
Backend + Web app     → ✅ Health, webhooks, fluxo manual
Validação 4 pessoas   → ✅ 28/02/2026
─────────────────────────────────────────
Beta 15–20 pessoas    → ⏳ Pendente
```

---

## Ficheiros de Referência

| Ficheiro | Conteúdo |
|----------|----------|
| `RELATORIO_TESTES_SIMULADOR.md` | Simulador, flash crowd, heavy load |
| `TESTES_RENDER_TIMING.md` | Cold start, dormancy, regressão |
| `docs/SEQUENCIA_TESTES_2_E_3.md` | Backend + web app no Render |
| `VALIDACAO_HUMANA_CAMPO.md` | Validação humana, cenários, log de observação |
| `docs/ROTEIRO_TESTES_1_E_5.md` | Roteiro Teste 1 e 5 |
| `docs/PING_KEEP_ALIVE_RENDER.md` | Configuração ping |
