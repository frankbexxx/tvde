# Backlog de fixes UX — motorista

Lista incremental: cada entrada descreve o fix; estado em **Estado** quando aplicável.

**Próximo na fila:** **USER-SHELL-B** (Cluster B / InfoPanel) → VAM clusters **C–F** → **TWEAKS_UX** (**TW-**). Inventário motorista: [`driver-home-inventory.md`](driver-home-inventory.md).

---

## Registo de sessão — wrap-up

**Sessão 2026-05-15 (merge #319, `7d31dbe`):**

- **Tabela E** — decisões bulk + **FIX-007** (mapa cheio em viagem, barra 4 ícones sempre, resumo compacto) + **FIX-008** (marcador → painel aceitar).
- Smoke manual Frank: fluxo driver↔passageiro **funcional**; tweaks visuais adiados a **TW-**.
- E2E `driver-passenger-flow` (4/4) alinhado ao painel no marcador + «Continuar» pós-conclusão.

**Sessão anterior (merge em `main`):**

- **FIX-003 → FIX-006**: micro OFF vermelho, Tabela C, folha compacta no mapa cheio.
- Tabelas **A–D fechadas** em inventário.

---

## Sessão A–D (fechada)

| # | Item | Estado |
|---|------|--------|
| 1 | Smoke /driver em telemóvel | **Feito** — viagem driver↔passageiro OK; sem re-smoke obrigatório. |
| 2 | Inventário A–D alinhado ao código | **Feito** — [`driver-home-inventory.md`](driver-home-inventory.md). |
| 3 | TODO-LEGADO `!driverBottomNav` | Pendente (opcional, não bloqueia E). |
| 4 | Copy «Sem viagens» vs «Sem pedidos» | Pendente (opcional). |

---

## Tabela E — fechada (funcional)

1. **Decisões em bloco** — registadas no inventário (três pilares + matriz bulk).
2. **FIX-007 / FIX-008** — entregues (**#319**).
3. **Refinamento pixel** — fila **TWEAKS_UX** (**TW-**), não reabre decisões bulk.

---

## USER_SHELL — shell User unificado (G01–G27)

**Premissas (Frank, 2026-05-19):** (1) Driver/Passenger no mesmo shell User; (2) caixas modulares (`InfoPanel`, `ActionPanel`, …); (3) pontos como **G03** = mesma métrica que motorista, não tweak isolado.

**Grelha e VAM:** [`screenshot-tweaks-g-matrix.md`](screenshot-tweaks-g-matrix.md). **Painel operacional:** [`TODOdoDIA.md`](../../TODOdoDIA.md) **2026-05-19**.

### Cluster A — cabeçalho (VAM fechado)

| ID | Decisão | Implementação |
|----|---------|---------------|
| **G03** | **ACERTAR** — Perfil/Definições fora do topo no passageiro | `userCompact` em `/passenger` |
| **G04** | **ACERTAR** — header compacto; **sem** pastilha «PASSAGEIRO» | Mesma variante que motorista FIX-002 |
| Shell menu 4 ícones | **Manter** | Sem alteração neste PR |
| Shell faixa dicas | **Manter** | Já no layout compact |

**Entrega código:** **USER-SHELL-A** (ver painel TODO). Smokes prod **S-02** legenda **B** pode deixar de exigir pastilha PASSAGEIRO no header — validar role no menu ou fluxo.

### Cluster B — InfoPanel (VAM fechado + código USER-SHELL-B)

Módulos: [`InfoPanel.tsx`](../../web-app/src/components/layout/InfoPanel.tsx), [`HintLine.tsx`](../../web-app/src/components/layout/HintLine.tsx). Passageiro: [`PassengerStatusCard.tsx`](../../web-app/src/features/passenger/PassengerStatusCard.tsx) sem duplicar `StatusHeader` em procura/viagem. Motorista: hints G07/G11/G20 via `HintLine`.

### Clusters C–F

VAM pendente com Frank. **TW-01…06** mapeiam para B–E (tabela na grelha G).

---

## TWEAKS_UX

Ajustes **só** de composição visual (texto, cores, densidade, espaçamento). **Não** alterar: marcador → painel → aceitar; mapa cheio em viagem; barra 4 ícones sempre.

**Lista canónica:** painel **2026-05-15** em [`TODOdoDIA.md`](../../TODOdoDIA.md) — **TW-01** (SlideToAccept / painel aceitar ocupa demais), **TW-02** (copy painel), **TW-03** (resumo compacto), **TW-04** (stack inferior), **TW-05** (pós-screenshots), **TW-06** (lista multi-ofertas, N/A).

**Entrada:** screenshots Frank (**próxima sessão**).

**TW-05 / dia 23:** fase fechada **2026-05-23** — residual **TW-DIA23-1** (micro layout). Gate dia 23 arquivado (auditoria Lote 4).

**F-NAV-1 (aberto):** Waze abre no aceite (`DriverDashboard`) e ao iniciar viagem (`ActiveTripActions`) — unificar política; ver grelha **G12/G19**.

---

## FIX-003 — Micro disponibilidade: estado OFF em vermelho (não cinza)

**Contexto:** o micro on/off (`DriverMapAvailabilityMicroToggle`) está funcional; em **disponível (on)** o indicador **verde** está correcto. Em **offline (off)** o indicador usa **cinza**, o que é **ambíguo** (parece neutro / desactivado).

**Comportamento desejado:** quando **offline**, o indicador deve ser claramente **vermelho** (ou equivalente semântico «não disponível»), mantendo o verde para **disponível**. Sem mudar a lógica de toque (map-touch online mantém-se onde aplicável).

**Referência:** `web-app/src/features/driver/DriverMapAvailabilityMicroToggle.tsx`.

**Estado:** entregue (indicador OFF com `destructive` / vermelho semântico).

---

## FIX-001 — Disponibilidade: map-touch online + micro-controlo on/off no bordo do mapa

**Problema / contexto:** a faixa “Disponível — offline” fica invisível ou inacessível com a nav fixa por cima (`z-40` vs conteúdo, `pb-0` no palco imersivo).

**Comportamento desejado:**

- **Passar a disponível (online):** mantém-se o fluxo actual de **toque no mapa** (`mapTapGoesOnline`), sem regressão.
- **Passar a offline:** deixa de depender da faixa inferior tapada; passa a ser um **único** micro-controlo tipo **on/off** (um ícone / botão compacto com **dupla função** conforme o estado), no **bordo do mapa**, **por cima do mapa** (overlay), não por baixo da barra de tabs.
- **UI:** um só controlo pequeno no perímetro (ex.: canto), legível e clicável acima dos tiles; reflecte disponível vs offline (e eventualmente “em viagem” se aplicável); o toque quando **disponível** passa a **offline**; quando **offline**, o online continua a ser preferencialmente pelo **map-touch** (comportamento já acordado), salvo refinamento futuro do mesmo controlo.

**Notas para implementação futura:** definir canto, acessibilidade (`aria-label`, estado anunciado), e não bloquear gestos do mapa excepto na hit-area do micro-controlo.

**Estado:** comportamento entregue; ajuste visual do estado OFF em **FIX-003**.

---

## FIX-002 — Header global motorista: desvio de ruído para Perfil + data junto ao wordmark + dicas subidas

**Inventário de referência:** [`driver-home-inventory.md`](driver-home-inventory.md) (tabela A, D-G-01 … D-G-09).

**Decisões (confirmadas):**

| ID | Decisão | Detalhe |
|----|---------|--------|
| D-G-01 | **Manter** | Wordmark / marca no header global. |
| D-G-02 | **Não** — opção **(a)** | Nome/telemóvel da sessão: passar para **Menu → aba Perfil** (sair do topo). |
| D-G-03 | **Não** — **(a)** | Pastilha papel (ex. MOTORISTA): **Menu → Perfil**. |
| D-G-04 | **Não** — **(a)** | Ref. «Conta · …»: **Menu → Perfil**. |
| D-G-05 | **Manter** — com **(b)** | Data e hora: mantêm-se no header, mas **em frente / na linha do wordmark** (layout compacto ao lado da marca, não na coluna de meta longa). |
| D-G-06 | **Não** — **(a)** | Botão Perfil: **Menu → Perfil** (ou equivalente dentro dessa aba). |
| D-G-07 | **Não** — **(a)** | Botão Definições: **Menu → Perfil** (acesso agrupado com identidade). |
| D-G-08 | **Manter** — reposicionar | Faixa de dicas rotativas: **subir para junto do bloco wordmark** (menos stack vertical no topo), com o objectivo explícito de **aumentar a área útil do mapa** no ecrã principal. |
| D-G-09 | **Manter** | Menu lateral (gaveta). |

**(a)** = informação / acção passa para **dentro do Menu, aba Perfil**.  
**(b)** = **em frente do wordmark** (mesma faixa visual que a marca).

**Aviso de produto (não é bloqueio, só atenção):** concentrar D-G-02…04 e D-G-06…07 na aba Perfil pode exigir **hierarquia clara** nessa aba (identidade vs acções); definições deixam de ser **um toque** no cabeçalho global.

---

## FIX-004 — Tabela C: remoções no passo 1 (D-S1-01, D-S1-02, D-S1-06, D-S1-08)

**Inventário:** [`driver-home-inventory.md`](driver-home-inventory.md) (Tabela C).

**Entregue:** texto intro (D-S1-01); botão Menu e toggle Estado no passo 1 só com `!driverBottomNav` (D-S1-02, D-S1-06); faixas violeta de simulação OSRM no ecrã motorista (D-S1-08). Contexto da simulação em DEV: uma linha em **DevTools** (modo motorista, `mockLocation` activo) — `web-app/src/features/shared/DevTools.tsx`.

---

## FIX-005 — Tabela C: D-S1-21 (vazio mínimo + lista abaixo do mapa + marcadores)

**Entregue:** no `driver-home-step1`, lista / loading / vazio passam a **irmãos** por baixo do cartão do mapa; estado vazio compacto; com **2+** ofertas filtradas, marcadores numerados no mapa (`MapView.pendingOfferPickups`, até 8 recolhas); com **1** oferta, mantêm-se recolha + destino como antes.

---

## FIX-006 — Palco mapa cheio + vista scroll: vazio «À espera de viagens» compacto

**Contexto:** no `driverMapStageLayout` (e na coluna scroll sem palco), o vazio ainda usava `StatusHeader` em destaque (`primary`, não compacto) + folha com `max-h` muito alto, diferente do passo 1.

**Entregue:** bloco mínimo alinhado ao passo 1; loading com `StatusHeader` compacto; `max-h` da folha sem lista mais baixo. Código: `DriverDashboard.tsx` (folha `#driver-main-scroll` no palco + bloco paralelo sem `driverMapStageLayout`).

---

## FIX-007 — Barra de 4 ícones sempre + mapa cheio em viagem

**Decisão (D-E-22, D-E-10–12):** os quatro ícones (Início, Rendimentos, Caixa, Menu) permanecem visíveis **durante** a viagem; botões da viagem (Iniciar, Cancelar, …) ficam **por cima** da barra, não a substituem. Excepção: **Menu** aberto (gaveta) — barra pode esconder-se.

**Comportamento desejado:**

- Com `activeTripId`: manter `driverMapStageLayout` (mapa a ecrã cheio) em vez de layout scroll com mapa pequeno.
- `bottomChrome`: `ActiveTripActions` + `DriverBottomNav` (quando `!menuOpen`).
- Resumo da viagem: variante **compacta** em overlay sobre o mapa (não cartão alto a meio do scroll).
- Rota recolha→destino no mapa quando há detalhe da viagem (`acceptedDetailFallback` ou mock DEV).

**Código:** `DriverDashboard.tsx` (`driverMapStageLayout`, `bottomChrome`, overlay `ActiveTripSummary`).

**Estado:** entregue.

---

## FIX-008 — Aceitar ao toque no marcador (mapa fixo à espera)

**Decisão (D-E-01–08):** à espera, o mapa **não muda** de layout quando chegam pedidos; marcadores no mapa; **toque no marcador** abre painel com detalhes + aceitar/recusar/fechar. Lista na folha deixa de ser modo principal.

**Comportamento desejado:**

- Uma ou várias ofertas: marcadores numerados (`pendingOfferPickups` com `tripId`).
- Toque no marcador → painel inferior com `RequestCard` + fechar.
- Sem selecção: folha mínima («Toca num marcador no mapa») ou vazio compacto.
- Remover faixa D-E-08 («N pedidos no mapa») como entrada principal.

**Código:** `MapView.tsx` (marcadores clicáveis), `DriverDashboard.tsx` (`selectedOfferTripId`, folha `#driver-main-scroll`).

**Estado:** entregue.

**Referência histórica (slider após painel):** prompt EXTRA aceitar compacto — arquivado (auditoria docs Lote 2); ver FIX acima.

---

## TODO — Barra inferior passageiro e parceiro

**Regra:** mesma que motorista — 4 ícones **sempre** no ecrã principal; excepção Menu aberto.

**Âmbito:** passageiro e parceiro numa sessão separada (não bloqueia FIX-007/008 motorista).

**Estado:** Por iniciar.

---

## TODO-LEGADO — `!driverBottomNav` (DriverDashboard)

**Não bloqueia** entregas Manel; hoje `isDriverBottomNavEnabled()` em `web-app/src/config/driverHomeFeatures.ts` está fixo a `true`, pelo que os ramos `!driverBottomNav` estão **inactivos** até alguém alterar o config.

**Para uma sessão futura:**

1. **Auditoria:** confirmar se algum build, env ou teste usa `false`; se ninguém depende, candidatar a **remover ramos** e simplificar testes.
2. **Se o flag voltar a ser real:** antes de produção sem bottom nav, garantir **Menu** e **disponibilidade** acessíveis sem D-S1-02 / D-S1-06 (ver nota 1 na Tabela C do inventário).
3. **Critério de fecho:** um único caminho Manel **ou** documentação + testes explícitos para o modo sem bottom nav.

---

## Como incrementar

Quando identificares um novo fix, adiciona uma secção `## FIX-NNN — …` abaixo, com contexto + comportamento desejado em bullet points.
