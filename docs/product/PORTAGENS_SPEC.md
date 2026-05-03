# Portagens em viagem — especificação técnica mínima (v0 → v1)

Documento **canónico** para evolução do produto após decisões com **Manel** (2026-05-01), resumidas em [`docs/research/driver-app-benchmarks.md`](../research/driver-app-benchmarks.md) §3.  
Complementa [`DRIVER_MENU_SPEC.md`](DRIVER_MENU_SPEC.md) (preço estimado vs final no menu) e o motor de preço actual em [`backend/app/core/pricing.py`](../../backend/app/core/pricing.py) + OSRM opcional.

**Estado:** especificação **sem** implementação de cálculo de portagens no backend; define fases, dados e riscos para PRs futuras.

---

## 1. Contexto e objectivo

- Em Portugal, portagens afectam **percurso**, **tempo** e **custo**; motoristas e passageiros precisam de **previsibilidade** e de **reacção a mudanças** (cortes de estrada, desvios, Waze vs percurso «oficial»).
- Decisão de produto: oferecer **dois percursos** quando fizer sentido (ex.: **mais rápido** vs **mais barato / sem portagens**); preferência guardada em **Conta / Definições**; **recalcular** quando o percurso efectivo mudar; só cobrar **extras** quando o método de pagamento o permitir; UX **dinâmica** se a viagem puder incluir portagens.

---

## 2. Princípios (v1 alvo)

1. **Transparência** — o passageiro vê **estimativa** antes de pedir; o **preço final** continua a regra actual (fim de viagem), com **itemização** de portagens quando existir dados fiáveis.
2. **Preferência persistente** — `rápido` | `económico` (nomes finais em PT na UX) por utilizador (motorista e/ou passageiro conforme ecrã).
3. **Re-cálculo contínuo** — qualquer evento que altere distância/duração relevante (OSRM, GPS agregado, cancelamento de portagem simulada) **dispara** novo cálculo; não «congelar» silenciosamente a estimativa inicial se o contracto de pagamento permitir ajuste.
4. **Pagamentos** — extras de portagem só quando o **modelo de pagamento** suportar captura ou ajuste pós-viagem (ver §5); caso contrário, **copy** e **limites** claros na reserva.
5. **Não bloquear dispatch** — na v1 técnica, a ausência de dados de portagem **não** deve impedir `requested` → `accepted`; degradação = só percurso OSRM/Haversine sem linha de portagem.

---

## 3. Modelo de dados sugerido (fases)

### 3.1 Viagem (`trips`)

- `toll_preference` (enum opcional): `fastest` | `cheapest` | `null` (herdar definição do actor que iniciou o pedido).
- `toll_estimate_cents` (nullable int) — soma estimada de portagens na **criação** ou último **re-quote**.
- `toll_final_cents` (nullable int) — fecho após viagem quando houver reconciliação.

### 3.2 Percurso / leg (futuro)

- Tabela ou JSON versionado: `route_variant` (`fastest` \| `cheapest`), `polyline` ou referência OSRM, `distance_m`, `duration_s`, `toll_breakdown[]` (`operator`, `segment`, `amount_cents`, `source`).

### 3.3 Utilizador / motorista

- `default_toll_route_preference` alinhado ao enum acima (espelho ou partilhado com preferência de navegação **só** se produto decidir correlacionar; por defeito **campos separados**).

---

## 4. API e fases de entrega

| Fase | Entregável | Notas |
|------|------------|--------|
| **v0** (actual) | Preço = `BASE_FARE + km× + min×`; OSRM opcional | Sem linha de portagem. |
| **v0.5** | Spec + flags na BD **nullable** + copy no app | Sem fornecedor de portagens; preparar migrações. |
| **v1** | Integração **fornecedor** ou tabela estática de praças + duas variantes de rota | Escolher API (ex. provedores com cobertura PT) ou **curadoria** inicial por corredor; custo + compliance. |
| **v1.1** | Re-quote em `ongoing` + notificação passageiro | Depende de Stripe / modelo de extras (§5). |

Endpoints sugeridos (não implementados nesta spec):

- `GET /routing/quote` — origem/destino + preferência → duas variantes + totais.
- `PATCH /passenger/trips/{id}/toll-preference` — antes de `accepted`, se permitido.

---

## 5. Pagamentos (Stripe) e extras

- Mapear **PaymentIntent** actual: **montante fixo** ao pedido vs **captura posterior** com valor máximo.
- Portagens reais podem **diferir** da estimativa: definir política **teto** (passageiro aceita até X% acima) ou **facturação** manual operacional em casos extremos.
- **Motorista**: reembolso / repasse de portagem paga em caixa — **fora** do âmbito técnico v1 salvo regra explícita do partner.

---

## 6. UX (resumo)

- **Passageiro** — selector ou toggle curto no pedido; texto «Pode haver portagens; estimativa pode subir até…» quando aplicável.
- **Motorista** — alinhar com preferência de **navegação** (Waze/Google): o primeiro botão abre a app coerente com o percurso **aceite**; recalcular labels se a viagem mudar de variante.
- **Admin / partner** — relatório simples de viagens com `toll_final_cents` nulo vs preenchido (auditoria).

---

## 7. Riscos e dependências

- **Fornecedor de dados** — cobertura PT, latência, ToS, custo por chamada.
- **Qualidade OSRM** — não inclui portagens por defeito; combinar com camada de custos.
- **Legal / TVDE** — facturação e IVA em extras; validar com parceiro antes de «cobrar portagem» explícita no recibo.

---

## 8. Fora de âmbito (v1 deste documento)

- Paridade com apps agregadoras (Uber/Bolt) em tempo real de praças dinâmicas.
- Integração com matrículas / descontos de portagem por classe de veículo.

---

## 9. Referências cruzadas

- [`driver-app-benchmarks.md`](../research/driver-app-benchmarks.md) §3 — bullet portagens.
- [`DRIVER_MENU_SPEC.md`](DRIVER_MENU_SPEC.md) §7.4 — copy estimativa vs final no menu motorista.

_Última revisão: 2026-05-03_
