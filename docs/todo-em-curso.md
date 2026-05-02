# Em curso — quadro operacional

Vista única para saber sempre o que está em execução, no mesmo formato em todas as sessões.

---

## Agora (foco único)

- [x] Regra **2 zonas** confirmada com Manel (pernadas no caminho **não** consomem uso; consumo na 1.ª **completed** na zona-alvo) — ver `docs/product/DRIVER_MENU_SPEC.md` + `docs/research/driver-app-benchmarks.md`.
- [ ] **Top 3 Manel** — especificação canónica em [`docs/product/DRIVER_HOME_TOP3_MANEL.md`](product/DRIVER_HOME_TOP3_MANEL.md); fluxo **dois passos** com `VITE_DRIVER_HOME_TWO_STEP` em `main`; polish contínuo (ver `DRIVER_MENU_SPEC.md` §7.4 / §7.8).
- [x] Contrato técnico v1 definido em `docs/product/DRIVER_MENU_SPEC.md` (zona dinâmica + exceções + budget diário).
- [x] Linha rotacional no topo (`AppHeaderBar`, hints estáticos — v1).
- [x] Spec menu motorista: `docs/product/DRIVER_MENU_SPEC.md`.
- [x] Categorias: copy no menu + label PT; integração GET/PATCH já existente — evolução depende de regras de negócio.
- [x] **Zonas v1 núcleo em `main`** — API budget/sessions, consumo na 1.ª viagem concluída após «cheguei», menu web + `GET /sessions/open` (#211–#213). **Também em `main`:** expiração `deadline_at`, `GET /catalog`, `ops_note_pt` (LIS). _Fase seguinte: extensão partner, **geo** por `zone_id`._

---

## Hoje (2026-05-01) — fechado

- [x] Pesquisa benchmarks (RSG, Uber web, Lyft destination filter) + notas visuais.
- [x] Reunião Manel: QR, portagens (princípios), ecrã persistente, wireframes, lista viagens + 2 anos, registo criminal 3/3 meses, fila LIS; princípio produto **não restritivo**.
- [x] Documento `docs/research/driver-app-benchmarks.md` + actualização `DRIVER_MENU_SPEC.md`.
- [x] Código zonas v1 (backend + web) mergeado em `main`; `.gitignore` `test-results/` (Playwright).

---

## Amanhã (2026-05-03) — primeira sessão útil

- [ ] **Auditoria projecto (agente)** — ler [`docs/audit/PROJECT_AUDIT_2026-05-02.md`](audit/PROJECT_AUDIT_2026-05-02.md) na **primeira** abertura do dia (output externo; **não** para hoje).
- [ ] [OPS] **Smokes curtos em série** — ver `TODOdoDIA.md` painel **2026-05-02**: um passo de cada vez após «bom dia»; pausas entre passos; concentração para blocos longos **após 10h** se fizer falta.
- [ ] Spec técnica mínima **portagens** (ou primeira fatia de implementação).
- [ ] **Zonas v1 — fase 2** — extensão partner, job expiração, catálogo `zone_id` (conforme §7 `DRIVER_MENU_SPEC.md`).
- [x] Menu motorista — detalhe de viagem em modal com ação de ocorrência (histórico com percurso + «Mostrar mais»).
- [x] Categorias + «dois destinos por dia» — contrato + implementação v1 núcleo em `main`.
- [ ] Linha rotacional v2 (mais mensagens ou dados internos da app, ainda sem APIs externas).
- [ ] Planeamento de login social (Google e afins) como onda própria.

---

## Backlog (não bloquear agora)

- Theming/polish amplo de superfície e iconografia final.
- Refactors estruturais sem impacto directo em operação.

---

_Última revisão: 2026-05-02 (UI driver: menu no topo, GPS compacto, copy estimativa no menu — ver `DRIVER_MENU_SPEC` §7.8 smoke)._
