# TODO futuro — pós-auditoria (ChatGPT hard audit + Cursor)

Documento vivo: ideias **sem implementação obrigatória** até decisão conjunta.  
Última entrada inicial: consolidação do relatório externo + auditorias automáticas possíveis neste ambiente.

---

## A. Consustanciação — Hard audit ChatGPT (só ideias, sem código)

### A.1 Arquitectura

- Veredito: sólida, consistente, escalável em fase inicial; sem anti-patterns graves, coupling perigoso ou hacks estruturais.

### A.2 Pontos críticos (reais)

| Severidade         | Tema                   | Ideia central                                                                                                                                                                                                                        |
| ------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Crítico**        | **OTP / roles**        | Login com **efeitos laterais** (alterar `role` / estado). Operação **não idempotente**, pouco previsível, pouco explícita → bugs difíceis, suporte difícil, divergência entre ambientes. **Único risco estrutural sério** destacado. |
| **Alto (futuro)**  | **Tenant enforcement** | JOIN obrigatório bem aplicado **onde já existe**; risco = **queries novas** `select(Trip).where(...)` **sem** JOIN/`partner_id` → fuga silenciosa.                                                                                   |
| **Alto (ops)**     | **Logs ≠ sistema**     | Há eventos e formato legível; falta **correlação** (ex. trace por request, agrupamento) para reconstruir incidentes.                                                                                                                 |
| **Médio**          | **Runner**             | Ainda depende de **config humana** / conhecimento do dev → piloto com não-técnico limitado.                                                                                                                                          |
| **Médio (futuro)** | **UI**                 | Risco de **duplicar regras** no React (“se status = x…”) e afastar o backend como source of truth.                                                                                                                                   |

### A.3 Coerência / decisão de produto

- **“Current partner” vs dados históricos:** viagens atribuídas pela **afiliação actual** do motorista; pode colidir com relatórios históricos, billing, disputas — é **decisão de produto** a documentar e validar com negócio.

### A.4 Implementação e testes

- Backend/FE/Runner: qualidade boa para a fase; ghost code não é prioridade.
- Testes: faltam mais cenários de **misuse**, **edge cases humanos**, comportamento inesperado.

### A.5 O que pode partir em produção (top 3 citados)

1. OTP + roles
2. Query nova sem filtro tenant
3. CORS / config / env (deploy)

### A.6 Maturidade e score (referência externa)

- Sistema **pronto para piloto controlado** (não MVP frágil).
- Score global indicativo **~8/10** (áreas detalhadas na mensagem original).

### A.7 Conclusão externa

- Nada a **bloquear** piloto; próximo problema tendencialmente **comportamento e escala**, não “código mal feito”.

---

## B. Auditoria Cursor (o que foi possível ver no repo)

### B.1 `Trip` sem JOIN a `Driver` / `partner_id`

É **normal e esperado** na maior parte do motor (viagens por `trip_id`, passageiro, motorista autenticado, admin global, timeouts, dispatch). O risco do audit é **código novo** que exponha listagens agregadas **multi-tenant** sem o padrão `partner_queries` / `partners_admin.partner_metrics`.

**Amostra de ficheiros com `select(Trip)` (não é lista de erros):**

- `app/services/trips.py`, `offer_dispatch.py`, `trip_timeouts.py`, `system_health.py`, `admin_metrics.py`, `driver_location.py`, `partner_queries.py`, `partners_admin.py`, routers `admin`, `passenger_trips`, `driver_trips`, `debug_routes`, `ws`, `dev_tools`.

**TODO futuro:** guideline em doc ou checklist em PR: _novas queries que filtram por frota → obrigar revisão de padrão JOIN + `partner_id`._

### B.2 Request ID vs logs

- Existe **`RequestIDMiddleware`**: `X-Request-ID` + `request.state.request_id` por pedido HTTP.
- **`log_event` / logs operacionais** não referenciam automaticamente esse ID nos eventos (grep não mostra ligação).

**TODO futuro:** propagar `request_id` (ou trace) para `log_event` onde fizer sentido, ou documentar limitação até haver stack de observabilidade.

### B.3 OTP — localização para trabalho futuro (sem mudança agora)

- Lógica em `backend/app/api/routers/auth.py` (`verify_otp`, `login` BETA) + `app/schemas/auth.py`.
- **TODO futuro:** ADR ou doc “contrato OTP”: idempotência desejada, quando pode mutar `User.role`, ambientes (dev/prod).

---

## C. Auditorias que **não** consigo executar aqui — preciso de ti / ferramentas externas

| O quê                                   | Porquê                             | O que podes fazer / trazer                                                   |
| --------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------- |
| **Pentest / segurança**                 | Sem ambiente alvo nem scope        | Resultado de ferramenta ou auditor terceiros                                 |
| **Carga / latência**                    | Sem deploy + tráfego real          | Métricas Render / k6 / Artillery se correres                                 |
| **Billing / disputas históricas**       | Regra de negócio                   | Decisão explícita: relatórios por “frota à data da viagem” vs “frota actual” |
| **OpenAPI completo para G006 alargado** | Posso gerar se correres o servidor | Export `openapi.json` com API a correr e colar ou commitar em `docs/`        |
| **Stripe webhooks em produção**         | Segredos / eventos reais           | Logs de um evento de teste após deploy                                       |

**TODO futuro:** quando tiveres outputs, anexar referência (ficheiro ou secção neste doc).

---

## D. Lista acumulada de TODOs (para decidir prioridade)

- [ ] **OTP/roles:** contrato explícito, testes de idempotência/mutação, endurecimento prod (A.2 crítico).
- [ ] **Guideline queries tenant:** PR checklist para novos `Trip` multi-tenant (A.2 / B.1).
- [ ] **Observabilidade:** correlacionar logs com `request_id` ou stack (A.2 / B.2).
- [ ] **Runner:** menos config manual / auto-discovery (A.2).
- [ ] **UI:** política “zero regras de negócio no React” (A.2).
- [ ] **Produto:** documentar afiliação histórica vs actual (A.3).
- [ ] **Testes:** misuse, edge cases humanos (A.4).
- [ ] **Deploy:** runbook CORS/env (A.5).
- [ ] **G006 alargado:** inventário OpenAPI (C).
- [ ] **Inputs externos:** preencher secção C quando tiveres resultados.

---

## E. Reporte curto para decisão

1. **Nada disto obriga código já** — é inventário para **priorizar** com calma (ex. depois do passeio com o Buga).
2. **Primeiro alavanca estrutural** se quiseres reduzir risco: clarificar **OTP/roles** (comportamento + testes).
3. **Segundo:** observabilidade mínima (**request_id → logs**) ou aceitar risco até incidente.
4. **Terceiro:** guideline **tenant** em reviews + decisão de produto **histórico vs frota actual**.
5. O restante (runner, UI, E2E, OpenAPI) encaixa em **melhoria contínua** já alinhada com `IMPLEMENTATION_REPORT_C009_K007.md`.

Quando quiseres **endereçar**, escolhemos 1–2 linhas de trabalho por iteração para não espalhar.
