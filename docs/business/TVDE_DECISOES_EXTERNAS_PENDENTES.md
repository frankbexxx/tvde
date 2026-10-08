# TVDE — Decisões externas pendentes (Lei 59/2026 / piloto)

**Tipo:** perguntas e decisões a fechar — **sem soluções propostas**  
**Data:** 2026-10-08  
**Complementa (não substitui):** [`TVDE_DECISOES_PENDENTES_M2_M3_2026-09-25.md`](TVDE_DECISOES_PENDENTES_M2_M3_2026-09-25.md) · [`TVDE_59_2026_TECHNICAL_FINDINGS.md`](../architecture/TVDE_59_2026_TECHNICAL_FINDINGS.md)

**Legenda prioridade:** **P0** = antes de viagem real · **P1** = antes de Stripe Live · **P2** = pode esperar

---

## Manel / Operação

| # | Decisão / pergunta | P |
|---|-------------------|---|
| O1 | Quem é **exactamente** o operador TVDE das viagens do piloto? | **P0** |
| O2 | Os 4 motoristas pertencem a **que operador/frota**? | **P0** |
| O3 | **Que veículos** serão usados (matrículas, titular, seguro)? | **P0** |
| O4 | **Periodicidade** do acerto manual com motorista/parceiro. | **P0** |
| O5 | **Comprovativo / registo** do acerto manual (onde vive, quem assina). | **P0** |
| O6 | Quem suporta **refunds / chargebacks** operacionalmente? | **P1** |
| O7 | Quem **atende suporte / incidentes** (canal, horário, registo)? | **P0** |
| O8 | Quem **valida documentação** antes de activar motorista/veículo (processo humano)? | **P0** |

---

## Advogado / IMT

| # | Decisão / pergunta | P |
|---|-------------------|---|
| J1 | Como cumprir **validação IMT** operador / motorista / veículo no estado actual da app? | **P0** |
| J2 | Existe **mecanismo técnico oficial** disponível (API, plataforma, periodicidade)? | **P0** |
| J3 | Pode existir **processo manual temporário** aceitável? Em que condições e risco? | **P0** |
| J4 | O que conta exactamente como **«tempo de operação»** nas 10 h / 24 h (estados da viagem)? | **P0** |
| J5 | O que acontece a uma **viagem iniciada perto do limite**? | **P0** |
| J6 | Como tratar **cross-platform hours**? | **P1** |
| J7 | O **SOS actual** (112 + snapshot + share) cumpre o requisito legal? | **P0** |
| J8 | Que **contratos** plataforma ↔ operador ↔ motorista são obrigatórios e onde devem provar-se? | **P0** |
| J9 | Que **comunicações IMT/AMT** são obrigatórias (alterações, reporte, prazos)? | **P1** |
| J10 | Interpretação de **«conhecimento / devesse ter conhecimento»** para bloqueios (art. 14.º)? | **P0** |

---

## Contabilista / Fiscal

| # | Decisão / pergunta | P |
|---|-------------------|---|
| F1 | **Quem emite a factura** (ou documento equivalente) ao passageiro? | **P1** |
| F2 | Como é tratada a **comissão de 15%** (base, momento, prova)? | **P1** |
| F3 | **Base IVA** da comissão («≤ 25% sem IVA» — leitura aplicável). | **P1** |
| F4 | Como é feito o **acerto manual** contabilisticamente? | **P0** |
| F5 | Como são tratados **refunds / chargebacks** (contabilidade + comunicação ao passageiro)? | **P1** |
| F6 | Como **apurar contribuição AMT 5%** sobre taxas de intermediação? | **P1** |
| F7 | Que **documentação / ficheiros** produzir **mensalmente** (AMT, arquivo, arquivo viagens)? | **P1** |

---

## Seguradora

| # | Decisão / pergunta | P |
|---|-------------------|---|
| S1 | **Coberturas exigidas** para veículos/motoristas do piloto. | **P0** |
| S2 | **Processo em caso de sinistro** (contacto, prazos, quem comunica ao passageiro). | **P0** |

---

## Stripe / Manel

| # | Decisão / pergunta | P |
|---|-------------------|---|
| ST1 | Conta **business** em nome correcto (titular vs operador). | **P1** |
| ST2 | **KYB/KYC** Stripe concluído antes de Live. | **P1** |
| ST3 | **IBAN** e conta de liquidação. | **P1** |
| ST4 | **Responsável** legal da conta Stripe. | **P1** |
| ST5 | Quem terá **acesso operacional** ao Dashboard (refunds, disputas). | **P1** |
| ST6 | **Quando abrir Live** (gate explícito pós fase controlada). | **P1** |
| ST7 | Quem **autoriza refunds** (valor, motivo, registo). | **P1** |

---

## P2 — pode esperar (referência)

- OTP SMS real (decisão produto S-AUTH-01).
- Stripe Connect / payout automático ao motorista.
- Export/reporting AMT totalmente automatizado na app (volume inicial pode ser manual).
- Integração IMT plena **se** P0/P1 forem cobertos por processo manual **validado** (decisão J3).

---

**Estado:** documento vivo — fechar itens com data e responsável noutro acta (ex. [`VAMULA_DECISOES_OPERACIONAIS_2026-09-09.md`](VAMULA_DECISOES_OPERACIONAIS_2026-09-09.md)) quando decidido.
