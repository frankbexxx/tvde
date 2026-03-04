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

## Resumo

| Teste | Descrição | Quando |
|-------|-----------|--------|
| 1 | Runs normais + esperar 15 min | Início da sessão |
| 2 | Cold start (abrir após dormir) | Após Teste 1 |
| 3 | Dormancy (trocar app, voltar) | A qualquer momento |
| 4 | Análise de timings nos logs | No fim |

**Nota:** O Teste 1 pode ser feito em 2 dispositivos em paralelo (passageiro + motorista). Os Testes 2 e 3 podem ser feitos em cada dispositivo separadamente.
