# Backlog de fixes UX — motorista

Lista incremental: cada entrada descreve o fix; estado em **Estado** quando aplicável.

**Próximo na fila (próxima sessão):** validação em dispositivo real (passo 1 + mapa cheio); sincronizar **inventário detalhado** Tabela C com o código; **TODO-LEGADO** `!driverBottomNav` quando couber. Ver **Registo de sessão** abaixo.

---

## Registo de sessão — wrap-up

**O que ficou feito (merge em `main`):**

- Plano motorista **FIX-003 → FIX-005**: micro OFF vermelho, remoções Tabela C (D-S1-01/02/06/08), D-S1-21 no passo 1 (lista abaixo do mapa, vazio mínimo, marcadores multi-oferta em `MapView`), nota OSRM em DevTools, secção **TODO-LEGADO** neste backlog.
- **Folha «À espera de viagens» no mapa cheio** (`driverMapStageLayout`) e na vista com scroll: mesmo padrão compacto do passo 1 (sem `StatusHeader` XL em vazio; `max-h` da folha sem pedidos já não usa 46dvh/400px).

**Parar aqui** — próxima sessão: lista em **Amanhã (TODOs alinhados)**.

---

## Amanhã (TODOs alinhados)

| # | TODO | Notas |
|---|------|--------|
| 1 | **Smoke /driver em telemóvel** | Passo 1 (se activo), mapa cheio: vazio, loading, 1 pedido, vários pedidos; micro on/off; barra inferior. |
| 2 | **Inventário `driver-home-inventory.md`** | Tabela C — coluna inventário detalhado vs código (intro removida, D-S1-08, D-S1-21 layout). Tabela D — mencionar folha inferior compacta no palco mapa quando sem pedidos. |
| 3 | **TODO-LEGADO `!driverBottomNav`** | Auditoria `driverHomeFeatures.ts` + decisão remover ramos vs manter testes (não urgente). |
| 4 | **Copy opcional** | Alinhar frases «Sem viagens disponíveis» vs «Sem pedidos» / «Fica disponível…» entre ecrãs se quiseres uma só voz de produto. |

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

## TODO-LEGADO — `!driverBottomNav` (DriverDashboard)

**Não bloqueia** entregas Manel; hoje `isDriverBottomNavEnabled()` em `web-app/src/config/driverHomeFeatures.ts` está fixo a `true`, pelo que os ramos `!driverBottomNav` estão **inactivos** até alguém alterar o config.

**Para uma sessão futura:**

1. **Auditoria:** confirmar se algum build, env ou teste usa `false`; se ninguém depende, candidatar a **remover ramos** e simplificar testes.
2. **Se o flag voltar a ser real:** antes de produção sem bottom nav, garantir **Menu** e **disponibilidade** acessíveis sem D-S1-02 / D-S1-06 (ver nota 1 na Tabela C do inventário).
3. **Critério de fecho:** um único caminho Manel **ou** documentação + testes explícitos para o modo sem bottom nav.

---

## Como incrementar

Quando identificares um novo fix, adiciona uma secção `## FIX-NNN — …` abaixo, com contexto + comportamento desejado em bullet points.
