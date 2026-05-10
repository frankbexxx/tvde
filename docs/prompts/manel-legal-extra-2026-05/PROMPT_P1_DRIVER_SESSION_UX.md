# PROMPT P1 — Sessão motorista (som + nocturno + ecrã activo)

**Backlog:** itens 1–3.

## Objectivo

- **Som:** três momentos distintos — (a) novo pedido visível na lista filtrada; (b) aceitar viagem com sucesso; (c) viagem concluída. Respeitar separador em segundo plano / reduzir ruído óbvio (não obstinado).
- **Nocturno:** seguir `prefers-color-scheme: dark` no arranque e em mudanças (alinhado ao theming `data-theme` existente — slot escuro = `dev`).
- **Ecrã activo:** wake lock **sempre** enquanto o motorista está na shell `/driver` (decisão de produto no backlog), não só durante fases da viagem.

## Critérios de aceitação

- Em `prefers-color-scheme: dark`, tema escuro aplica-se sem necessidade de toggle manual (utilizador ainda pode mudar tema depois, conforme comportamento actual do selector).
- Wake lock activo na sessão motorista quando a API existir; sem erros visíveis quando não existir.
- Sons diferenciáveis nos três eventos (pitch/duração), sem ficheiros externos obrigatórios (Web Audio ou equivalente).

## Fora de âmbito

- Notificações push nativas em background.
- Copy legal de consentimento wake lock.
