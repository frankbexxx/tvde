# Relato do Piloto — Alpha 2026-04-25 (sáb Oeiras/Cascais)

> Ficheiro para preencher **em tempo real** durante a janela do piloto. Não exige editar em markdown elegante: basta acrescentar linhas rapidamente. Consolidar no fim (ou no domingo).
>
> **Referências:** [`ALPHA_2026-04-25.md §10`](ALPHA_2026-04-25.md) (checklist do dia) · [`ALPHA_2026-04-25.md §11`](ALPHA_2026-04-25.md) (plano de contingência) · [`ALPHA_2026-04-25_ONDA0_RUNBOOK.md §A/§E`](ALPHA_2026-04-25_ONDA0_RUNBOOK.md) (convocatória + contas).

---

## 0. Metadados da janela

| Campo | Valor |
|---|---|
| Data | sábado 2026-04-25 |
| Janela planeada | 10h00 – 12h00 |
| Zona | Oeiras ↔ Cascais |
| Ponto de encontro | _(preencher sexta)_ |
| Link app enviado | <https://tvde-app-j51f.onrender.com> |
| Grupo WhatsApp | `Alpha TVDE 25/04` |
| Admin observador | Frank (super_admin pessoal) + Alpha Admin dedicado |
| Release deploy | `68acf7c` (`main` após #177/#178/#179) |
| `BETA_MODE` em prod | `true` (confirmado na Onda 0) |

---

## 1. Cast

### Passageiros confirmados

| Nick | Nome real | Phone | Conta | Presente | Notas |
|---|---|---|---|---|---|
| Alpha P1 | | `+3519000000001` | ✅ criada | | |
| Alpha P2 | | `+3519000000002` | ✅ criada | | |
| Alpha P3 | | `+3519000000003` | ✅ criada | | |
| Alpha P4 | | `+3519000000004` | ✅ criada | | |
| Alpha P5 | | `+3519000000005` | ✅ criada | | |

### Motoristas confirmados

| Nick | Nome real | Phone | Veículo | Online | Notas |
|---|---|---|---|---|---|
| Alpha D1 | | `+3519000000011` | | | |
| Alpha D2 | | `+3519000000012` | | | |
| Alpha D3 (reserva) | | `+3519000000013` | | | |

---

## 2. T–90 min — preparação (8h30)

- [ ] Render dashboard aberto, backend up, logs sem alarmes.
- [x] Smoke D-1 real concluído sexta noite: casa (`Rua Caldas Xavier`) → **Oeiras Parque**, motorista aceitou, Waze abriu OK.
- [ ] Frank faz 1 viagem fantasma / health check para aquecer API (cold start Render).
- [ ] `GET /admin/system-health`: `stuck_payments`, `inconsistent_financial_state` registados.
- [ ] Spot-check login: P1 no Oppo Reno 13 · D1 no Oppo Reno 13 / telefone parceiro · Admin no PC.
- [ ] Sentry dashboard aberto (errors = 0 esperado).
- [ ] UptimeRobot dashboard aberto (ambos serviços Up).
- [ ] Oppo Reno 13 5G — setup concluído, permissões de localização, Chrome/Waze prontos. A13 fica backup.

**Snapshot Saúde T–90:**

```
stuck_payments: ___
trips_accepted_too_long: ___
trips_ongoing_too_long: ___
inconsistent_financial_state: ___
```

---

## 3. T 0 — janela aberta (10h00)

### Tabela de viagens (preencher por ordem)

| # | Hora | Pax | Driver | Origem → Destino | Estado final | Preço € | Nota / anomalia |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | Viagem inaugural (Nível 2 curto, ~2 km) |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |
| 6 | | | | | | | |
| 7 | | | | | | | |
| 8 | | | | | | | |

### Incidentes (se houver)

**Critérios:**
- **S1 (bloqueador):** viagem não se consegue concluir / pagamento não bate / app crasha / fluxo trava. Parar e decidir adiar.
- **S2 (irritante):** pode completar a viagem com contorno, mas UX degrada muito.
- **S3 (cosmético):** anota e continua.

| Hora | Severidade | Ecrã / role | Descrição | Como contornou |
|---|---|---|---|---|
| | | | | |

---

## 4. T +90 min — fecho (12h00)

- [ ] Confirmação no grupo "fechamos a janela, obrigado a todos".
- [ ] Motoristas offline ordenadamente.
- [ ] Nenhuma viagem presa em `accepted` / `arriving` / `ongoing` → se sim, cancelar com motivo "fim de alpha".
- [ ] `GET /admin/system-health` final:

```
stuck_payments: ___
trips_accepted_too_long: ___
trips_ongoing_too_long: ___
inconsistent_financial_state: ___
```

- [ ] Totais:
  - Viagens completadas: `___`
  - Viagens canceladas: `___`
  - S1 encontrados: `___`
  - S2 encontrados: `___`
  - S3 encontrados: `___`

---

## 5. Feedback directo dos testers (texto livre)

> Colar aqui mensagens WhatsApp relevantes (anonimizar se precisares de publicar).

```
(colar transcrições)
```

---

## 6. Acções imediatas pós-janela

- [ ] Agradecer no grupo.
- [ ] Pagar / fechar custos eventuais.
- [ ] Deixar retro para domingo → [`ALPHA_2026-04-25_RETRO.md`](ALPHA_2026-04-25_RETRO.md).
- [ ] Se houve S1: abrir issue GitHub com label `alpha-blocker`.
