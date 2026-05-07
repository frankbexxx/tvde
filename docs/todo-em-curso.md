# Em curso — quadro operacional

Vista única para saber sempre o que está em execução, no mesmo formato em todas as sessões.

---

## Agora (2026-05-06 · após merge #258)

- [x] **Onda web #258** em `main` (`79d9ff6`): partner drawer com conteúdo mínimo real; motorista header compacto + polish menu + rating/pagamento concluído; login build label; AppHeaderBar papel + ref conta.
- [ ] **Smoke de validação (fim do dia ou quando testares):** confirmar os quatro painéis partner, fluxo motorista relevante, linha de versão no login, pastilhas no header — anotar só o que falhar.
- [ ] **Fila «até ao fim» (ver secção abaixo):** docs ENV → segurança Render → Stripe test → opcional E2E / admin touch targets.

### Rasto vivaço (não bloqueia a fila acima)

- [ ] **Top 3 Manel** — ranking final quando houver; spec em [`docs/product/DRIVER_HOME_TOP3_MANEL.md`](product/DRIVER_HOME_TOP3_MANEL.md); polish `DRIVER_MENU_SPEC.md` §7.4 / §7.8.
- [ ] **Zonas v1:** geo por `zone_id`, orçamento extra >2/dia via partner (se aplicável).
- [ ] Linha rotacional v2 (mais mensagens / dados internos sem APIs externas).
- [ ] Planeamento **login social** (onda própria).
- [ ] [OPS] **Auditoria projecto** — [`docs/audit/PROJECT_AUDIT_2026-05-02.md`](audit/PROJECT_AUDIT_2026-05-02.md) quando for o foco do dia.

---

## Plano por sessões — fila **1–9** (quinta+sexta) até fechada

_Lista original: smoke → header motorista → follow-ups smoke → partner drawer → driver drawer → segurança → Stripe test → docs → E2E opcional._

| Sessão | Foco | Estado |
|--------|------|--------|
| **S0** (feita) | Código **#258**: itens **2**, **4**, **5** (mínimo) + extras login/header/rating | **Merge `main`** |
| **S1** | **Tu:** smoke fim do dia (sequencial); lista curta de bugs → **item 3** | **Pendente** |
| **S2** | **Docs item 8:** `grep` repo por env/Stripe desalinhados; PR só docs → `ENV_SINGLE_REALITY` | Pendente |
| **S3** | **Ops item 6:** segredos Render, `DATABASE_URL`, `/health` | Pendente (humano) |
| **S4** | **Ops item 7:** Stripe test mode; revert mock | Pendente (humano) |
| **S5** | **Opcional item 9:** E2E (ex. partner drawer) **ou** `UI_VISIBILITY` Passo 1 (admin `min-h-11`) | Pendente |

**Regra:** não reabrir **S0** salvo regressão; **S1** alimenta prioridade do **S2+** se aparecer bug de produto.

---

## Hoje (2026-05-01) — fechado

- [x] Pesquisa benchmarks (RSG, Uber web, Lyft destination filter) + notas visuais.
- [x] Reunião Manel: QR, portagens (princípios), ecrã persistente, wireframes, lista viagens + 2 anos, registo criminal 3/3 meses, fila LIS; princípio produto **não restritivo**.
- [x] Documento `docs/research/driver-app-benchmarks.md` + actualização `DRIVER_MENU_SPEC.md`.
- [x] Código zonas v1 (backend + web) mergeado em `main`; `.gitignore` `test-results/` (Playwright).

---

## Amanhã (2026-05-03) — primeira sessão útil

- [ ] **Auditoria projecto (agente)** — ler [`docs/audit/PROJECT_AUDIT_2026-05-02.md`](audit/PROJECT_AUDIT_2026-05-02.md) na **primeira** abertura do dia (output externo; **não** para hoje).
- [x] [OPS] **Smokes curtos em série** — `TODOdoDIA.md` painel **2026-05-02** fechado 2026-05-03 (nav + P1–P5 §7.8 + build).
- [x] [DOCS] **Portagens** — spec mínima em [`docs/product/PORTAGENS_SPEC.md`](product/PORTAGENS_SPEC.md) (merge `main` 2026-05-03).
- [x] [CÓDIGO] **Zonas v1 — extensão de prazo (partner)** — merge `main` 2026-05-03; **pendente** na mesma linha: geo `zone_id`, políticas extra-orçamento.
- [x] Menu motorista — detalhe de viagem em modal com ação de ocorrência (histórico com percurso + «Mostrar mais»).
- [x] Categorias + «dois destinos por dia» — contrato + implementação v1 núcleo em `main`.
- [ ] Linha rotacional v2 (mais mensagens ou dados internos da app, ainda sem APIs externas).
- [ ] Planeamento de login social (Google e afins) como onda própria.

---

## Backlog (não bloquear agora)

- Theming/polish amplo de superfície e iconografia final.
- Refactors estruturais sem impacto directo em operação.

---

_Relacionado: [`TODOdoDIA.md`](../TODOdoDIA.md) painel **2026-05-06** · [`meta/UI_VISIBILITY_IMPLEMENTATION_TODO.md`](meta/UI_VISIBILITY_IMPLEMENTATION_TODO.md) · PR **#258**._

_Última revisão: **2026-05-06** (alinhamento pós-merge web #258)._
