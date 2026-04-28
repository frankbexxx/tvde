# Cruise Audit Checklist 2026-04-28

Checklist de auditoria profunda por sequência, para executar em modo autónomo enquanto o Frank está fora.

---

## 1) Pré-audit (baseline)

- [x] Confirmar branch de trabalho e estado git limpo.
- [x] Confirmar escopo: `passenger` + `driver` + integração mínima (header/nav/e2e).
- [ ] (Opcional) Capturar baseline de testes no momento do audit.

---

## 2) Sequência A — Passenger (fluxo C+B)

- [x] Verificar ordem UX: título acima da pesquisa, mapa e CTA coerentes.
- [x] Verificar estados de planeamento (`idle`, `planning`, `confirming`) e copy não redundante.
- [x] Verificar transição texto -> mapa -> confirmação sem bloqueio de ação.
- [x] Verificar espaços verticais (gaps) entre header, pesquisa, título e mapa.
- [ ] Validar smoke manual em device (pendente humano).

---

## 3) Sequência B — Driver (fluxo crítico)

- [x] Verificar ações por estado (`assigned`, `accepted`, `arriving`, `ongoing`).
- [x] Verificar gate de proximidade para iniciar viagem.
- [x] Verificar comportamento sem detalhe polled (fallback/sincronização).
- [x] Verificar hints de polling e próxima ação sem ambiguidade.
- [ ] Validar smoke manual `aceitar -> chegar -> iniciar -> terminar` (pendente humano).

---

## 4) Sequência C — Integração / regressões cruzadas

- [x] Verificar impacto de alterações de header em testes existentes (E2E selectors).
- [x] Verificar compatibilidade de assets (wordmark em `web-app/public/brand`).
- [x] Verificar se há dependência de texto antigo removido (`TVDE`) em automação.
- [ ] Validar E2E após ajuste de selectors (ainda não aplicado neste audit).

---

## 5) Saída do audit

- [x] Produzir relatório com findings priorizados (P1/P2/P3).
- [x] Separar claramente: bloqueadores vs melhorias.
- [x] Definir ordem de execução recomendada para o próximo bloco.

