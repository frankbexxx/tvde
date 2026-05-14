# Backlog de fixes UX — motorista

Lista incremental: **não executar até acordar ordem / sprint**. Cada entrada descreve o fix; implementação fica para depois.

---

## FIX-001 — Disponibilidade: map-touch online + micro-controlo on/off no bordo do mapa

**Problema / contexto:** a faixa “Disponível — offline” fica invisível ou inacessível com a nav fixa por cima (`z-40` vs conteúdo, `pb-0` no palco imersivo).

**Comportamento desejado:**

- **Passar a disponível (online):** mantém-se o fluxo actual de **toque no mapa** (`mapTapGoesOnline`), sem regressão.
- **Passar a offline:** deixa de depender da faixa inferior tapada; passa a ser um **único** micro-controlo tipo **on/off** (um ícone / botão compacto com **dupla função** conforme o estado), no **bordo do mapa**, **por cima do mapa** (overlay), não por baixo da barra de tabs.
- **UI:** um só controlo pequeno no perímetro (ex.: canto), legível e clicável acima dos tiles; reflecte disponível vs offline (e eventualmente “em viagem” se aplicável); o toque quando **disponível** passa a **offline**; quando **offline**, o online continua a ser preferencialmente pelo **map-touch** (comportamento já acordado), salvo refinamento futuro do mesmo controlo.

**Notas para implementação futura:** definir canto, acessibilidade (`aria-label`, estado anunciado), e não bloquear gestos do mapa excepto na hit-area do micro-controlo.

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

## Como incrementar

Quando identificares um novo fix, adiciona uma secção `## FIX-NNN — …` abaixo, com contexto + comportamento desejado em bullet points.
