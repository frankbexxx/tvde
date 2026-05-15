# Inventário UX — motorista

**Nota:** no `/driver`, o cabeçalho global usa a variante **compacta** (FIX-002): wordmark + data na mesma linha, dicas compactas; identidade e Conta/Definições no **Menu → Perfil**.

**Estado do inventário (alinhação):**

| Tabela | Estado | Nota |
|--------|--------|------|
| **A** — Shell global (D-G-01 … D-G-09) | **Fechada** | FIX-002; smoke telemóvel OK (disponível + viagem). |
| **B** — Barra inferior (D-NAV-01 … 04) | **Fechada** | Sem alterações planeadas. |
| **C** — Ecrã 1 passo inicial (D-S1-01 … D-S1-26) | **Fechada** | Decisões + FIX-004/005; em prod. `isDriverHomeTwoStepEnabled()` = false (passo 1 inactivo). |
| **D** — Ecrã 2 palco mapa (D-S2-01 … 08) | **Fechada** | FIX-006; folha compacta; smokes OK. |
| **E** — Aceitar e viagem activa (D-E-01 … 32) | **Fechada (funcional)** | FIX-007/008 em `main` (**#319**); refinamento pixel → **TWEAKS_UX** ([`TODOdoDIA.md`](../../TODOdoDIA.md) painel **2026-05-15**, prefixo **TW-**). |

**Nota de produto:** o ecrã 1 só existe se `isDriverHomeTwoStepEnabled()` for verdadeiro; caso contrário o utilizador cai directamente no ecrã 2 (palco mapa). Com `isDriverBottomNavEnabled()` falso, o layout muda — linhas *(cond.)* aplicam-se só nesse modo legado.

---

## Tabela A — Shell global (visível em ambos enquanto estás em `/driver`)

**Estado: fechada**

| ID | NOME | FUNÇÃO | LOCALIZAÇÃO NA UX |
|----|------|--------|-------------------|
| D-G-01 | Wordmark / marca | Identidade visual | Topo esquerdo do cabeçalho global |
| D-G-02 | Nome / telefone sessão | Quem está autenticado | **Menu → Perfil** (fora do topo; FIX-002) |
| D-G-03 | Papel «MOTORISTA» | Indica o papel API/sessão | **Menu → Perfil** |
| D-G-04 | Ref. conta (Conta · …) | Identificador curto da conta | **Menu → Perfil** |
| D-G-05 | Data e hora | Relógio / calendário pt-PT | **Na linha do wordmark** (FIX-002) |
| D-G-06 | Perfil | Abre perfil / conta | **Menu → Perfil** |
| D-G-07 | Definições | Abre configuração | **Menu → Perfil** |
| D-G-08 | Faixa de dicas rotativas | Mensagens / feed rotacional | Junto ao wordmark (FIX-002) |
| D-G-09 | Menu lateral (gaveta) | Navegação secundária (viagens, docs, zonas, etc.) | Sobrepõe o ecrã quando `menuOpen` (`DriverSideMenu`) |

---

## Tabela B — Barra de navegação inferior (ícones)

**Estado: fechada**

| ID | NOME | FUNÇÃO | LOCALIZAÇÃO NA UX |
|----|------|--------|-------------------|
| D-NAV-01 | Início | Tab «home» do shell; recolhe menu para início | Barra fixa inferior, 1.º botão |
| D-NAV-02 | Rendimentos | Abre menu na secção rendimentos | 2.º botão |
| D-NAV-03 | Caixa | Abre menu na secção caixa/inbox | 3.º botão |
| D-NAV-04 | Menu | Abre gaveta de menu | 4.º botão |

---

## Tabela C — Ecrã 1 (passo inicial / `driver-home-step1`)

**Estado: fechada** — decisões registadas; código em `main` (FIX-004, FIX-005). Em produção o passo 1 **não** é mostrado (`isDriverHomeTwoStepEnabled()` = false).

*Fluxo quando activo: mapa em cartão; com bottom nav, disponibilidade + CTA + nav em `bottomChrome`.*

### Decisões por ID (produto)

| ID | Decisão |
|----|---------|
| D-S1-01 | **REMOVER** |
| D-S1-02 | **REMOVER** |
| D-S1-03 | **MANTER** |
| D-S1-04 | **MANTER** |
| D-S1-05 | **MANTER** |
| D-S1-06 | **REMOVER** |
| D-S1-07 | **MANTER** |
| D-S1-08 | **REMOVER** |
| D-S1-09 | **MANTER** |
| D-S1-10 | **MANTER** |
| D-S1-11 | **MANTER** |
| D-S1-12 | **MANTER** |
| D-S1-13 | **MANTER** |
| D-S1-14 | **MANTER** |
| D-S1-15 | **MANTER** |
| D-S1-16 | **MANTER** |
| D-S1-17 | **MANTER** |
| D-S1-18 | **MANTER** |
| D-S1-19 | **MANTER** |
| D-S1-20 | **MANTER** |
| D-S1-21 | **MUDAR** — vazio mínimo; com pedidos: lista **abaixo do mapa** + marcadores no mapa |
| D-S1-22 | **MANTER** |
| D-S1-23 | **MANTER** |
| D-S1-24 | **MANTER** |
| D-S1-25 | **MANTER** |
| D-S1-26 | **MANTER** |

### Inventário detalhado Tabela C (estado actual do código)

| ID | NOME | FUNÇÃO | LOCALIZAÇÃO NA UX |
|----|------|--------|-------------------|
| D-S1-01 | Texto introdutório | *(removido)* | — |
| D-S1-02 | Botão Menu *(cond.)* | *(removido do passo 1)* | — |
| D-S1-03 | Pastilha Estatuto | Offline / Disponível / Em viagem | `DriverShellTopChips` — *(cond.)* com bottom nav no passo 1 |
| D-S1-04 | Pastilha «Breve» (tier) | Placeholder programa/tier | Ao lado do estatuto |
| D-S1-05 | Botão Lupa (modo destino) | Toast «em breve» | À direita dos chips |
| D-S1-06 | Toggle Estado *(cond.)* | *(removido do passo 1)* | — |
| D-S1-07 | Mapa (cartão) | Mapa interactivo; map-touch online se configurado | Bloco central |
| D-S1-08 | Faixa aviso simulação *(DEV)* | *(removida do ecrã motorista)* | DEV: nota em DevTools |
| D-S1-09 | Aviso GPS aproximado | Fallback + «Tentar outra vez» | Overlay no mapa |
| D-S1-10 | Banner horas condução | Aviso/bloqueio legal | Overlay no mapa |
| D-S1-11 | Diagnóstico GPS (details) | Estado envio GPS / servidor | Overlay *(DEV ou erro)* |
| D-S1-12 | Aviso sem internet | Estado de rede | Overlay no mapa |
| D-S1-13 | Aviso falha poll viagens | Erro suave listagem | Overlay no mapa |
| D-S1-14 | Aviso falha histórico | Erro suave histórico | Overlay no mapa |
| D-S1-15 | Toast documentos / bloqueios | Mensagem temporária | Overlay no mapa |
| D-S1-16 | Erro geral | Mensagem de erro | Overlay no mapa |
| D-S1-17 | «Ainda a processar…» | Longo tempo em acção | Overlay no mapa |
| D-S1-18 | Lista de pedidos (`RequestCard`) | Aceitar / rejeitar (`acceptVariant="slide"`) | **Irmão abaixo do mapa** (não overlay na folha) |
| D-S1-19 | Cabeçalho lista (`StatusHeader` compacto) | «N viagens disponíveis» | Topo da lista abaixo do mapa |
| D-S1-20 | Loading viagens | Spinner | Bloco abaixo do mapa |
| D-S1-21 | Estado vazio | Cartão mínimo «À espera de viagens» | Bloco abaixo do mapa |
| D-S1-22 | Contador no CTA | Badge no botão continuar | `bottomChrome` fixo |
| D-S1-23 | Chip «Toca no mapa…» *(cond.)* | Lembra map-touch | Flutuante sobre o mapa |
| D-S1-24 | Barra disponibilidade (fixa) | Disponível / offline | `bottomChrome` (passo 1 + bottom nav) |
| D-S1-25 | Botão «Ver pedidos e mapa completo» | Avança para passo 2 | `bottomChrome` |
| D-S1-26 | Botão continuar *(cond.)* | Igual D-S1-25 sem bottom nav | Variante legacy |

---

## Tabela D — Ecrã 2 (mapa completo / palco `driverMapStageLayout`, sem viagem activa)

**Estado: fechada** — FIX-006; smokes OK. Entrada directa em prod. quando não há passo 1.

*Estado disponível à espera de viagens. Overlays operacionais (GPS, rede, horas, etc.) — **sem** faixa simulação OSRM no ecrã (D-S1-08 / D-S2-04).*

| ID | NOME | FUNÇÃO | LOCALIZAÇÃO NA UX |
|----|------|--------|-------------------|
| D-S2-01 | Fila chips (estatuto / breve / lupa) | Igual D-S1-03–05 | Primeira linha do conteúdo motorista |
| D-S2-02 | Botão «Vista compacta» *(cond.)* | Volta ao passo 1 | Canto superior direito *(só two-step)* |
| D-S2-03 | Mapa (fundo) | Mapa full-bleed | Área útil do `main` |
| D-S2-04 | Overlays informativos | GPS, horas, rede, polls, toast, erro *(sem simulação DEV no ecrã)* | Camada z-10 sobre o mapa |
| D-S2-05 | Folha pedidos / vazio (`#driver-main-scroll`) | `RequestCard` + slide; vazio **compacto**; loading compacto | Parte inferior; `mt-auto`; `max-h` baixo em vazio |
| D-S2-06 | Chip «Toca no mapa…» *(cond.)* | Offline + map-tap | Flutuante acima da folha |
| D-S2-07 | Micro disponibilidade | OFF vermelho / ON verde; map-touch online | Canto do mapa (`DriverMapAvailabilityMicroToggle`) |
| D-S2-08 | Barra inferior nav | Quatro tabs | Fixa (`DriverBottomNav`) |

*Nota:* D-S2-07 no código actual é o **micro** no mapa (FIX-001/003), não a faixa `DriverShellAvailabilityInner` — essa aparece noutras variantes de layout.

---

## Tabela E — Aceitar e viagem activa

**Estado: fechada (funcional)** — decisões bulk + FIX-007/008 entregues; smoke manual driver↔passageiro OK (**2026-05-15**). Ajustes de densidade/copy/cores → **TWEAKS_UX** (não reabre arquitectura do fluxo).

*Âmbito:* à espera com **mapa grande** → toque no **marcador** abre painel aceitar → viagem com **mapa a ecrã cheio** + rota → barra de **4 ícones sempre** (excepto Menu aberto).

**Caminho real em prod.:** palco mapa (Tabela D) + itens D-E abaixo.

### Três pilares (linguagem simples)

**1. Barra de 4 ícones (D-E-22)** — **MUDAR**

- Os ícones Início / Rendimentos / Caixa / Menu devem **sempre** aparecer no motorista, também **durante** uma viagem.
- Os botões da viagem (Iniciar, Cancelar, etc.) ficam **por cima** dos 4 ícones, não os substituem.
- **Excepção:** com o **Menu** aberto (gaveta), a barra pode esconder-se — é outro ecrã lógico.
- Passageiro e parceiro: **mesma regra**, entrega separada (ver backlog TODO).

**2. Aceitar sem mudar o mapa (D-E-01–08, D-E-09 MANTER)** — **MUDAR** (bloco aceitar)

- O mapa **mantém-se** grande enquanto à espera.
- Quando cai um pedido: aparecem **marcadores** no mapa (um ou vários).
- **Só ao tocar num marcador** abre um **painel** com detalhes + aceitar + fechar/recusar.
- A lista grande em baixo deixa de ser o modo principal (D-E-01–07, D-E-08 **REMOVER** como faixa principal).
- Erros de rede ao aceitar: **MANTER** (D-E-09).

**3. Mapa na viagem (D-E-10–21, D-E-23–30 MANTER, D-E-31–32 MANTER)** — **MUDAR** (mapa + resumo)

- Durante a viagem: **mapa a ecrã cheio** com **rota** recolha→destino (a app não depende do Waze/Google).
- O cartão alto «A caminho» no meio do ecrã passa a **resumo compacto** por cima do mapa (D-E-14–16, D-E-19 **MUDAR**).
- **Não** mudar o ecrã inteiro ao aceitar — só o estado do mapa e painéis (D-E-10 **MUDAR**).
- Chips «Em viagem», cancelar, Waze/Google, hints: **MANTER** (D-E-11, D-E-17–18, D-E-20–21, D-E-23–30).
- Histórico: **MANTER**, escondido ou só sem viagem activa (D-E-31).
- Menu: **MANTER** — ao abrir Menu, sai do mapa cheio (D-E-32).

### Matriz bulk (decisão por bloco)

| Bloco | IDs | Decisão |
|-------|-----|---------|
| Aceitar (lista/painel) | D-E-01–08 | **MUDAR** |
| Erros aceitar | D-E-09 | **MANTER** |
| Transição de ecrã | D-E-10 | **MUDAR** |
| Chips estado | D-E-11 | **MANTER** |
| Mapa em viagem | D-E-12–13 | **MUDAR** / **MANTER** (micro só à espera) |
| Resumo viagem | D-E-14–16, D-E-19 | **MUDAR** · D-E-17–18, D-E-20–21 **MANTER** |
| Barra 4 ícones | D-E-22 | **MUDAR** |
| Acções viagem | D-E-23–30 | **MANTER** |
| Histórico / Menu | D-E-31–32 | **MANTER** |

### Decisões por ID (herança do bulk)

| ID | Decisão |
|----|---------|
| D-E-01 | **MUDAR** |
| D-E-02 | **MUDAR** |
| D-E-03 | **MUDAR** |
| D-E-04 | **MUDAR** |
| D-E-05 | **MUDAR** |
| D-E-06 | **MUDAR** |
| D-E-07 | **MUDAR** |
| D-E-08 | **REMOVER** |
| D-E-09 | **MANTER** |
| D-E-10 | **MUDAR** |
| D-E-11 | **MANTER** |
| D-E-12 | **MUDAR** |
| D-E-13 | **MANTER** |
| D-E-14 | **MUDAR** |
| D-E-15 | **MUDAR** |
| D-E-16 | **MUDAR** |
| D-E-17 | **MANTER** |
| D-E-18 | **MANTER** |
| D-E-19 | **MUDAR** |
| D-E-20 | **MANTER** |
| D-E-21 | **MANTER** |
| D-E-22 | **MUDAR** |
| D-E-23 | **MANTER** |
| D-E-24 | **MANTER** |
| D-E-25 | **MANTER** |
| D-E-26 | **MANTER** |
| D-E-27 | **MANTER** |
| D-E-28 | **MANTER** |
| D-E-29 | **MANTER** |
| D-E-30 | **MANTER** |
| D-E-31 | **MANTER** |
| D-E-32 | **MANTER** |

### Refinamento fino → TWEAKS_UX

Itens visuais (não bloqueantes) estão no painel **2026-05-15** do [`TODOdoDIA.md`](../../TODOdoDIA.md) (**TW-01** … **TW-06**). Resumo:

- Textos do painel ao toque no marcador (**TW-02**).
- Altura / densidade do **SlideToAccept** no painel (**TW-01**).
- Resumo compacto em viagem (**TW-03**).
- Stack inferior acções + barra 4 ícones (**TW-04**).
- Revisão pós-screenshots (**TW-05**).
- Opcional futuro: ícone «lista» multi-ofertas (**TW-06**, N/A).

### Inventário detalhado Tabela E

| ID | NOME | FUNÇÃO | LOCALIZAÇÃO NA UX |
|----|------|--------|-------------------|
| D-E-01 | Cabeçalho lista (`StatusHeader` compacto) | «N viagens no mapa» (hint) | Folha `#driver-main-scroll`: hint compacto; cabeçalho lista **não** é modo principal (FIX-008) |
| D-E-02 | `RequestCard` — hint contexto | Linha «nova viagem» | Painel ao toque no marcador (`selectedOfferTripId`) |
| D-E-03 | `RequestCard` — estado / categoria | Labels legíveis do pedido | Painel aceitar |
| D-E-04 | `RequestCard` — recolha / destino / preço | Informação para decidir | Painel aceitar |
| D-E-05 | `RequestCard` — REJEITAR | Recusa oferta (`offer_id`) | Painel aceitar, acima do slider |
| D-E-06 | `SlideToAccept` (compact) | Deslizar para aceitar (`acceptVariant="slide"`) | Painel aceitar; tweak densidade → **TW-01** |
| D-E-07 | Loading no cartão | Spinner «A processar…» no accept/reject | Durante `runAction` / reject no painel |
| D-E-08 | Faixa «N pedidos no mapa» | Liga mapa à folha antiga | **REMOVIDO** em prod (FIX-008); vista scroll legado sem faixa |
| D-E-09 | Erro / toast global pós-acção | Falha ACEITAR / rede | Overlays `DriverDashboard` (família D-S1-15/16) |
| D-E-10 | Transição de layout | Mantém palco mapa cheio com viagem | `driverMapStageLayout` **com** `activeTripId` (FIX-007); sem scroll + mapa cartão |
| D-E-11 | Chips «Em viagem» | `DriverShellTopChips` | Sub-header |
| D-E-12 | Mapa em viagem | Mapa full-bleed + rota OSRM + marcadores recolha/destino | Palco mapa (`driverMapStageLayout`); não coluna scroll subdued |
| D-E-13 | Micro disponibilidade | Oculto com viagem activa | Palco mapa: só sem `activeTripId` |
| D-E-14 | Cartão resumo viagem | Container `ActiveTripSummary` | Overlay compacto no palco mapa (`compact`, FIX-007) |
| D-E-15 | `StatusHeader` (primary) | Título de estado («A caminho», etc.) | Resumo compacto: `emphasis` subdued (FIX-007) |
| D-E-16 | Badge curto de estado | `driverTripBadgeShort` | Resumo compacto, sob o header |
| D-E-17 | Notas de poll / sincronização | Poll, fallback pós-aceitar | Resumo compacto |
| D-E-18 | Aviso pagamento falhado | `payment_status === failed` | Resumo compacto |
| D-E-19 | `TripCard` | Recolha, destino, preço | Resumo compacto: linha única (sem `TripCard` alto) |
| D-E-20 | Loading resumo | «A carregar viagem…» | Resumo compacto (sem `effectiveTrip`) |
| D-E-21 | «Continuar» pós-conclusão | Liberta UI após `completed` | Resumo compacto; obrigatório antes de voltar ao mapa à espera |
| D-E-22 | Barra inferior | `ActiveTripActions` + `DriverBottomNav` | `bottomChrome`: acções **por cima** dos 4 ícones; nav escondida só com Menu aberto (FIX-007) |
| D-E-23 | Hint próximo passo | Texto contextual por estado | `ActiveTripActions`, acima do botão |
| D-E-24 | Gate distância pickup | Bloqueio «Iniciar viagem» longe da recolha | `ActiveTripActions`; accepted/arriving |
| D-E-25 | Links Waze / Google Maps | Navegação externa | `ActiveTripActions`; confirm ao sair |
| D-E-26 | Botão principal | Aceitar *(assigned)* / Iniciar / Terminar | `PrimaryActionButton` no `bottomChrome` |
| D-E-27 | Cancelar viagem | Abre painel motivos | `ActiveTripActions` |
| D-E-28 | Painel cancelamento | Select preset + confirmar | Expandido no `bottomChrome` |
| D-E-29 | «A sincronizar estado…» | Sem contexto de viagem | `ActiveTripActions` ou resumo |
| D-E-30 | «Ainda a processar…» | Acção longa (>12s) | `ActiveTripActions` |
| D-E-31 | Secção histórico | Últimas viagens | Scroll, abaixo do resumo |
| D-E-32 | Menu lateral | Rendimentos, docs, etc. | `DriverSideMenu` (gaveta) |

---

## Referência no código

- Passo 1 *(cond.)*: `showDriverHomeStep1` — `DriverDashboard.tsx` (`data-testid="driver-home-step1"`).
- Palco disponível: `driverMapStageLayout`, folha `#driver-main-scroll` (~1473+).
- Aceitar: `RequestCard` + `SlideToAccept` — `web-app/src/components/cards/`.
- Viagem activa: `ActiveTripSummary` (inline no `DriverDashboard.tsx` ~2160+), `ActiveTripActions.tsx`, `bottomChrome` quando `activeTripId` (~875+).
- Chips: `DriverShellTopChips.tsx`. Nav: `DriverBottomNav.tsx`. Header: `AppHeaderBar.tsx`.
- Flags: `web-app/src/config/driverHomeFeatures.ts`.
