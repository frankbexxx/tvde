# Dia 23 — gate TVDE 1–9

Referência: `C:\dev\_greenshots\dia 23\` · alvo caixa+botões = **TVDE 4**.

**Fase fechada:** **2026-05-23** — Frank validou no Render («quase bom»). Micro layout → **TW-DIA23-1**. Waze duplo → **F-NAV-1**.

| ID | Fluxo | Critério | Estado |
|----|-------|----------|--------|
| TVDE 1 | Pass idle + drv wait | Mapa full, caixa compacta, cantos iguais | Concluído |
| TVDE 2 | Drv offline | Sem Estatuto; pino + «offline» | Concluído |
| TVDE 3 | Pass planning | Sem copy duplicada recolha | Concluído |
| TVDE 4 | Pass confirm | Referência intacta (Confirmar+Alterar dentro) | Concluído |
| TVDE 5 | Pass search + drv offer | Cancelar dentro; oferta compacta | Concluído |
| TVDE 6 | Ambos searching | Botões lado a lado, sheet baixa | Concluído |
| TVDE 7 | Ambos en route | Mapa full, popup sobre mapa | Concluído |
| TVDE 8 | Ambos ongoing | Terminar dentro da caixa (drv) | Concluído |
| TVDE 9 | Pass rating + drv post | Compacto, mapa visível | Concluído |

## Comandos (automático)

- [x] `npm run build` — OK
- [x] `npx playwright test e2e/driver-passenger-flow.spec.ts` — 4/4
- [x] `node web-app/scripts/dia23-static-audit.mjs` — P1 OK (pós-#334)

## URLs (Render — smoke Frank)

- Passageiro: https://tvde-app-j51f.onrender.com/passenger?demo=1
- Motorista: https://tvde-app-j51f.onrender.com/driver?demo=1
- Debug layout (opcional): acrescentar `&dia23debug=1` após deploy

## Abertos pós-fase (não reabrem gate TVDE)

| ID | Item | Onde |
|----|------|------|
| **TW-DIA23-1** | Micro tweaks layout | [`TODOdoDIA.md`](../TODOdoDIA.md) painel **PRÓXIMA SESSÃO** |
| **F-NAV-1** | Waze abre no aceite **e** ao iniciar viagem | `DriverDashboard.tsx` · `ActiveTripActions.tsx` |
