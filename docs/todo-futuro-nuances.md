# Futuro — nuances, pequenos fixes, cuidados

Coisas que **não** vamos fazer neste momento, mas queremos **não esquecer** (conversas, produto, edge cases). Marca `[x]` se um dia fechares; acrescenta uma linha por tópico novo. Roadmap macro: [`TODO_CODIGO_TVDE.md`](TODO_CODIGO_TVDE.md).

**Decisão explícita:** o gate **motorista ↔ pin** (ponto contratual) está **correcto** para o core loop; o desvio **passageiro ↔ pin** (casa, CC, jardim, GPS fraco) **não** deve contaminar essa camada — trata-se de **camada 2** (feature / produto), não de bug do gate actual.

**Etiquetas** (rápidas de escanear daqui a semanas): `[UX]` · `[DATA]` · `[BACKEND]` · `[EDGE CASE]`

---

## Como pensar (arquitectura mental)

| Camada | Conteúdo                                                         | Onde está                                                            |
| ------ | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| **1**  | Simulação, estado, movimento, coerência visual com o **pin**     | Fechado no fluxo actual (ver [`todo-em-curso.md`](todo-em-curso.md)) |
| **2**  | Qualidade do pickup, precisão GPS, expectativa do **passageiro** | Esta lista                                                           |

---

## Pickup / passageiro vs pin no mapa

- [ ] [EDGE CASE] [UX] Cenário típico a antecipar: motorista **no pin** na rua, passageiro **~60 m+** (interior) — o app pode dizer “chegou” e o passageiro sentir que **não chegou nada**. Conflito de expectativa; resolver com regras de produto, não só copy solta.
- [ ] [EDGE CASE] [UX] O passageiro pode estar **dezenas de metros** do pin (casa, jardim, centro comercial): o raio motorista↔pin continua a medir o **contrato** no mapa, não “o bolso do passageiro”. Quando for altura: zona de chegada, confirmação “estou na rua”, ajuste de pin a última posição útil, etc.
- [ ] [UX] [DATA] Com **precisão** GPS má (ex. `accuracy` grande em metros), UX a sugerir **ajustar o pin na via** em vez de confiar só na posição automática.
- [ ] [UX] **Raio e histerese** configuráveis (ou por contexto): ex. 50 m → 70 m, limites com histerese para evitar **flicker** e calibrar zona densa vs via larga.

### Quando fores tratar isto — níveis (referência rápida)

- [ ] [UX] **Nível 1 (rápido):** aumentar raio (ex. 50 → 70 m), histerese na fronteira do raio.
- [ ] [UX] **Nível 2 (bom):** permitir **ajustar pin**; mensagens tipo “motorista chegou ao **ponto de recolha**” (contrato explícito).
- [ ] [DATA] [UX] **Nível 3 (forte):** detectar **baixa precisão** GPS; sugerir mover pickup; snapping inteligente à via.

---

## Dados e contrato

- [ ] [BACKEND] Garantir que `pickup` (lat/lng) é **fonte de verdade**; qualquer ajuste fino do passageiro **persiste** no registo da viagem (motorista, mapa, cobrança alinhados).
- [ ] [UX] Documentar para equipa / QA: textos de distância e regras de proximidade referem-se ao **pickup acordado**, não à posição bruta do passageiro em ambientes indoor.

---

_Última actualização: 2026-03-27_
