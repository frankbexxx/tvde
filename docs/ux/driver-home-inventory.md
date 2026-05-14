# Inventário UX — motorista (Ecrã 1 vs Ecrã 2)

**Nota:** no `/driver`, o cabeçalho global usa a variante **compacta** (FIX-002): wordmark + data na mesma linha, dicas compactas; identidade e Conta/Definições no **Menu → Perfil**.

**Estado do inventário (alinhação):**

| Tabela | Estado | Nota |
|--------|--------|------|
| **A** — Shell global (D-G-01 … D-G-09) | **Fechada** | Validada em uso após merge; coluna «LOCALIZAÇÃO» descreve ainda o layout de referência — a implementação actual segue FIX-002 no `/driver`. |
| **B** — Barra inferior (D-NAV-01 … 04) | **Fechada** | Sem alterações planeadas. |
| **C** — Ecrã 1 passo inicial (D-S1-01 … D-S1-26) | **Parcialmente implementada** | FIX-004 (remoções D-S1-01/02/06/08) e FIX-005 (D-S1-21) entregues no código; inventário detalhado pode ainda descrever labels antigos — alinhar na próxima revisão doc. |
| **D** — Ecrã 2 palco mapa | — | Inalterada nesta fase. |

**Nota de produto:** o ecrã 1 só existe se `isDriverHomeTwoStepEnabled()` for verdadeiro; caso contrário o utilizador cai directamente no ecrã 2. Com `isDriverBottomNavEnabled()` falso, o layout muda (sem barra inferior Manel; toggle «Estado» no passo 1, etc.) — as linhas assinaladas com *(cond.)* aplicam-se só nesse modo.

---

## Tabela A — Shell global (visível em ambos enquanto estás em `/driver`)

**Estado: fechada** (sem novos itens; implementação driver = variante compacta + Perfil no menu.)

| ID | NOME | FUNÇÃO | LOCALIZAÇÃO NA UX |
|----|------|--------|-------------------|
| D-G-01 | Wordmark / marca | Identidade visual | Topo esquerdo do cabeçalho global |
| D-G-02 | Nome / telefone sessão | Quem está autenticado | Ao lado da marca, linha 1 |
| D-G-03 | Papel «MOTORISTA» | Indica o papel API/sessão | Pastilha sob o nome |
| D-G-04 | Ref. conta (Conta · …) | Identificador curto da conta | Junto ao papel |
| D-G-05 | Data e hora | Relógio / calendário pt-PT | Linha abaixo do bloco identidade |
| D-G-06 | Perfil | Abre perfil / conta | Canto superior direito |
| D-G-07 | Definições | Abre configuração | Ao lado do perfil |
| D-G-08 | Faixa de dicas rotativas | Mensagens / feed rotacional | Faixa escura sob o bloco principal do header |
| D-G-09 | Menu lateral (gaveta) | Navegação secundária (viagens, docs, zonas, etc.) | Sobrepõe o ecrã quando `menuOpen` (`DriverSideMenu`) |

---

## Tabela B — Barra de navegação inferior (ícones)

**Estado: fechada** (sem mudanças planeadas.)

| ID | NOME | FUNÇÃO | LOCALIZAÇÃO NA UX |
|----|------|--------|-------------------|
| D-NAV-01 | Início | Tab «home» do shell; recolhe menu para início | Barra fixa inferior, 1.º botão |
| D-NAV-02 | Rendimentos | Abre menu na secção rendimentos | 2.º botão |
| D-NAV-03 | Caixa | Abre menu na secção caixa/inbox | 3.º botão |
| D-NAV-04 | Menu | Abre gaveta de menu | 4.º botão |

---

## Tabela C — Ecrã 1 (passo inicial / `driver-home-step1`)

**Estado:** decisões registadas; **remoções D-S1-01/02/06/08 e mudança D-S1-21** reflectidas no código (ver backlog FIX-004 / FIX-005).

*Fluxo: mapa em cartão com altura limitada; com bottom nav, a disponibilidade + CTA + nav estão na barra fixa composta (`bottomChrome`).*

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
| D-S1-21 | **MUDAR** — sem pedidos: box **mínima**; com pedidos: lista **por baixo do mapa** + **marcadores / ícones de viagens no mapa**. |
| D-S1-22 | **MANTER** |
| D-S1-23 | **MANTER** |
| D-S1-24 | **MANTER** |
| D-S1-25 | **MANTER** |
| D-S1-26 | **MANTER** |

### Notas de alinhamento (discussão)

**1. Dois dashboards** — Opinião: um **caminho alvo** (Manel) reduz custo; variantes `!driverBottomNav` são **legado** até haver decisão de as cortar. **REMOVER** D-S1-02 e D-S1-06 só é seguro quando não houver utilizadores nesse modo **ou** houver outro acesso claro a Menu / disponibilidade nesse fluxo.

**2. Avisos DEV / mocks** — Opinião: em **produção** o motorista não precisa de mocks/versions; **DEV** pode usar painel discreto, **admin** ou **DevTools**. Manter no motorista só o que for **operacional** (GPS, rede, documentos, horas, erros de acção). **D-S1-08 REMOVER** encaixa aqui.

**3. D-S1-21 (vazio vs com pedidos)** — Opinião: faz sentido e alinha com map-first; reutilizar lógica de preview no mapa onde já existir no palco 2.

**4. D-S1-08** — Confirmado **REMOVER**.

### Inventário detalhado Tabela C (referência; colunas descrevem o estado actual do código)

| ID | NOME | FUNÇÃO | LOCALIZAÇÃO NA UX |
|----|------|--------|-------------------|
| D-S1-01 | Texto introdutório | Explica o modo compacto («mapa e estado em primeiro plano…») | Topo da área de conteúdo, abaixo do header global |
| D-S1-02 | Botão Menu *(cond.)* | Abre `DriverSideMenu` quando não há bottom nav Manel | Canto direito da linha do intro |
| D-S1-03 | Pastilha Estatuto | Mostra Offline / Disponível / Em viagem | Esquerda, fila de chips (`DriverShellTopChips`) — *(cond.)* com bottom nav |
| D-S1-04 | Pastilha «Breve» (tier) | Placeholder programa/tier | Ao lado do estatuto |
| D-S1-05 | Botão Lupa (modo destino) | Toast «em breve» (wireframe §9.5) | À direita dos chips |
| D-S1-06 | Toggle Estado *(cond.)* | Disponível / offline sem barra Manel | Entre intro e mapa |
| D-S1-07 | Mapa (cartão) | Mapa interactivo; toque pode passar a disponível se configurado | Bloco central com bordas arredondadas |
| D-S1-08 | Faixa aviso simulação *(DEV)* | Lembrete mock OSRM | Sobre o mapa, topo da coluna de overlays |
| D-S1-09 | Aviso GPS aproximado | Fallback de localização + «Tentar outra vez» | Sobre o mapa |
| D-S1-10 | Banner horas condução | Aviso/bloqueio legal tempo de condução | Sobre o mapa |
| D-S1-11 | Diagnóstico GPS (details) | Estado envio GPS / servidor | Sobre o mapa *(DEV ou erro)* |
| D-S1-12 | Aviso sem internet | Estado de rede | Sobre o mapa |
| D-S1-13 | Aviso falha poll viagens | Erro suave listagem | Sobre o mapa |
| D-S1-14 | Aviso falha histórico | Erro suave histórico | Sobre o mapa |
| D-S1-15 | Toast documentos / bloqueios | Mensagem temporária + fechar | Sobre o mapa |
| D-S1-16 | Erro geral | Mensagem de erro + fechar | Sobre o mapa |
| D-S1-17 | «Ainda a processar…» | Longo tempo em acção | Sobre o mapa |
| D-S1-18 | Lista de pedidos (`RequestCard`) | Ver / aceitar / rejeitar ofertas | Folha inferior sobre o mapa (scroll) |
| D-S1-19 | Cabeçalho lista pedidos (`StatusHeader`) | Título «N viagens disponíveis» | Topo da folha de lista |
| D-S1-20 | Loading viagens | Spinner a carregar | Folha inferior |
| D-S1-21 | Cartão «À espera de viagens» | Estado vazio / categorias | Folha inferior centrada |
| D-S1-22 | Contador no CTA | Badge número de pedidos no botão continuar | Sobre o botão primário fixo |
| D-S1-23 | Chip «Toca no mapa…» *(cond.)* | Lembra toque no mapa para GPS/disponível | Flutuante baixo sobre o mapa |
| D-S1-24 | Barra disponibilidade (fixa) | Offline→online (pill ou texto map-tap) / disponível→offline | **Zona fixa inferior**, acima do CTA e da nav (com bottom nav no passo 1) |
| D-S1-25 | Botão «Ver pedidos e mapa completo» | Avança para passo 2 (mapa cheio) | **Zona fixa inferior**, acima da nav |
| D-S1-26 | Botão continuar *(cond.)* | Igual D-S1-25 quando não há bottom nav | Dentro do scroll (variante legacy) |

---

## Tabela D — Ecrã 2 (mapa completo / palco `driverMapStageLayout`, início sem viagem activa)

*Após D-S1-25 (ou entrada directa se um só passo). Inclui estado **disponível** à espera de viagens; muitos overlays são os mesmos tipos que D-S1-08–17 com posição na camada z-10.*

| ID | NOME | FUNÇÃO | LOCALIZAÇÃO NA UX |
|----|------|--------|-------------------|
| D-S2-01 | Fila chips (estatuto / breve / lupa) | Igual D-S1-03–05 | **Sub-header global**, primeira linha do conteúdo motorista |
| D-S2-02 | Botão «Vista compacta» *(cond.)* | Volta ao passo 1 (dois passos activos) | Canto superior direito da mesma linha |
| D-S2-03 | Mapa (fundo) | Mapa full-bleed por baixo da UI | Toda a área útil do `main` sob overlays |
| D-S2-04 | Overlays informativos | Mesma família que D-S1-08–17 (simulação, GPS, horas, rede, polls, toast, erro, processamento) | Camada por cima do mapa, zona superior/média |
| D-S2-05 | Folha pedidos / vazio (`#driver-main-scroll`) | Lista `RequestCard` ou vazio + `StatusHeader` | **Parte inferior do ecrã**, cartão com scroll |
| D-S2-06 | Chip «Toca no mapa…» *(cond.)* | Offline + map-tap activo | Flutuante acima da zona da folha |
| D-S2-07 | Barra disponibilidade (inline) | Pill disponível/offline ou texto «toca no mapa» | **Acima da nav fixa**, dentro do fluxo do palco |
| D-S2-08 | Barra inferior só nav | Quatro tabs (sem CTA passo 1) | Fixa no fundo (`ScreenContainer` + `DriverBottomNav`) |

---

## Referência no código

- Passo 1: `showDriverHomeStep1` em `web-app/src/features/driver/DriverDashboard.tsx` (`data-testid="driver-home-step1"`), `bottomChrome` composto (~827–861).
- Palco 2: `driverMapStageLayout` e bloco mapa + overlay (~1501+), header interno (~1465+).
- Chips: `web-app/src/features/driver/DriverShellTopChips.tsx`.
- Nav: `web-app/src/features/driver/DriverBottomNav.tsx`.
- Header global: `web-app/src/components/layout/AppHeaderBar.tsx`.
