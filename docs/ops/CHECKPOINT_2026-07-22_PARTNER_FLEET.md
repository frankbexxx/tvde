# Checkpoint — Partner-Fleet + hardenings (2026-07-22)

**`main` / `origin/main`:** `8c7cc9e`  
**Working tree:** limpa · **origin/main:** alinhado  

**Handoff vivo:** [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md) · [`TODOdoDIA.md`](../../TODOdoDIA.md)  
**PF3B runbook / smoke:** [`PARTNER_FLEET_3_VEHICLE_DOCUMENTS.md`](PARTNER_FLEET_3_VEHICLE_DOCUMENTS.md) · [`PARTNER_FLEET_3B_SMOKE_2026-07-22.md`](PARTNER_FLEET_3B_SMOKE_2026-07-22.md)

---

## 1. Estado da cadeia Partner-Fleet

| Slice | Tema | Estado |
|-------|------|--------|
| **PARTNER-FLEET-1A** | Roster Partner · métricas · CSV | **PASS** |
| **PARTNER-FLEET-2** | Viaturas · associação motorista↔viatura · categorias | **PASS** |
| **PARTNER-FLEET-3A** | Backend documentos viatura | **PASS** [#432](https://github.com/frankbexxx/tvde/pull/432) |
| **PARTNER-FLEET-3B** | UI documentos viatura | **PASS** funcional [#435](https://github.com/frankbexxx/tvde/pull/435) + fixes · docs [#443](https://github.com/frankbexxx/tvde/pull/443) |
| **PARTNER-FLEET-3C** | Alertas de caducidade | Próximo natural (não iniciado) |
| **PARTNER-FLEET-3D** | Compliance gates | Fora / mais tarde |

---

## 2. PRs fechadas nesta fase (relevantes)

### Documentos viatura (PF3)

| PR | Entrega |
|----|---------|
| [#432](https://github.com/frankbexxx/tvde/pull/432) | PF3A backend `vehicle_documents` |
| [#435](https://github.com/frankbexxx/tvde/pull/435) | PF3B UI painel Documentos |
| [#440](https://github.com/frankbexxx/tvde/pull/440) | Harden upload UX (>5 MB, PDF/JPG/PNG, expired priority) |
| [#441](https://github.com/frankbexxx/tvde/pull/441) | Expiry por data UTC (hoje ≠ expirado) |
| [#443](https://github.com/frankbexxx/tvde/pull/443) | Docs PF3B smoke **PASS** |

### Concorrência trips / frota

| PR | Entrega |
|----|---------|
| [#430](https://github.com/frankbexxx/tvde/pull/430) | Clear `active_vehicle_id` ao transferir/remover motorista |
| [#434](https://github.com/frankbexxx/tvde/pull/434) | Serialize fleet vehicle transfers |
| [#438](https://github.com/frankbexxx/tvde/pull/438) | Serialize trip reassignment × fleet transfer |
| [#442](https://github.com/frankbexxx/tvde/pull/442) | Serialize acceptance × fleet transfers |
| [#439](https://github.com/frankbexxx/tvde/pull/439) | Timeout `assigned→requested` não clobber reassign · limpa `driver_id` |

`main` tip após merges finais: **`8c7cc9e`** (merge #439).

---

## 3. Smoke geral Passenger / Driver / Partner — PASS

Smoke manual (3 janelas):

| Papel | Resultado |
|-------|-----------|
| Passenger | **PASS** |
| Driver | **PASS** |
| Partner | **PASS** |
| Fluxo viagem completo | **PASS** |

Fluxo observado:

1. Passenger cria viagem  
2. Driver aceita  
3. Driver inicia viagem  
4. Partner vê viagem em curso  
5. Driver termina viagem  
6. Passenger acompanha estado  
7. Partner abre detalhe da viagem  
8. CSV / métricas mantêm-se funcionais  

**Observação (não blocker):** caminho Partner/Admin para acompanhar viagem activa não é operacionalmente ideal → **OPS-UX-1** (abaixo).

---

## 4. PF3B documentos — PASS funcional

Checklist smoke final: ver [`PARTNER_FLEET_3B_SMOKE_2026-07-22.md`](PARTNER_FLEET_3B_SMOKE_2026-07-22.md).

| # | Passo | Resultado |
|---|--------|-----------|
| 1 | Validade **ontem** → Expirado | PASS |
| 2 | Validade **hoje** → não Expirado | PASS |
| 3 | Validade **futura** → não Expirado | PASS |
| 4 | Ficheiro **>5 MB** bloqueado antes do request | PASS |
| 5 | TXT / DOCX / tipo inválido bloqueado | PASS |
| 6 | PDF / JPG / PNG pequeno — upload OK | PASS |
| 7 | Download OK | PASS |
| 8 | Remover → **Em falta** | PASS |

Regras confirmadas:

- Tipos: PDF, JPG/JPEG, PNG · máx. **5 MB**
- Expiry por **data UTC** (não timestamp) · hoje ≠ expirado
- Substituir ficheiro → `pending_review`
- Retry pós-falha de upload sem prender em 409
- Download via helper fiável (`triggerBlobDownload`)

---

## 5. Hardenings de concorrência — resumo funcional

| Comportamento | Garantia |
|---------------|----------|
| Transfer / remove motorista de frota | Limpa `active_vehicle_id`; viatura não fica presa ao parceiro anterior |
| Assign / reassign / transfer | Serializam cenários críticos (`FOR UPDATE` / ordem estável) |
| Aceitar viagem × transfer frota | Não deixa trip activa no fleet errado (#442) |
| Timeout `assigned→requested` × reassign | Timeout não clobber; `driver_id` limpo (#439) |

---

## 6. Dívidas UX (não bloqueantes)

### OPS-UX-1 — Navegação operacional mobile-first

Partner/Admin vê a viagem, mas o caminho é: **Viagens → lista → última viagem → detalhe**.

Faltas observadas:

- Sem botão directo «Acompanhar viagem» no motorista / viagem activa  
- Sem botão «Actualizar» no detalhe  
- Sem live refresh simples no detalhe  
- Scroll longo pouco adequado a telemóvel  
- Métricas / viagens sem atalhos contextuais  

Direcção futura:

1. Partner Home — cartão «Viagem activa» + «Acompanhar»  
2. Frota — motorista «Em viagem» → «Ver viagem» → trip detail  
3. Trip detail — «Actualizar» + auto-refresh leve + estado claro  
4. Mobile-first — lista → detalhe; erros/acções junto ao item  

### PF3B-UX-FOLLOWUP — Painel documentos denso

Funcional, mas denso: vários docs + forms inline no mesmo scroll; erros no topo parecem globais.

Direcção: lista dos 4 tipos → detalhe/patamar por documento → erros junto ao form → evitar múltiplos forms abertos.

---

## 7. Próximas opções (escolher 1)

| Opção | Tema | Inclui | Fora |
|-------|------|--------|------|
| **A** | **PF3C** alertas de caducidade | Resumo por viatura · badges · «expira em X dias» · sem bloquear | Gates · Admin approval · IMT · OCR · S3 |
| **B** | **OPS-UX-1** navegação operacional | Acompanhar / Ver viagem / Actualizar / refresh leve / mobile | Redesign total Admin |
| **C** | Smoke alargado final | Pax+Driver+Partner+Admin · mock pay · rating · CSV · docs · frota | Novas features |

---

## 8. Arranque da próxima sessão

1. Confirmar `main` limpa (`git status`) e health OK.  
2. Escolher **um** carril: **A** PF3C · **B** OPS-UX-1 · **C** smoke alargado.  
3. Não misturar com bot PRs / scope alheio sem decisão explícita.

**Ambiente:** `scripts/windows/Open-TVDE-Dev-WT.bat`. Baseline demo: Pax / Driver / Partner / Admin SA habituais.

---

## 9. Fora de scope deste checkpoint

Docs-only. Sem alterações runtime · sem migrations · sem env/secrets · sem DB cleanup · sem workflows.
