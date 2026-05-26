# Inventário UI — Matriz consolidada (maio 2026)

**Modo:** READ-ONLY · 4 apps TVDE · Só features visíveis ao utilizador.

**Ficheiros por app:**
- [`INVENTARIO_UI_PASSENGER_2026-05.md`](INVENTARIO_UI_PASSENGER_2026-05.md)
- [`INVENTARIO_UI_DRIVER_2026-05.md`](INVENTARIO_UI_DRIVER_2026-05.md)
- [`INVENTARIO_UI_PARTNER_2026-05.md`](INVENTARIO_UI_PARTNER_2026-05.md)
- [`INVENTARIO_UI_ADMIN_2026-05.md`](INVENTARIO_UI_ADMIN_2026-05.md)

---

## MATRIZ FINAL (todas as apps)

| APP | FEATURE | VISÍVEL? | FUNCIONAL? | ESTADO | PRIORIDADE | BLOQUEIA FEATURE-COMPLETE? |
|-----|---------|----------|------------|--------|------------|----------------------------|
| Passenger | Pedido viagem (mapa+texto) | Sim | Sim | IMPLEMENTADA | — | Não |
| Passenger | Escolha destino/recolha | Sim | Sim | IMPLEMENTADA | — | Não |
| Passenger | Tipo veículo | Não | Não | — | Alta | Sim (TVDE) |
| Passenger | Estimativa preço | Sim | Não | MOCK | Alta | Sim (comercial) |
| Passenger | ETA pickup | Sim | Parcial | PARCIAL | Média | Não |
| Passenger | Motorista/veículo real | Não* | Não | MOCK | Alta | Sim |
| Passenger | Tracking | Sim | Parcial | PARCIAL | Média | Não |
| Passenger | Contacto motorista | Não | Não | — | Alta | Sim |
| Passenger | Cancelamento | Sim | Sim | IMPLEMENTADA | — | Não |
| Passenger | Rating | Sim | Sim | IMPLEMENTADA | — | Não |
| Passenger | Histórico | Sim | Parcial | PARCIAL | Média | Não |
| Passenger | Recibos | Não | Não | — | Alta | Sim |
| Passenger | Suporte | Não | Não | — | Média | Sim |
| Passenger | Locais guardados | Não | Não | — | Média | Não |
| Passenger | Viagem agendada | Não | Não | — | Baixa | Não |
| Passenger | Multi-paragem | Não | Não | — | Baixa | Não |
| Passenger | Favoritos | Não | Não | — | Baixa | Não |
| Passenger | Promoções | Não | Não | — | Baixa | Não |
| Passenger | Carteira/métodos pagamento | Sim | Parcial | PARCIAL | Alta | Sim |
| Passenger | Notificações push | Não | Não | — | Alta | Sim |
| Passenger | Safety/SOS | Não | Não | — | Alta | Sim |
| Passenger | Partilha viagem/ETA | Não** | Não | — | Média | Não |
| Passenger | Preferências viagem | Não | Não | — | Baixa | Não |
| Driver | Mapa + ofertas | Sim | Sim | IMPLEMENTADA | — | Não |
| Driver | Aceitar oferta | Sim | Sim | IMPLEMENTADA | — | Não |
| Driver | Rejeitar oferta | Não | Não | OCULTA | Alta | Não |
| Driver | Ciclo viagem | Sim | Sim | IMPLEMENTADA | — | Não |
| Driver | Navegação Waze/Google | Sim | Parcial | PARCIAL | Alta | Não |
| Driver | Rendimentos | Sim | Parcial | PARCIAL | Alta | Sim |
| Driver | Viagens histórico | Sim | Sim | IMPLEMENTADA | — | Não |
| Driver | Inbox | Sim | Não | PLACEHOLDER | Média | Não |
| Driver | Zonas | Sim | Sim | IMPLEMENTADA | — | Não |
| Driver | Categorias | Sim | Sim | IMPLEMENTADA | — | Não |
| Driver | Documentos | Sim | Parcial | PARCIAL | Alta | Sim |
| Driver | Modo Destino | Sim | Não | PLACEHOLDER | Média | Não |
| Partner | Gestão motoristas | Sim | Parcial | PARCIAL | Alta | Não |
| Partner | Frota métricas | Sim | Sim | IMPLEMENTADA | — | Não |
| Partner | Viagens lista | Sim | Parcial | PARCIAL | Média | Não |
| Partner | Exports CSV | Sim | Sim | IMPLEMENTADA | — | Não |
| Partner | Documentos (ficheiros) | Sim | Parcial | PARCIAL | Alta | Sim |
| Partner | Reassign | Sim | Parcial | PARCIAL | Alta | Não |
| Partner | Mapa live | Não | Não | — | Alta | Sim |
| Partner | Métricas avançadas | Sim | Não | PLACEHOLDER | Média | Não |
| Admin | Dashboard Agora | Sim | Sim | IMPLEMENTADA | — | Não |
| Admin | Users CRUD/block | Sim | Parcial | PARCIAL | Média | Não |
| Admin | Trips ops | Sim | Sim | IMPLEMENTADA | — | Não |
| Admin | Métricas | Sim | Sim | IMPLEMENTADA | — | Não |
| Admin | Health/anomalias | Sim | Sim | IMPLEMENTADA | — | Não |
| Admin | Documentos | Sim | Não | MOCK | Alta | Sim |
| Admin | Disputes | Não | Não | — | Alta | Sim |
| Admin | Refunds | Parcial | Parcial | PARCIAL | Alta | Sim |
| Admin | Logs/audit global | Parcial | Parcial | PARCIAL | Alta | Sim |
| Admin | Frota assign | Sim | Sim | IMPLEMENTADA | — | Não |
| Cross | Tema claro/escuro | Sim*** | Sim | IMPLEMENTADA | — | Não |
| Cross | App nativa | Não | Não | — | Média | Sim (stores) |
| Cross | Multi-idioma | Não | Não | — | Baixa | Não |

\* TripCard oculto em compact. \*\* Existe QR «partilhar app», não ETA viagem. \*\*\* Via Settings (oculto passageiro compact).

---

## Checklist Uber/Bolt — existência por app (secção 4 consolidada)

| FEATURE | Passenger | Driver | Partner | Admin |
|---------|-----------|--------|---------|-------|
| Pedido viagem | Parcial | — | — | Ops |
| Escolha destino | Sim | — | — | — |
| Tipo veículo | Não | — | — | — |
| Estimativa preço | Mock | Info | — | — |
| ETA | Parcial | Parcial | — | — |
| Motorista/veículo real | Mock | — | — | — |
| Tracking | Parcial | GPS upload | — | — |
| Contacto motorista/passageiro | Não | Não | Não | — |
| Cancelamento | Sim | Sim | — | Sim |
| Rating | Sim | Placeholder | — | — |
| Histórico | Parcial | Sim | — | Sim |
| Recibos | Não | — | — | — |
| Suporte | Não | — | — | Não |
| Locais guardados | Não | — | — | — |
| Viagem agendada | Não | — | — | — |
| Multi-paragem | Não | — | — | — |
| Favoritos | Não | — | — | — |
| Promoções | Não | — | Não | Não |
| Carteira/pagamento | Parcial | — | — | Reconcile |
| Notificações | Não | Não | Não | Não |
| Safety/SOS | Não | — | — | — |
| Partilha viagem | Não | — | — | — |
| Preferências | Não | Nav pref | — | — |
| Documentos | — | Parcial | Parcial | Mock |
| Rendimentos | — | Parcial | — | — |
| Viagens motorista | — | Sim | Sim | Sim |
| Inbox | — | Placeholder | — | — |
| Zonas | — | Sim | Parcial | — |
| Navegação | — | Parcial | — | — |
| Categorias | — | Sim | — | — |
| Frota | — | — | Parcial | Sim |
| Métricas | — | — | Sim | Sim |
| Exports | — | — | CSV | CSV |
| Disputes | Não | — | Não | Não |
| Refunds | — | — | — | Parcial |
| Logs/admin actions | — | Local report | — | Parcial |
| Gorjeta | Não | — | — | — |
| Chat in-app | Não | — | — | — |
| PIN pickup | Não | — | — | — |
| Surge pricing UI | Não | — | — | Não |
| Heatmap | — | Não | — | — |
| Cash out | — | Não | — | — |
| Mapa live frota | — | — | Não | — |
| Promo codes admin | — | — | — | Não |
| KYC workflow | — | — | — | Não |
| Push/Live Activity | Não | Não | — | — |
| App nativa | Web | Web | Web | Web |

**Legenda:** Sim = visível e funcional · Parcial = visível incompleto/mock · Mock/Placeholder · Não = gap · Ops = só backoffice.

---

## Resumo por app (feature-complete passageiro/motorista/parceiro/ops)

| App | MVP visível | Bloqueios principais FEATURE-COMPLETE |
|-----|-------------|--------------------------------------|
| **Passenger** | Pedir, track, cancel, rate | Motorista real, preço, recibos, push, SOS, pagamento fiável |
| **Driver** | Aceitar, viagem, zonas, cats | Payout, docs reais, reject, nav policy, push |
| **Partner** | Lista, add driver, CSV, reassign limitado | Mapa, docs PDF, remover driver, financeiro |
| **Admin** | Trips, users, health, frota | Documentos mock, disputes, refunds, audit global |

---

## Definições aplicadas

- **IMPLEMENTADA:** visível + fluxo user completo sem mock
- **PARCIAL:** visível + fluxo incompleto ou dados fake parciais
- **PLACEHOLDER / MOCK:** UI promete ou simula sem backend real
- **BOTÃO MORTO / OCULTA:** existe no código mas user não acede ou sem efeito
- Backend sem UI = **não existe para o user**
