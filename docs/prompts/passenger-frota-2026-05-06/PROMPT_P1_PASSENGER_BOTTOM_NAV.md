# P1 — Barra inferior do passageiro (paridade com motorista)

## Objectivo

Substituir o botão flutuante **Menu** no topo do `PassengerSideMenu` por uma **barra fixa inferior**, no estilo `DriverBottomNav` + `ScreenContainer` (`bottomBarVariant="flush"`, `mainScrollId` para scroll ao **Início**).

## Requisitos

- Quatro destinos: **Início** | **Histórico** | **Conta** | **Menu** (o último abre o *sheet* no ecrã raiz do menu, com paridade ao tab **Menu** do motorista — toggle abrir/fechar quando aplicável).
- **Início:** fechar menu, `scroll` suave ao topo do contentor principal (id `passenger-main-scroll`).
- **Histórico / Conta:** abrir o *sheet* já na secção correspondente (reutilizar conteúdo actual do `PassengerSideMenu`).
- Elevar estado (`open`, `screen`) para `PassengerDashboard` (ou controlado por props) para o *bottom nav* poder abrir directamente em **Histórico** / **Conta**.
- **Não** regressões no CTA inferior de viagem (`Cancelar` / `Pedir nova viagem`): quando o painel de cancelamento estiver expandido, a barra de navegação pode ficar **oculta** (foco no fluxo de cancelamento). Com CTA principal visível, empilhar **CTA + barra** (padrão do motorista com *continue* + nav).
- `data-testid`: prefixo `passenger-bottom-nav-*` por tab, para E2E futuros.
- Acessibilidade: `aria-label` no `<nav>`, `aria-current` no tab activo.

## Não fazer

- Novas rotas React; sem mudanças de API.
- Alterar lógica de pedido de viagem além do estritamente necessário para o *chrome* inferior.

## Aceitação

- `npm run lint` e `npm run build` verdes.
- Smoke manual opcional: tabs abrem o *sheet* certo; Início fecha e faz scroll ao topo.
