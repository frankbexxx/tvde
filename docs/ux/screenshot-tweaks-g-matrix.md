# Grelha G01–G27 — screenshots Driver/Passenger

**Origem:** prints `_temp/Driver_Passenger_1…6.png` + notas Frank.  
**Fase:** **VER | ACERTAR | MUDAR** por cluster (não implementar código até decisão fechada por cluster ou PR acordado).  
**Premissas:** (1) shell **User** comum, roles derivam; (2) módulos reutilizáveis (`InfoPanel`, `ActionPanel`, …); (3) pontos que parecem só M ou só P muitas vezes são a mesma peça com props diferentes.

**Lista canónica operacional:** painel **2026-05-19** em [`TODOdoDIA.md`](../../TODOdoDIA.md).  
**Backlog técnico:** [`driver-ux-fixes-backlog.md`](driver-ux-fixes-backlog.md) (USER_SHELL).

---

## Clusters

| Cluster | Âmbito | IDs |
|---------|--------|-----|
| **A** | Cabeçalho + shell topo | G03, G04 (+ menu 4 ícones, faixa dicas) |
| **B** | Caixas de estado / mensagens | G05, G07, G09, G11, G15, G16, G20, G23 — **VAM fechado** |
| **C** | Oferta e acções de viagem | G08, G13, G17, G18 |
| **D** | Mapa (palco + pins) | G10, G14, G21, G22, G25 |
| **E** | Resumo / conclusão viagem | G24, G26, G27 |
| **F** | Específicos | G01, G02, G06, G12, G19 |

---

## Cluster A — VAM fechado (2026-05-19)

| ID | Ref. | Papel | Resumo | VAM | Decisão Frank |
|----|------|-------|--------|-----|----------------|
| **G03** | IMG01-P-03 | P | Nome + Perfil + Definições no topo | **ACERTAR** | Igual motorista: tirar do topo; Menu → Perfil |
| **G04** | IMG01-P-04 | P | PASSAGEIRO + Conta + data/hora | **ACERTAR** + **MUDAR** | Header compacto; **sem** texto «PASSAGEIRO»; data/hora junto ao wordmark |
| — | shell | M/P | Menu inferior 4 ícones | **Manter** | Mesma métrica; labels por role |
| — | shell | M/P | Faixa de dicas rotativas | **Manter** | Mesmo estilo; copy por role |

**Implementação:** **USER-SHELL-A** — variante `userCompact` em `/driver` e `/passenger` ([`AppHeaderBar.tsx`](../../web-app/src/components/layout/AppHeaderBar.tsx), [`routes/index.tsx`](../../web-app/src/routes/index.tsx)); testid `app-header-user-compact`. Merge **#321**.

---

## Cluster B — VAM fechado (plano USER-SHELL-B)

| ID | Decisão | Implementação |
|----|---------|---------------|
| **G05** | **ACERTAR** — uma caixa de espera | `InfoPanel`; `StatusHeader` oculto quando `PassengerStatusCard` activo |
| **G09** | **ACERTAR** — mesma moldura, variante empty + retry | `InfoPanel` tone `empty` em `SearchingDriverPhase` |
| **G07** | **ACERTAR** — hint fino | [`HintLine`](../../web-app/src/components/layout/HintLine.tsx) + `driver-map-offer-hint` |
| **G11** | **ACERTAR** — hint fino | `HintLine` em `ActiveTripActions` (`driver-next-step-hint`) |
| **G15** | **ACERTAR** — meta no painel principal | `buildTripMetaLines` (pagamento + distância) |
| **G16** | **ACERTAR** — cartão herói unificado | `InfoPanel` + `TripCard` footer |
| **G20** | **ACERTAR** — hint poll motorista | `HintLine` (`driver-trip-poll-hint`) |
| **G23** | **ACERTAR** — com G15 | `trackingHint` no `PassengerStatusCard` |

**Código:** [`InfoPanel.tsx`](../../web-app/src/components/layout/InfoPanel.tsx), [`PassengerStatusCard.tsx`](../../web-app/src/features/passenger/PassengerStatusCard.tsx), [`PassengerDashboard.tsx`](../../web-app/src/features/passenger/PassengerDashboard.tsx).

---

## G01–G27 — mapa completo (VAM pendente salvo clusters A e B)

| ID | Ref. | Papel | Resumo | Cluster | VAM |
|----|------|-------|--------|---------|-----|
| G01 | IMG01-M-01 | M | Topo mapa «Modo Destino – em breve» | F | Pendente |
| G02 | IMG01-M-02 | M | Estatuto · Disponível + Breve | F | Pendente |
| G03 | IMG01-P-03 | P | Header Perfil/Definições | A | **Fechado** |
| G04 | IMG01-P-04 | P | PASSAGEIRO + Conta + hora | A | **Fechado** |
| G05 | IMG02-P-01 | P | A procurar motorista… | B | **Fechado** |
| G06 | IMG02-P-02 | P | Espaço vazio antes Cancelar | F | Pendente |
| G07 | IMG02-H-01 | M | Hint «Toca no marcador» | B | **Fechado** |
| G08 | IMG03-M-01 | M | Painel aceitar completo | C | Pendente |
| G09 | IMG03-P-02 | P | Sem motoristas + retry | B | **Fechado** |
| G10 | IMG04-M-05 | M | Mapa palco cheio | D | Pendente |
| G11 | IMG04-M-06 | M | Confirma chegada… | B | **Fechado** |
| G12 | IMG04-M-07 | M | Recolha Waze/Google | F | Pendente |
| G13 | IMG04-M-08 | M | Iniciar + Cancelar | C | Pendente |
| G14 | IMG04-P-01 | P | Mapa + pins | D | Pendente |
| G15 | IMG04-P-02 | P | Pagamento + ~0 m | B | **Fechado** |
| G16 | IMG04-P-03 | P | Motorista a caminho | B | **Fechado** |
| G17 | IMG04-P-04 | P | Cancelar | C | Pendente |
| G18 | IMG05-M-04 | M | Terminar viagem | C | Pendente |
| G19 | IMG05-M-05 | M | Destino Waze/Google | F | Pendente |
| G20 | IMG05-M-06 | M | A actualizar estado… | B | **Fechado** |
| G21 | IMG05-M-07 | M | Pins mapa | D | Pendente |
| G22 | IMG05-P-01 | P | Mapa | D | Pendente |
| G23 | IMG05-P-02 | P | ~0 m | B | **Fechado** |
| G24 | IMG05-P-03 | P | Cartão viagem em curso | E | Pendente |
| G25 | IMG06-P-01 | P | Placeholder mapa concluída | D | Pendente |
| G26 | IMG06-P-02 | P | Cartão concluída + pagamento | E | Pendente |
| G27 | IMG06-M-03 | M | Overlay Concluída + Continuar | E | Pendente |

**Meta doc:** IMG06 — completar secção img 6 em notas Frank (commit com trabalho UX).

---

## Ligação TW-01 … TW-06

| TW | G / cluster |
|----|-------------|
| TW-01, TW-02 | G08 — cluster C |
| TW-03 | G24, G27 — cluster E |
| TW-04 | G13 + shell — cluster C |
| TW-05 | Revisão global pós-screenshots |
| TW-06 | G07 — cluster B |
