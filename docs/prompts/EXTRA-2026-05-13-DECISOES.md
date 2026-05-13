# EXTRA 2026-05-13 — Decisões (antes de implementar)

Instrumento para **fechar ambiguidades** com Frank / Manel / apoio jurídico antes de mergulhar em código. Estado **FECHADO** para execução UX (2026-05-06); **avisos legais** na app devem ser validados por counsel antes de produção.

| # | Tema | Pergunta | Resposta | Responsável | Data |
|---|------|----------|----------|-------------|------|
| 1 | TVDE legal | **Fonte normativa:** artigo / diploma para **10 h condução / 11 h repouso** (texto exacto a mostrar e auditoria). | **Quadro de referência (validar com fonte oficial):** limites de tempo de condução e períodos de descanso no quadro TVDE (ex.: **Lei n.º 45/2018**, **art. 12.º n.º 3**, janela **10 h / 24 h** e implicações de atribuição). Tempo de trabalho / repouso em transportes: diploma aplicável à categoria (equipa referiu substituição do **DL 237/2007** por **DL 84/2026** — **confirmar número, datas e articulados** em DRE/Consolidação). Conta de outrem / registo para **ACT**: mencionar obrigação de **registo** onde aplicável. **Nota:** nenhum texto legal na app substitui parecer jurídico. | Frank / jurídico | 2026-05-06 |
| 2 | Condução activa | **Definição operacional:** só `ongoing`, ou inclui `arriving`? Exclui “disponível parado”? | **Sim:** estados **`ongoing`** e **`arriving`**. **Não** conta tempo “disponível parado” sem viagem atribuída. | Frank / dev | 2026-05-06 |
| 3 | Janela 24 h | **Rolante** vs **dia civil**; **timezone** (`Europe/Lisbon` vs por motorista). | **Dia civil** (00:00–24:00), timezone **`Europe/Lisbon`**. | Frank | 2026-05-06 |
| 4 | Bloqueio | Só **impedir aceitar** / matching, ou **forçar offline**? **Override** admin? | **Forçar offline** (equiparado a indisponível para novas ofertas) e **override administrativo** para casos excepcionais documentados. Matching/aceitação bloqueados enquanto em violação. | Frank | 2026-05-06 |
| 5 | Aviso +8 h | (a) Mensagem genérica no JSON rotacional · (b) endpoint autenticado · (c) **banner** no `DriverDashboard`? | **Texto simples** (linha ou aviso discreto), **sem** “card” nem fluxo de IA. Canal: **banner / copy estático** no ecrã do motorista ou mensagem rotacional **genérica** — não bloco pesado. | Frank / Manel | 2026-05-06 |
| 6 | GPS offline | Mapa após login: pedir localização **só** no **primeiro toque** no mapa? | **Sim** no modo com **barra inferior Manel** (`DriverBottomNav`): **sem** `watchPosition` até a primeira interação com o mapa (mock/demo/E2E mantêm comportamento actual). | Frank / dev | 2026-05-06 |
| 7 | Top 3 vs mapa-first | Manter **dois passos** ou **um ecrã** mapa-full imediato? | **Adiado:** não é bloqueio para B2/B3; manter flags existentes (`VITE_DRIVER_HOME_TWO_STEP`). Reavaliar noutro ciclo. | Frank | 2026-05-06 |
| 8 | Slider | Aceitar **largura menor** se **altura ≥ 44 px** e teste em **360×800**? | **Sim** — entregue em **F-1** (`SlideToAccept` compact, `RequestCard` em modo slide). | Manel | 2026-05-06 |
| 9 | Chrome inferior | “Linha fixa” = só `DriverBottomNav` ou inclui **strip** disponível/offline? | **`DriverBottomNav` sempre** no shell Manel. **Strip** disponível/offline **alinhada** ao mesmo padrão (fixa acima da nav). **Referência:** mesma filosofia a **alvejar** para passageiro, partner e admin (nav inferior coerente). Motorista: **mapa como fundo** no ecrã principal **excepto** ao entrar em **menus** (ver prompt mapa + overlay). | Manel | 2026-05-06 |
|10 | Redução copy | **Remover** blocos vs **“Mais info”**; **3 elementos** sempre visíveis (P + D)? | **Referência visual:** estilo Uber linha **img 1 = offline**, **img 2 = online**; **menus fixos em baixo** nos dois. **Não** exigência pixel-perfect — prioridade **user-friendly**. **Progressive disclosure** permitido. **3 pilares por role (B5):** manter no ecrã principal **(a)** contexto de **mapa / viagem ou estado**, **(b)** **CTA principal** da tarefa, **(c)** **navegação inferior** (ou equivalente acessível). Detalhar/remover redundâncias no PR B5. | Manel | 2026-05-06 |

---

**Menu vs mapa (híbrido):** com o menu lateral aberto, o mapa **permanece por baixo** com **overlay forte** (o `Sheet` já usa `bg-black/80`; afinar se necessário para “quase invisível” por trás do drawer).

Quando **1–5** estão respondidas, o prompt [`EXTRA-2026-05-13-driver-hours-legal.md`](EXTRA-2026-05-13-driver-hours-legal.md) pode ser executado (implementação **B4** = backend + UI bloqueio/aviso). **6–10** desbloqueiam mapa / aceitar / copy.

Referência quadro operacional: [`TODOdoDIA.md`](../../TODOdoDIA.md) painel **2026-05-14** (**F-1**, **F-2**).
