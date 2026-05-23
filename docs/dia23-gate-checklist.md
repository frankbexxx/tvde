# Dia 23 — gate TVDE 1–9

Referência: `C:\dev\_greenshots\dia 23\` · alvo caixa+botões = **TVDE 4**.

| ID | Fluxo | Critério | Estado |
|----|-------|----------|--------|
| TVDE 1 | Pass idle + drv wait | Mapa full, caixa compacta, cantos iguais | Smoke pendente |
| TVDE 2 | Drv offline | Sem Estatuto; pino + «offline» | Smoke pendente |
| TVDE 3 | Pass planning | Sem copy duplicada recolha | Smoke pendente |
| TVDE 4 | Pass confirm | Referência intacta (Confirmar+Alterar dentro) | Smoke pendente |
| TVDE 5 | Pass search + drv offer | Cancelar dentro; oferta compacta | Smoke pendente |
| TVDE 6 | Ambos searching | Botões lado a lado, sheet baixa | Smoke pendente |
| TVDE 7 | Ambos en route | Mapa full, popup sobre mapa | Smoke pendente |
| TVDE 8 | Ambos ongoing | Terminar dentro da caixa (drv) | Smoke pendente |
| TVDE 9 | Pass rating + drv post | Compacto, mapa visível | Smoke pendente |

## Comandos (automático)

- [x] `npm run build` — OK
- [x] `npx playwright test e2e/driver-passenger-flow.spec.ts` — 4/4

## Comandos

## URLs (Render — smoke Frank)

- Passageiro: https://tvde-app-j51f.onrender.com/passenger?demo=1
- Motorista: https://tvde-app-j51f.onrender.com/driver?demo=1
- Debug layout (opcional): acrescentar `&dia23debug=1` após deploy

**Build/e2e OK não fecha o gate** — só Frank confirma «compact enough».
