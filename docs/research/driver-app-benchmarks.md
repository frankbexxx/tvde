# Benchmarks e inspiração — app motorista / passageiro

Referências externas e notas de pesquisa (não são especificação implementável por si só). Última revisão: **2026-05-01**.

---

## Princípio de produto (equipa)

- Objectivo: **ajudar motoristas e passageiros**; evitar regras **restritivas** excepto quando **necessárias** (ex.: pandemia, evento de grande impacto operacional ou legal).

---

## 1. Blogs / tutoriais (motorista)

| Fonte | Uso |
|--------|-----|
| [The Rideshare Guy — 8 hidden Uber driver features](https://therideshareguy.com/8-hidden-features-of-the-uber-driver-app/) | Micro-UX: chegar, última viagem, métricas no topo, etc. |
| [The Rideshare Guy — Uber destination filter](https://therideshareguy.com/how-does-ubers-destination-filter-work/) | Mental model: 2 usos/dia, direcção vs destino fixo, quando consome. |
| [The Rideshare Guy — Lyft driver app tutorial](https://therideshareguy.com/how-to-use-lyft-app/) | Location filters (stay in area / head to destination), bonus slide-up, nav Waze/Lyft Maps, toggle Lyft↔Waze. |

**Screenshots no repo (assets):** capturas Uber/Lyft offline, navegação, menu, pedido entrante, split-screen — ver pasta `assets/` referenciada nas sessões Cursor.

---

## 2. Fluxo passageiro (web)

| Fonte | Uso |
|--------|-----|
| [Uber — fluxo “Obter uma viagem” (exemplo)](https://www.uber.com/go/home) | Mapa + painel lateral; promo no topo; recolha/destino/horário/“para mim”. |

---

## 3. Decisões com Manel (2026-05-01) — resumo

- **QR:** códigos para download **Driver** e **Passenger**.
- **Portagens:** dois percursos (rápido vs barato); preferência em **Conta** + **Definições**; recalcular **sempre** se o percurso mudar (cortes, etc.) — detalhe técnico **TODO**; só pagamentos que permitam **extras**; UX dinâmica se a viagem puder incluir portagens.
- **Ecrã:** persistir visibilidade da app para o motorista ver o estado (alinhar com wake lock / política “quando”).
- **Wireframes (4×15):** ecrã principal (mapa, M, GO, HOME|EARNINGS|INBOX|MENU); ecrã mapa (ESTATUTO, DIAMOND, **LUPA** = modo destino/zona; DEFINIÇÕES|VIATURAS|MENU).
- **Tiers:** **DIAMOND** (ex.: ~1800 viagens / 3 meses no caso real citado), Silver, Gold — programa tipo Pro (referência Uber).
- **2 mudanças de zona / dia:** **confirmado** — pernadas no caminho até à zona-alvo **não consomem** o uso; consumo na **1.ª viagem concluída** na zona-alvo (alinhado a `DRIVER_MENU_SPEC.md`).
- **Lista de viagens:** percurso, mapa, distância, duração, preço, avaliação, …; retenção mínima **2 anos** (legal/ops a validar).
- **Registo criminal:** renovação / entrega **de 3 em 3 meses** (processo + compliance).
- **Aeroporto Lisboa:** zona de espera tipo fila **Uber/Bolt** — referência para futura **zona dinâmica** / operações.

---

## 4. Pesquisa ainda útil (opcional)

- Pós-rejeição / timeout no cartão de pedido (UX + som) — ver spec interna alinhada com A.
- “Última viagem” antes de offline; mensagem **apelativa** ao passageiro (sem soar a ignorado).
- Segurança **em viagem activa** (vs só definições offline).

---

## 5. O que não priorizar aqui

- Requisitos legais US, listas longas de concorrentes, papers de incentivos até haver motor de pricing/incentivos.
