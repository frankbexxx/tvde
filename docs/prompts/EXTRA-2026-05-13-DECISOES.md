# EXTRA 2026-05-13 — Decisões (antes de implementar)

Instrumento para **fechar ambiguidades** com Frank / Manel / apoio jurídico antes de mergulhar em código. Preencher a coluna **Resposta**; estado **PENDENTE** até haver texto.

| # | Tema | Pergunta | Resposta | Responsável | Data |
|---|------|----------|----------|-------------|------|
| 1 | TVDE legal | **Fonte normativa:** artigo / diploma para **10 h condução / 11 h repouso** (texto exacto a mostrar e auditoria). | PENDENTE | | |
| 2 | Condução activa | **Definição operacional:** só `ongoing`, ou inclui `arriving`? Exclui “disponível parado”? | PENDENTE | | |
| 3 | Janela 24 h | **Rolante** vs **dia civil**; **timezone** (`Europe/Lisbon` vs por motorista). | PENDENTE | | |
| 4 | Bloqueio | Só **impedir aceitar** / matching, ou **forçar offline**? **Override** admin? | PENDENTE | | |
| 5 | Aviso +8 h | (a) Mensagem genérica no JSON rotacional para todos · (b) endpoint autenticado por motorista · (c) **banner** no `DriverDashboard` (fora rotacional)? | PENDENTE | | |
| 6 | GPS offline | Mapa em modo “offline após login”: pedir localização **só** no **primeiro toque** no mapa? | PENDENTE | | |
| 7 | Top 3 vs mapa-first | Manter **dois passos** ([`DRIVER_HOME_TOP3_MANEL.md`](../product/DRIVER_HOME_TOP3_MANEL.md)) ou **um ecrã** mapa-full imediato? | PENDENTE | | |
| 8 | Slider | Aceitar **largura menor** se **altura ≥ 44 px** e teste em **360×800**? | PENDENTE | | |
| 9 | Chrome inferior | “Linha fixa” = só `DriverBottomNav` ou inclui **strip** disponível/offline? | PENDENTE | | |
|10 | Redução copy | **Remover** blocos vs **“Mais info”**; lista de **3 elementos** que **nunca** saem do ecrã principal (P + D)? | PENDENTE | | |

---

Quando **1–5** estiverem respondidas, o prompt [`EXTRA-2026-05-13-driver-hours-legal.md`](EXTRA-2026-05-13-driver-hours-legal.md) pode ser executado. **6–10** desbloqueiam os prompts de mapa / aceitar / copy.

Referência quadro operacional: [`TODOdoDIA.md`](../../TODOdoDIA.md) painel **2026-05-14** (**F-1**, **F-2**).
