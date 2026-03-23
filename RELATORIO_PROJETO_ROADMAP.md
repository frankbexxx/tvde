# Relatório — Projeto, Roadmap e Caminhos

Documento descritivo (nem genérico nem exaustivo). Estado verificado no código em março de 2026.  
O handoff operacional detalhado continua em **PROXIMA_SESSAO.md**; o **ROADMAP** de referência está em `archive/docs_2026_03_22/ROADMAP.md`.

---

## 1. O que o projeto é hoje

Plataforma **TVDE / ride-sharing** (tipo Uber/Bolt): passageiro pede viagem, motorista aceita e conclui, pagamento com **Stripe manual capture** e **webhook como fonte de verdade** para `payment.status`. Há **Web App** (React, Vite, TypeScript) para validação humana, com painel de log/estado, e **backend FastAPI** com regras operacionais (disponibilidade do motorista, timeouts, ofertas, matching) que já ultrapassam o MVP “só state machine + Stripe” descrito no roadmap original.

O documento vivo de continuidade (**PROXIMA_SESSAO.md**) regista validação em campo (4 telemóveis, rede móvel) e testes Render como concluídos — ou seja, o produto já foi exercido fora do ambiente de secretária.

---

## 2. Alinhamento com o Roadmap

### Fase 1 — Modelo financeiro real

**No roadmap:** pricing engine, integração no `complete_trip`, `distance_km` / `duration_min`, `driver_payout`, sem Connect.

**Na prática:** Implementado. O `complete_trip` recalcula preço, atualiza amount no PaymentIntent quando aplicável, confirma e captura; comissão vem de `driver.commission_percent`. Existem extensões (OSRM opcional, haversine para estimativas) que melhoram a realidade face ao “mock fixo” inicial.

**Conclusão:** Fase 1 **cumprida** no espírito do roadmap; o que falta é refinamento (rotas reais estáveis, testes automatizados), não o esqueleto.

### Fase 2 — Web App MVP validável

**No roadmap:** projeto `web-app`, dashboards passageiro/motorista, polling.

**Na prática:** Existe `web-app/` com fluxos principais, DevTools, e UX extra (offline, log, role por URL). O `web-test-console` foi substituído.

**Conclusão:** Fase 2 **cumprida** e **excedida** em alguns aspetos (observabilidade na UI, guia de testes).

### Fora do roadmap original (mas presentes)

- Timeouts de trip, `is_available`, race condition em `accept_trip`, dispatch/ofertas, cron/admin para jobs, métricas admin, localização do motorista, ratings, cancelamentos com razão, etc. Isto é **crescimento orgânico** do MVP — positivo para demo operacional, mas aumenta superfície a manter.

### Ainda não no roadmap “feito”

- **Confirmação no accept** (`ENABLE_CONFIRM_ON_ACCEPT`): preparação existe; **não ativar** sem decisão de pricing (documento arquivado: `archive/docs_nao_essenciais/STRIPE_CONFIRMACAO_FUTURA.md`).
- **Stripe Connect**, **Alembic**, **push**, **OTP/SMS produção** — explícitos como futuros.

---

## 3. Conclusão (estado do trabalho)

O núcleo prometido no roadmap (**financeiro + UI validável**) está **fechado** no sentido de “funciona de ponta a ponta e foi testado em condições reais”. O projeto **não** está parado num protótipo de laboratório: há deploy (Render, segundo PROXIMA_SESSAO), guias de teste e invariantes financeiras preservadas.

O que **não** está fechado é a **próxima geração**: quando o preço é definitivo, SCA no accept, Connect, e endurecimento de produção (migrations, testes automáticos, refresh de tokens).

---

## 4. Expectativas realistas

| Expectativa                        | Realidade                                                                                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| “MVP demonstrável”                 | Atendida.                                                                                                                                                                |
| “Produção sem dívida”              | Parcial: sem Alembic formal, sem suite de testes, timeouts manuais ou via admin/cron conforme configuração.                                                              |
| “Mesmo roadmap de 2024 sem deriva” | O código **já** inclui features além do texto do ROADMAP arquivado — a documentação deve ser lida como histórico; a verdade operacional está no código + PROXIMA_SESSAO. |

---

## 5. Caminhos possíveis (ordem sugerida)

1. **Decisão de produto/financeiro** — “Quando o preço é definitivo?” (A/B/C no doc de confirmação futura). Sem isto, confirmação no accept é improviso.
2. **Endurecimento** — testes pytest nos serviços críticos (`trips`, Stripe, timeouts); Alembic quando o schema estabilizar.
3. **Operação** — scheduler fiável para `run-timeouts` / expiração de ofertas em produção (já há peças: cron router, admin).
4. **Escala** — SSE/WebSocket em substituição parcial do polling na Web App quando o número de clientes justificar.
5. **Monetização motorista** — Stripe Connect após modelo de comissão e fluxo de pagamento estarem congelados.

---

## 6. Verificação de código — dead code e duplicação

### Dead code (definido como “definido mas nunca referenciado fora do próprio módulo”)

| Item                      | Local                      | Nota                                                                   |
| ------------------------- | -------------------------- | ---------------------------------------------------------------------- |
| `create_payment_for_trip` | `app/services/payments.py` | Reservado a fluxos alternativos; não há chamadas.                      |
| `calculate_driver_payout` | `app/core/pricing.py`      | Comissão real está em `driver.commission_percent` + lógica em `trips`. |
| `emit_many`               | `app/events/dispatcher.py` | Nunca chamado; só `emit`.                                              |
| `DomainEvent`             | `app/events/base.py`       | Classe órfã; eventos usam Pydantic (`TripStatusChangedEvent`, etc.).   |

Não são bugs; são **candidatos a remoção ou marcação explícita “FUTURO”** para não confundir quem lê o repo.

### Duplicação

| Tema                  | Onde                                                                                | Comentário                                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Haversine             | `app/utils/geo.py` (`haversine_km`) vs `app/services/matching.py` (`_haversine_km`) | Duas implementações da mesma fórmula. **Refactor leve:** `matching` importar `haversine_km` de `geo` e remover `_haversine_km`. |
| Serialização de trips | `app/api/serializers/trip.py`                                                       | Já **centralizada** — bom padrão; evita divergência entre routers.                                                              |

### Web App

- `usePolling(fn, deps, enabled)` está em uso com `deps` explícitos — alinhado com evitar loops de refetch.
- Não foi feita varredura exaustiva de componentes não usados; o risco principal no frontend é **ficheiros legacy** após refactors (menor que no backend).

---

## 7. Onde está cada coisa

| Necessidade               | Onde ir                                                    |
| ------------------------- | ---------------------------------------------------------- |
| Continuar amanhã          | `PROXIMA_SESSAO.md`                                        |
| Roadmap histórico         | `archive/docs_2026_03_22/ROADMAP.md`                       |
| Confirmação Stripe futura | `archive/docs_nao_essenciais/STRIPE_CONFIRMACAO_FUTURA.md` |
| Testes manuais            | `GUIA_TESTES.md`                                           |
| Este relatório            | `RELATORIO_PROJETO_ROADMAP.md`                             |

---

_Relatório gerado para apoio à decisão e à próxima sessão; não substitui o código nem o handoff em PROXIMA_SESSAO.md._
