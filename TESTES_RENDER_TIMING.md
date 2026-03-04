# Testes Render — Cold Start e Dormancy

Testes para validar timings e comportamento quando o backend no Render Free Tier adormece (~15 min sem tráfego) e quando o utilizador alterna entre apps.

**Pré-requisito:** App no Render (tvde-app, tvde-api). Seed executado. Ver [PREPARACAO_RENDER.md](PREPARACAO_RENDER.md).

**Logs:** Cada dispositivo exporta com nome único (`interaction_logs_{deviceId}_run{seq}_{date}.csv`). Ver [INTERACTION_LOGGING.md](INTERACTION_LOGGING.md).

---

## Teste 1 — Runs normais (deixar Render adormecer)

**Objetivo:** Executar uma ou duas runs normais para gerar tráfego e, em seguida, deixar o Render adormecer (~15 min sem requests).

**Sequência:**
1. Abre a app no telemóvel/PC.
2. Executa Seed (se necessário).
3. Faz 1–2 fluxos completos: Passageiro pede viagem → Motorista ACEITAR → Cheguei → Iniciar → Concluir.
4. Export logs (Dev → Export logs). Guarda o ficheiro.
5. **Espera 15–20 minutos** sem abrir a app nem fazer nenhum request. O backend vai adormecer.
6. Não feches a app no telemóvel — deixa-a em background ou com o ecrã bloqueado.

**Resultado esperado:** Logs com `app_start`, ações normais, e (se aplicável) `dormancy_enter` quando saíste da app.

---

## Teste 2 — Cold start (após Render adormecer)

**Objetivo:** Medir o tempo desde que o utilizador abre a app até ao primeiro pedido bem-sucedido, quando o backend acabou de acordar.

**Pré-requisito:** Teste 1 concluído — Render adormecido há 15+ min.

**Sequência:**
1. Abre a app no telemóvel (ou recarrega se já estava aberta).
2. Regista mentalmente ou em cronómetro: quanto tempo até a app carregar e mostrar "Pronto" ou "Sem viagem ativa".
3. Clica em **Pedir viagem** assim que possível.
4. Regista: quanto tempo até a viagem ser criada (estado "À procura" ou "Motorista atribuído").
5. Export logs (Dev → Export logs).

**O que verificar nos logs:**
- `app_start` — timestamp do arranque
- `request_trip` — timestamp e `latency_ms` do primeiro request
- Diferença entre `app_start` e `request_trip` = tempo percebido pelo utilizador

**Resultado esperado:** O primeiro request pode demorar 30–60 s (backend a acordar). Os seguintes devem ser rápidos.

---

## Teste 3 — Dormancy (alternar apps e voltar)

**Objetivo:** Verificar que ao voltar à app (após trocar de app ou bloquear ecrã), o estado é actualizado automaticamente.

**Sequência:**
1. Com a app aberta e uma viagem em curso (ex.: "À procura" ou "Motorista a caminho"):
   - Troca para outra app (mensagens, browser) ou bloqueia o ecrã.
   - Espera 30–60 segundos.
   - Volta à app TVDE.
2. Verifica: o estado está actualizado? (ex.: motorista aceitou entretanto)
3. Export logs.

**O que verificar nos logs:**
- `dormancy_enter` — quando saíste
- `dormancy_exit` — quando voltaste
- O polling deve ter feito refetch imediato ao `dormancy_exit`

**Resultado esperado:** Estado actualizado sem precisar de refresh manual.

---

## Teste 4 — Análise de timings

**Objetivo:** Consolidar os logs de vários dispositivos e analisar timings.

**Sequência:**
1. Junta os CSVs exportados (um por dispositivo, por run).
2. Ordena por `deviceId` e `run`, depois por `timestamp`.
3. Analisa:
   - Tempo entre `app_start` e primeira ação
   - Tempo entre `dormancy_enter` e `dormancy_exit` (quanto tempo esteve "dormido")
   - `latency_ms` das ações em cold start vs. warm
   - Se há gaps ou erros após dormancy

**Métricas úteis:**
- Cold start: `request_trip.timestamp - app_start.timestamp`
- Latência do primeiro request após acordar
- Consistência do estado após `dormancy_exit`

---

## Teste 5 — Regressão (passageiro cancela após aceite)

**Objetivo:** Confirmar que, quando o passageiro cancela após o motorista aceitar, o motorista volta à lista e vê a nova viagem.

**Sequência:**
1. Passageiro pede viagem.
2. Motorista aceita (estado "A caminho do passageiro").
3. Passageiro cancela (botão Cancelar visível em accepted/arriving).
4. **Motorista:** deve voltar automaticamente à lista de viagens disponíveis (não ficar em "cancelled").
5. Passageiro pede nova viagem.
6. **Motorista:** deve ver a nova viagem na lista.

**Resultado esperado:** Motorista não fica preso na vista da viagem cancelada; polling detecta `cancelled` e limpa `activeTripId`.

---

## Teste 6 — Fricção de rede e Stripe imperfeito

**Objetivo:** Validar comportamento com rede instável e payment em "processing". Ver [VALIDACAO_HUMANA_CAMPO.md](VALIDACAO_HUMANA_CAMPO.md).

**6a — Fricção de rede**
- Durante o fluxo: desliga dados do motorista 10 s, faz refresh, alterna entre apps.
- **Pergunta:** O sistema mantém coerência? O utilizador sente controlo ou ansiedade?

**6b — Stripe imperfeito**
1. [Stripe Dashboard](https://dashboard.stripe.com) → Webhooks → remove temporariamente o URL
2. Completa a viagem na app
3. O payment fica "processing" no backend
4. **Observa:** O passageiro percebe? Ou assume que pagou e acabou?
5. Reativa o webhook no Stripe

---

## Resumo

| Teste | Descrição | Quando |
|-------|-----------|--------|
| 1 | Runs normais + esperar 15 min | Início da sessão |
| 2 | Cold start (abrir após dormir) | Após Teste 1 |
| 3 | Dormancy (trocar app, voltar) | A qualquer momento |
| 4 | Análise de timings nos logs | No fim |
| 5 | Regressão: passageiro cancela → motorista volta à lista | Após correções |
| 6 | Fricção de rede + Stripe imperfeito | Validação humana |

**Nota:** O Teste 1 pode ser feito em 2 dispositivos em paralelo (passageiro + motorista). Os Testes 2 e 3 podem ser feitos em cada dispositivo separadamente.

---

## Resultados

*(Registar após cada teste. No fim, adicionar Conclusões.)*

### Teste 1 — 04/03/2026
- ✅ Concluído
- Runs normais executadas, espera 15+ min para Render adormecer

### Teste 2 — 04/03/2026
- ✅ Concluído
- **Dispositivo:** Telemóvel (deviceId 84a6815c)
- **Carregamento:** ~2 s com reload
- **Pedir viagem:** Demorou um pouco a clicar; assim que pediu → "Motorista atribuído" imediato
- **Log:** `logs/interaction_logs_84a6815c_run1_2026-03-04.csv`
- **Latência request_trip:** 25 ms (backend já acordado)

### Teste 3 — 04/03/2026
- ✅ Concluído
- **Dispositivo:** Tablet (deviceId 84a6815c)
- **Experiência 1:** Passageiro e motorista no tablet — fluxo normal
- **Experiência 2:** Passageiro no tablet, motorista no telemóvel
  - Tablet deixado adormecido uns segundos
  - Motorista (telemóvel) executou ACEITAR → Cheguei → Iniciar viagem (até "em viagem")
  - Ao voltar ao tablet: **estava tudo normal** — estado actualizado automaticamente
- **Logs:** `logs/interaction_logs_84a6815c_run1_2026-03-04.csv`, `logs/interaction_logs_84a6815c_run2_2026-03-04.csv`
- **Dormancy nos logs (run2):** passageiro `dormancy_enter` 10:39:12 → `dormancy_exit` 10:40:37 (~1,5 min); motorista fez accept/arriving/start entretanto; ao acordar, estado correcto

### Teste 4 — 04/03/2026
- ✅ Concluído
- **Dispositivos:** PC (84062059), Tablet (3ccebe47), Telemóvel (84a6815c)
- **Logs:** `logs/interaction_logs_84062059_run1_2026-03-04.csv`, `interaction_logs_3ccebe47_run2_2026-03-04.csv`, `interaction_logs_84a6815c_run3_2026-03-04.csv`

**Experiência 1 — PC (passageiro + motorista):**
- Pediu viagem no PC, aceitou como motorista no PC
- Ao voltar à vista Passageiro: **faltava botão Cancelar**
- **A melhorar:** Passageiro deveria poder cancelar até entrar na viatura (estados `accepted`, `arriving`)

**Experiência 2 — 3 dispositivos em sincronia:**
- Dois pedidos (Telemóvel + Tablet) → ambas as viagens apareceram na aba Motorista
- Ao aceitar uma viagem, a outra desapareceu da lista (motorista ocupado)
- Passageiros em estados diferentes: um "Motorista a caminho" (aceite), outro "Motorista atribuído" (à espera)
- Ao concluir a primeira viagem, a segunda reapareceu em todos os dispositivos
- Fluxo correcto

**Reset run** no fim.

### Teste 5 — 04/03/2026
- ✅ Concluído
- Passageiro cancelou após aceite → motorista voltou à lista; nova viagem visível

### Teste 6 — 04/03/2026
- **6a:** ✅ Concluído (fricção de rede)
- **6b (Stripe):** ✅ Concluído — webhook corrigido; entregas `payment_intent.succeeded` agora 200 OK
- **6b (fricção de rede):** Ao desligar wifi e dados após o motorista aceitar, o passageiro passava para "sem viagem activa"; retoma "em viagem" ao reconectar. **Corrigido:** passageiro vê agora "Sem conectividade" offline e "A verificar..." quando há falha temporária.

---

### Conclusões — 04/03/2026

- **Testes 1–6:** Concluídos com sucesso
- **Teste 6:** Webhook Stripe corrigido (200 OK); fricção de rede: passageiro vê "Sem conectividade" offline e "A verificar..." em falhas temporárias; recupera ao reconectar
- **Cold start:** ~2 s no telemóvel; request_trip rápido (25–71 ms) quando backend acordado
- **Dormancy:** Auto-refresh funciona — ao voltar à app, estado actualizado
- **Multi-dispositivo:** Sincronia correcta; viagens concorrentes bem geridas
- **Implementado:** Botão Cancelar em `accepted` e `arriving`; motorista volta à lista quando passageiro cancela
