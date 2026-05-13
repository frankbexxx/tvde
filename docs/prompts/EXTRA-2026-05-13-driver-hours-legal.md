# Prompt: horas de condução TVDE + bloqueio + aviso (+8 h / +10 h)

**Lista EXTRA:** item **1**. **Dependências:** respostas **1–5** em [`EXTRA-2026-05-13-DECISOES.md`](EXTRA-2026-05-13-DECISOES.md).

## Objectivo

Implementar regra **bloquear motorista** com **> 10 h “condução activa” em 24 h**, **período inactivo obrigatório 11 h**, e **aviso** quando **> 8 h** (rotacional ou banner, conforme decisão 5).

## Fora de âmbito (v1)

- OCR de tachografos ou integração com dispositivos externos.
- Multas legais automáticas ou relatório IMT — só lógica in-app + mensagens.

## Ficheiros prováveis

- **Backend:** novos campos ou tabela agregada (`driver_driving_ledger` ou equivalente); lógica em `accept` / `set online` / listagem de ofertas; eventual `GET /driver/compliance/driving-hours`.
- **Rotacional:** se (a) ou (b) — [`backend/app/api/routers/rotacional.py`](../../backend/app/api/routers/rotacional.py) ou endpoint novo autenticado; feed JSON vs resposta por utilizador.
- **Web:** [`web-app/src/features/driver/DriverDashboard.tsx`](../../web-app/src/features/driver/DriverDashboard.tsx) — banner / estado bloqueado; [`AppHeaderBar`](../../web-app/src/components/layout/AppHeaderBar.tsx) se mensagem global.
- **Specs:** [`DRIVER_MENU_SPEC.md`](../../docs/product/DRIVER_MENU_SPEC.md) ou doc legal curto em `docs/product/`.

## Critérios de aceitação (visíveis)

1. Com utilizador de teste **simulado** acima de 10 h na janela definida: **não** consegue **aceitar** nova viagem; mensagem **clara** no ecrã (PT).
2. Com **8 h–10 h** (simulado): aparece **aviso** conforme decisão (rotacional personalizado ou banner).
3. Após **11 h** de inactividade (definir “inactivo” = sem `ongoing`?): **volta** a poder aceitar (teste automatizado ou manual documentado).
4. **pytest** cobre pelo menos: cálculo de janela, bloqueio em `accept`, desbloqueio após repouso (com relógio injectado ou fixtures).

## Ordem sugerida

1. Modelo + função pura “horas na janela” (TDD).
2. Integração em `acceptTrip` / router motorista.
3. UI bloqueio + copy.
4. Aviso +8 h (canal escolhido na decisão 5).

## Decisões + riscos (item 9 do pedido original)

- **Risco:** definir “condução activa” sem alinhamento legal gera litígio operacional — **bloquear implementação** até Q2 da folha de decisões estar fechada.
- **Risco:** timezone errado → bloqueio uma hora a mais/menos → testes com `Europe/Lisbon` explícito.
