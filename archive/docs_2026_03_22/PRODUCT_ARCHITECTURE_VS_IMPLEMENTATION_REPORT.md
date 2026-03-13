# TVDE – Comparação PRODUCT_ARCHITECTURE_VISION vs Repositório Atual

Este relatório compara o documento `docs/PRODUCT_ARCHITECTURE_VISION.md` com o estado real do repositório (`backend`, `web-app`, `design-system`), focando em:

1. Diferenças arquiteturais  
2. Diferenças na implementação de UI  
3. Componentes em falta  
4. Desvios da filosofia de design  
5. Correções / ajustes sugeridos

---

## 1) Diferenças Arquiteturais

### 1.1. Camadas principais (Backend / Frontend / Design System)

**Visão (doc)**  
- Três camadas explícitas:
  - **Backend**: FastAPI, PostgreSQL, SQLAlchemy, Stripe.
  - **Frontend**: React, TypeScript, Vite, Tailwind.
  - **Design System**: camada separada que controla cores, tipografia, tokens, componentes, temas.

**Repositório**  
- Estrutura real:
  - `backend/`  
    - FastAPI + modelos SQLAlchemy (`backend/app/db/models/*.py`), serviços (`backend/app/services/*.py`), routers (`backend/app/api/routers/*.py`), Stripe (`stripe_service.py`), etc.
  - `web-app/`  
    - React + TS + Vite + Tailwind (`web-app/package.json`, `vite.config.ts`, `tailwind.config.js`).
    - Design system **embebido na web app**, em:
      - `web-app/src/design-system/tokens.css`
      - `web-app/src/design-system/themes/*.css`
      - componentes UI reutilizáveis em `web-app/src/components/ui/*` e `web-app/src/design-system/components/app/*`.

**Diferença principal**  
- A camada de **Design System não é um pacote totalmente separado** (mono-repo / lib isolada); está integrada dentro da pasta `web-app`.  
- Conceitualmente, segue a visão (camada independente de lógica, atuando via tokens/temas), mas **fisicamente** ainda não é um módulo partilhado entre múltiplos frontends (web app + futuros wrappers nativos).

---

### 1.2. Responsabilidades do Backend

**Visão (doc)**  
- Backend responsável por:
  - Autenticação
  - Gestão de viagens
  - Matching motorista/passageiro
  - Pagamentos (Stripe)
  - Estado das viagens

**Repositório**  
- Backend implementa:
  - **Autenticação** (`schemas/auth.py`, `app/auth/security.py`, routers de auth).
  - **Gestão de viagens** (`app/db/models/trip.py`, `app/services/trips.py`, `api/routers/driver_trips.py`, `schemas/realtime.py`).
  - **Stripe** (`services/stripe_service.py`, routers `webhooks`).
  - **Logging / activity / realtime admin** (`services/interaction_logging.py`, `realtime/admin_hub.py`).
- O **matching automático sofisticado** e tracking em tempo real ao estilo Uber/Bolt parecem ainda **simplificados** (há simulador em `backend/tools/simulator/`, mas não um “engine” complexo de matching geográfico).

**Diferença principal**  
- A arquitetura de backend está alinhada com a visão (stack e responsabilidades), mas o **matching motorista/passageiro e tracking em tempo real ainda estão numa fase simplificada** (o que o próprio documento assume como “lacunas funcionais”).

---

### 1.3. Escalabilidade geográfica

**Visão (doc)**  
- Mercado inicial: Portugal, com expansão natural para Espanha (Galiza).
- Arquitetura deve permitir expansão sem mudanças estruturais.

**Repositório**  
- Backend e frontend usam:
  - Idioma e formato **PT** (logs, labels, mensagens em pt-PT).
  - Assunções de telefone `+351`, moeda `€`, textos específicos de TVDE PT.
- Não se observa (no nível de ficheiros) um sistema extensivo de **i18n/l10n** (módulos de tradução por idioma / mercado).

**Diferença principal**  
- Arquitetura técnica é compatível com expansão, **mas ainda não existem abstrações fortes de i18n** (mensagens e labels ainda estão “hardcoded” em PT).

---

## 2) Diferenças de Implementação de UI

### 2.1. Layout estrutural

**Visão (doc)**  
- Estrutura da interface:
  - Header
  - Main Content
  - ActivityPanel
  - Primary Action
- Hierarquia visual:
  - STATUS → AÇÃO PRINCIPAL → DETALHES → LOG/DIAGNÓSTICO

**Repositório**  
- `web-app/src/routes/index.tsx`:
  - `header` sticky no topo.
  - `main` com dashboards (`PassengerDashboard`, `DriverDashboard`, `AdminDashboard`).
  - `ActivityPanel` fixo à direita em desktop / em baixo em mobile.
- `ScreenContainer` organiza:
  - Conteúdo scrollável.
  - Slot de **PrimaryActionButton** no fundo com `safe-area` bottom.
- `StatusHeader` está presente nos fluxos principais de passageiro/condutor, acima dos cards.

**Diferença principal**  
- A estrutura **corresponde muito bem à visão**.  
- Pequenos detalhes:
  - Em alguns ecrãs o **STATUS + Primary Action + Detalhes + Log** não está sempre explicitamente em “stack” vertical perfeito (por exemplo, variações em Admin), mas conceptualmente é seguido.

---

### 2.2. Atmospheric Mobility UI (gradientes, formas, textura)

**Visão (doc)**  
- Três camadas visuais:
  - Camada 1 – Gradiente (0%, 38%, 100%, “fibonacci-like”).
  - Camada 2 – Forma orgânica grande, suave, quase invisível.
  - Camada 3 – Textura de ruído inspirado em papel japonês.
- Objetivo: evitar sensação “flat”, ambiente calmo.

**Repositório**  
- `index.css`:
  - `body::before` – gradiente diagonal 135°, com stops em 0%, ~38%, 100%, a partir de `--color-background` e `--bg-atmo-mid`.
  - `body::after` – blob grande (`radial-gradient`) controlado por `--bg-atmo-shape`, semi-transparente.
  - `#bg-noise` – overlay com textura de ruído via SVG (`feTurbulence`, opacidade ~1.5%).

**Diferença principal**  
- Aqui há **forte alinhamento**: o sistema de fundo está praticamente 1:1 com a visão (incluindo stops 0/38/100, forma orgânica e ruído subtil).
- Ajustes finos (intensidade por tema) ainda podem ser melhorados, mas a **implementação base cumpre o conceito**.

---

### 2.3. Design System & Temas

**Visão (doc)**  
- Temas controlam: cores, gradientes, shapes.  
- Temas atuais: Portugal, Portugal Dark, Minimal, Neon.  
- Temas futuros: Ocean, Forest, Fire, Sakura, Steampunk.

**Repositório**  
- `web-app/src/design-system/themes/*.css`:
  - `portugal.css`, `portugal-dark.css`, `minimal.css`, `neon.css` implementados com:
    - HSL tokens (`--color-primary`, `--color-accent`, `--color-background`, etc.).
    - Novos tokens `--bg-atmo-mid`, `--bg-atmo-shape` por tema.
- Temas futuros (Ocean, Forest, Fire, Sakura, Steampunk) **ainda não existem** em código.

**Diferença principal**  
- Temas atuais estão alinhados; os **temas futuros estão apenas na visão** (backlog, não implementados ainda).

---

### 2.4. Componentes de UI principais

**Visão (doc)**  
- PrimaryActionButton:
  - pill, ≥52px, gradiente, micro‑interações.
- Cards:
  - para viagens/pedidos/info, com rounded, shadow, blur leve.
- StatusHeader:
  - estados (`requested`, `accepted`, `ongoing`, `completed`), transições suaves.
- ActivityPanel:
  - painel técnico discreto (logs, estado, debug).

**Repositório**  
- `PrimaryActionButton`:
  - `rounded-full`, `min-h-[52px]`, `bg-gradient-to-r from-primary to-accent`, micro‑interações de scale → **match forte**.
- Cards (`TripCard`, `RequestCard`):
  - `rounded-2xl`, `shadow-card`, `hover:shadow-floating`, `bg-card/95 backdrop-blur-sm` → **match forte** com “cards legíveis com blur leve”.
- `StatusHeader`:
  - Variantes `requested/assigned/accepted/arriving/ongoing/completed/idle/error`.
  - `transition-colors duration-300` → transições suaves.
- `ActivityPanel`:
  - Logs, estado, role atual, botões “Copiar” e “Limpar”.
  - Fonte pequena, cores neutras e bordas leves, fundo `bg-card/90` com blur → **bastante discreto**.

**Diferença principal**  
- Também aqui há **forte alinhamento**; o que falta é mais:
  - **Aplicação consistente do padrão “PrimaryAction” em todos os ecrãs** (especialmente Admin e alguns estados edge).
  - Possível extração de um componente “Section” / “Panel” para padronizar header + conteúdo + ação.

---

## 3) Componentes em Falta (face à visão)

Alguns pontos já são reconhecidos na própria secção “Lacunas Funcionais” do documento.

### 3.1. Funcionalidade core de ride-sharing

**Referido como lacuna no doc, confirmado no repo:**

- **Mapa** interativo para passageiro/motorista:
  - Não há componente de mapa em `web-app/src`.
- **Localização GPS** do utilizador / motorista:
  - Não se vê integração com APIs de geolocalização (browser ou nativas).
- **Matching automático**:
  - Simulador e endpoints de trips existem, mas **não há ainda um engine avançado de matching geográfico** visível.
- **Tracking de viagem em tempo real** (ponto a ponto no mapa):
  - Não existem componentes UI para isso.
- **Notificações push** (ou mesmo notificações internas mais avançadas):
  - Há toasts e ActivityPanel, mas não um sistema completo de notificações cross-device.

### 3.2. Sistema de temas futuros

- Temas **Ocean, Forest, Fire, Sakura, Steampunk** são apenas mencionados no doc; não têm ficheiros `.css` ou config de tema associados.

### 3.3. PWA / wrappers nativos

- A visão menciona possível evolução para **PWA / wrapper nativo**:
  - Não há evidência de `manifest.json`, `service worker`, nem camada específica para expo/react-native a partilhar o design system.

---

## 4) Desvios da Filosofia de Design

### 4.1. Action First

**Filosofia**  
- “Action First” – deve existir sempre uma ação clara (botão principal).

**Implementação**  
- Passenger/Driver:
  - A maioria dos ecrãs segue isto: `StatusHeader` + card principal + **PrimaryActionButton** na base (por ex., pedir viagem, aceitar, iniciar).
- Admin:
  - Mais técnico, com múltiplos botões/ações e menos foco num único CTA.

**Desvio**  
- Em alguns contextos técnicos (Admin, DevTools) a filosofia “Action First” é naturalmente menos óbvia (várias ações concorrentes).  
- Para a parte pública (Passenger/Driver), o alinhamento é bom; o que falta é **documentar e assegurar via componentes/layout** que todos os estados têm um CTA principal bem destacado.

---

### 4.2. Calm Environment

**Filosofia**  
- Interface calma, não agressiva:
  - Gradientes suaves, formas orgânicas, cores equilibradas.

**Implementação**  
- Temas `Portugal`, `Portugal Dark`, `Minimal` honram claramente esta ideia.
- Tema `Neon` é mais “loud” (cores vibrantes, contrastes fortes), o que é coerente como tema “experimento / fun”.

**Desvio**  
- Pequena tensão entre “Calm Environment” e o tema `Neon` (propositalmente mais agressivo).  
- Sugestão: considerar `Neon` como **tema explícito de debug / dev / fun**, não como tema de produção “calmo”.

---

### 4.3. Legibility

**Filosofia**  
- Cards e texto devem ser sempre legíveis, mesmo com fundo atmosférico.

**Implementação**  
- Uso de `bg-card/95` + `backdrop-blur-sm` nos cards melhora legibilidade sobre o fundo.
- Tipografia e contrastes nos temas principais são bons, mas:
  - Em alguns casos de texto secundário (`muted-foreground` sobre `muted` em dark mode) é preciso garantir contraste WCAG.

**Desvio**  
- Não há uma auditoria formal de acessibilidade ainda; é possível existirem **alguns casos limite de contraste insuficiente**, sobretudo em dark + Neon.

---

### 4.4. “Evitar excesso de polimento visual”

**Filosofia**  
- Prioridade em funcionalidade real, mapas, tracking, etc.; evitar gastar demasiado tempo em polimento visual antes de ter feature set sólido.

**Implementação**  
- O trabalho recente concentrou-se fortemente em:
  - Fundo atmosférico.
  - Refinamento do design system.
  - Detalhes de tipografia, blur, gradientes, sombras.
- Em contrapartida, mapas, tracking, matching, notificações ainda não foram implementados (conforme roadmap).

**Desvio**  
- Há um **ligeiro desequilíbrio momentâneo**: a camada visual está bastante avançada face à camada funcional de ride-sharing.  
- Não é um problema em si (desde que agora o foco mude para a funcionalidade), mas é um desvio pontual ao princípio de “não polir em excesso antes de ter features core”.

---

## 5) Correções e Próximos Passos Sugeridos

### 5.1. Arquitetura

1. **Clarificar o papel do Design System como camada “quase” independente**
   - Manter como está (dentro de `web-app`) mas:
     - Documentar em `docs/` que o design system foi pensado para ser extraível no futuro (por ex. para React Native / apps nativas).
     - Garantir que tokens e componentes de UI evitam dependências fortes da infraestrutura da web app (router, contexts de negócio).

2. **Preparar terreno para i18n**
   - Introduzir desde já uma camada simples de **strings centralizadas** (ex. ficheiro `strings.ts` ou `messages.ts`) para facilitar a futura expansão para ES/Galiza.
   - Manter PT como idioma default, mas não “hardcode” diretamente em todos os componentes.

---

### 5.2. UI & Design System

1. **Consolidar um “layout contract” explícito**
   - Documentar e, se possível, encapsular a hierarquia:
     - `StatusHeader` (estado)
     - `Primary content card(s)` (detalhes)
     - `PrimaryActionButton` (ação principal)
     - `ActivityPanel` (log/diag)
   - Uma abordagem seria criar um componente de layout de ecrã:
     - `RideScreenLayout` com slots: `status`, `cards`, `primaryAction`.

2. **Ajustar a posição do ActivityPanel em mobile**
   - Garantir que em ecrãs pequenos o ActivityPanel:
     - É claramente secundário (pode recolher/expandir).
     - Não rouba altura crítica ao conteúdo principal e ao botão primário.

3. **Audit de contrastes e legibilidade**
   - Executar uma ronda de **verificação de contraste** (AAA/AA) nos quatro temas.
   - Ajustar ligeiramente alguns HSL (especialmente em `muted-foreground` em dark) para garantir legibilidade robusta.

4. **Clarificar papel do tema Neon**
   - Decidir se:
     - É um tema “experiência fun” para dev/teste, ou
     - Um tema oficial de produção.
   - Se for apenas dev:
     - Documentar isso no design system e possivelmente escondê-lo na UI pública.

---

### 5.3. Componentes em falta & roadmap funcional

Com base na secção “Lacunas Funcionais” do documento e no estado do código:

1. **Implementar stack de geolocalização & mapas (Fase crítica)**
   - Escolher provider: Google Maps, Mapbox, Leaflet+OSM, etc.
   - Implementar:
     - Componente `MapView` para Passenger/Driver.
     - Hooks/serviços para:
       - Obter localização atual (browser geolocation).
       - Exibir posição do motorista/passenger.
   - Integrar com fluxo de viagens:
     - “Pedir viagem” → mostrar origem/destino + rota base no mapa.
     - “Motorista a caminho” → mover marcador motorista.

2. **Matching & tracking**
   - Clarificar (em docs + backend):
     - Algoritmo simples de matching (pelo menos heurístico por proximidade).
   - Expor isso na UI:
     - Estados intermedíarios visuais em `StatusHeader` + animações leves.

3. **Notificações**
   - A curto prazo:
     - Refinar toasts e ActivityPanel para dar feedback imediato de eventos importantes.
   - A médio prazo:
     - Estudar push notifications (web push / mobile wrapper).
     - Definir componente de “notification center” mínimo, se precisar.

---

### 5.4. Alinhamento com a Filosofia “Funcionalidade Real + Testes Humanos”

1. **Planeamento de sessões de teste com o GUI atual**
   - Usar o estado avançado do design system para **testes humanos reais**, mesmo antes de mapas complexos:
     - Simulação de rotas com o simulador backend.
     - Sessões internas com condutores/passageiros, focando:
       - Clareza de estados.
       - Perceção de confiança e calma.
       - Compreensão imediata da ação principal.

2. **Evitar grandes refactors visuais nas próximas iterações**
   - Fixar o design system atual como “baseline v1”.
   - Nos próximos ciclos:
     - Alterar apenas via **tokens** (cores, espaços) e pequenos ajustes de componentes.
     - Manter layout e estrutura estáveis para não reabrir decisões fechadas.

---

### 5.5. Síntese final

- **Arquitetura**: está muito próxima da visão (FastAPI + React + DS baseado em tokens), com a diferença de o design system ainda não ser um módulo completamente separado e de o matching/geo estar numa versão inicial.
- **UI**: a implementação de atmospheric mobility UI, primary actions, cards, StatusHeader e ActivityPanel está fortemente alinhada com o documento – basicamente o que foi consolidado materializa a visão.
- **Faltas**: mapas, geolocalização, matching avançado, tracking de viagem e temas adicionais são os grandes “buracos” planeados.
- **Próximos passos**: agora o foco deve passar claramente para **funcionalidade real** (mapas, tracking, notificações, matching), mantendo o design system estável e evoluindo-o apenas via tokens e pequenos ajustes.

