# Inventário UI — Motorista (maio 2026)

**Modo:** READ-ONLY · Só features **visíveis no ecrã**.

**Rota:** `/driver` → `DriverDashboard.tsx` · Config: bottom nav ON, home two-step OFF.

---

## 1. FEATURES IMPLEMENTADAS VISÍVEIS

| FEATURE | ONDE APARECE NO UI | FLUXO USER | ESTADO | FICHEIROS | NOTAS |
|---------|-------------------|------------|--------|-----------|-------|
| Mapa imersivo | Ecrã Início | Abrir /driver | IMPLEMENTADA | `DriverDashboard.tsx`, `MapStage.tsx` | |
| Bottom nav 4 tabs | Rodapé | Início / Rendimentos / Caixa / Menu | IMPLEMENTADA | `DriverBottomNav.tsx` | |
| Online/offline micro-toggle | Canto mapa | Tap pino verde/vermelho | IMPLEMENTADA | `DriverMapAvailabilityMicroToggle.tsx` | |
| Tocar mapa → online | Mapa offline | Tap mapa | IMPLEMENTADA | `DriverDashboard.tsx` | |
| Lista ofertas no mapa | Marcadores + sheet | Poll 4s | IMPLEMENTADA | `DriverDashboard.tsx` | |
| Aceitar oferta (slide) | RequestCard sheet | Marcador → deslizar aceitar | IMPLEMENTADA | `RequestCard.tsx`, `SlideToAccept.tsx` | |
| Ciclo viagem activa | Sheet alto | Accept→iniciar→terminar | IMPLEMENTADA | `ActiveTripActions.tsx` | |
| Gate distância pickup | Texto acima botão | ~150m antes iniciar | IMPLEMENTADA | `ActiveTripActions.tsx`, `driverPickupGate.ts` | |
| Cancelar viagem + motivos | Botão + painel | Presets PT | IMPLEMENTADA | `ActiveTripActions.tsx` | |
| Nav externa auto Waze/Google | Toast (sem botões) | Aceitar→recolha; Iniciar→destino | PARCIAL | `openDriverExternalNav.ts` | 2× abertura |
| Overlay viagem concluída | Sheet | Continuar | IMPLEMENTADA | `TripSummary.tsx` | |
| Rendimentos semanais | Menu / tab | Soma client-side histórico | IMPLEMENTADA | `DriverOperationsMenu` | |
| Histórico viagens | Menu → Viagens | Lista + detalhe dialog | IMPLEMENTADA | idem | Poll 10s |
| Categorias veículo | Menu → Categorias | Toggle grid → PATCH | IMPLEMENTADA | idem | Mín. 1 activa |
| Zonas v1 | Menu → Zonas | Sessão, budget, Cheguei, extensão | IMPLEMENTADA | idem, `api/driverZones` | |
| Preferência nav Waze/Google | Menu → Navegação | Toggle persiste | IMPLEMENTADA | `driverNavPreference.ts` | |
| Documentos motorista | Menu → Documentos | 6 docs, estados, enviar revisão | PARCIAL | `DriverOperationsMenu`, `driverDocuments.ts` | Sem upload ficheiro |
| Compliance horas condução | Banner mapa | Bloqueio/aviso | PARCIAL | `DriverDashboard.tsx` | Copy genérica |
| Sons oferta/aceite | Audio | Automático | IMPLEMENTADA | `useDriverOfferSounds.ts` | Sem pref volume |
| Side menu completo | Sheet esquerdo | 11 entradas + Sair | IMPLEMENTADA | `DriverSideMenu.tsx` | |
| Filtro categorias ofertas | Sheet/lista | Contador «fora categorias» | IMPLEMENTADA | `DriverDashboard.tsx` | |
| Preços (estimativa) info | Menu | `<details>` explicativo | IMPLEMENTADA | `DriverSideMenu.tsx` | Informativo |
| Conta/perfil | Menu → Perfil → eventos | Modal via trigger oculto | IMPLEMENTADA | `ProfileButton`, `SettingsButton` | opacity-0 |

---

## 2. FEATURES VISÍVEIS MAS NÃO IMPLEMENTADAS

| FEATURE | ONDE APARECE | O QUE PROMETE | O QUE FALTA | FICHEIROS | PRIORIDADE |
|---------|--------------|---------------|-------------|-----------|------------|
| Modo Destino | Chip topo mapa | Filtrar destinos | «em breve», pointer-events-none | `DriverDashboard.tsx` | Média |
| Rating motorista | Header legado ops | Avaliar | «Rating: em breve» (OCULTA com bottom nav) | `DriverOperationsMenu` | Baixa |
| Caixa de entrada | Menu / tab Caixa | Avisos partner | «Ainda sem avisos… nesta versão» | `DriverOperationsMenu` | Média |
| Reportar ocorrência | Histórico viagens | Enviar report | `window.prompt` → local toast | `DriverDashboard.tsx` | Baixa |
| Botões Nav Recolha/Destino | Copy menu Navegação | Re-nav manual | Só mencionados no texto | `DriverOperationsMenu` | Média |
| Pedido excepção zona esgotada | Zonas alerta | Pedir ao partner | «em breve poderás enviar…» | `DriverOperationsMenu` | Baixa |
| REJEITAR oferta | RequestCard | Rejeitar dispatch | UI existe; `onReject` nunca passado | `RequestCard.tsx` | Alta |
| Gate documentos | Documentos toggle | Bloquear online | Desligado por defeito «Em teste» | `DriverOperationsMenu` | Média |
| Mock GPS DEV | Banner mapa | Simulação | Só DEV/?demo=1 | `mockLocation.ts` | N/A prod |

---

## 3. FEATURES NÃO VISÍVEIS MAS EXISTENTES NO CÓDIGO

| FEATURE | EXISTE ONDE | PORQUE NÃO CONTA | COMO TORNAR VISÍVEL |
|---------|-------------|------------------|---------------------|
| DriverShellTopChips | `DriverShellTopChips.tsx` | Nunca importado | Importar no dashboard |
| Home two-step | `DriverDashboard.tsx` | Flag false | `isDriverHomeTwoStepEnabled()` |
| WS ofertas | Backend `/ws/driver/offers` | Zero cliente FE | Wire WebSocket |
| rejectDriverOffer API | `api/driver.ts` | Sem `onReject` UI | Passar handler RequestCard |
| BetaAccountPanel Início | `DriverDashboard.tsx` | Só sem bottom nav | N/A (menu cobre) |
| warmDriverNavSessionIfNeeded | helper | Nunca chamado | Chamar antes nav |
| Histórico inline Início | `DriverDashboard.tsx` | map stage layout | Layout legado |

---

## 4. FEATURES ESPERADAS TIPO UBER/BOLT QUE FALTAM

| FEATURE | APP | EXISTE? | GAP | PRIORIDADE |
|---------|-----|---------|-----|------------|
| Aceitar/rejeitar oferta | Driver | Parcial | Sem reject UI | Alta |
| ETA / navegação | Driver | Parcial | Auto Waze 2×; sem in-app | Alta |
| Tracking GPS upload | Driver | Sim | Poll/report OK | — |
| Rendimentos | Driver | Parcial | Soma local; sem payout | Alta |
| Inbox | Driver | Placeholder | Copy estática | Média |
| Zonas | Driver | Sim | v1 funcional | — |
| Categorias | Driver | Sim | — | — |
| Documentos | Driver | Parcial | Metadata; sem PDF | Alta |
| Modo Destino | Driver | Placeholder | Chip decorativo | Média |
| Auto-accept / filtros | Driver | Não | — | Média |
| Heatmap procura | Driver | Não | — | Baixa |
| Incentivos/quests | Driver | Não | — | Baixa |
| Cash out / instant pay | Driver | Não | — | Alta |
| Portagens UI | Driver | Não | — | Média |
| Foto perfil + rating passageiro | Driver | Não | — | Média |
| Timer espera pickup / no-show | Driver | Parcial | Gate distância só | Média |
| Notificações push | Driver | Não | — | Alta |
| Re-nav manual 1-tap | Driver | Não | Copy mente | Média |
| Alertas som configuráveis | Driver | Não | — | Baixa |

---

## 5. MATRIZ FINAL (Motorista)

| APP | FEATURE | VISÍVEL? | FUNCIONAL? | ESTADO | PRIORIDADE | BLOQUEIA FEATURE-COMPLETE? |
|-----|---------|----------|------------|--------|------------|----------------------------|
| Driver | Aceitar viagem (slide) | Sim | Sim | IMPLEMENTADA | — | Não |
| Driver | Reject oferta | Não | Não | OCULTA | Alta | Não |
| Driver | Ciclo viagem completo | Sim | Sim | IMPLEMENTADA | — | Não |
| Driver | Nav externa | Sim | Parcial | PARCIAL | Alta | Não (F-NAV-1) |
| Driver | Rendimentos/payout | Sim | Parcial | PARCIAL | Alta | Sim (comercial) |
| Driver | Inbox partner | Sim | Não | PLACEHOLDER | Média | Não |
| Driver | Documentos TVDE | Sim | Parcial | PARCIAL | Alta | Sim (legal ops) |
| Driver | Push ofertas | Não | Não | — | Alta | Sim (piloto) |
