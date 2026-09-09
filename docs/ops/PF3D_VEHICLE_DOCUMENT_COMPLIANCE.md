# PF3D-0 — Vehicle Document Compliance Gates (decisão / arquitectura)

**Estado:** **PF3D-0…3B** em main · **PF3D-3 / G-KYC-P0-04 ON em PROD** (smoke PASS 2026-09-09) · UX rica Admin (PF3D-4) e IMT/A6 processo **ainda abertos**.  
**`main`:** ≥ `ce106bb` · smoke ON: [`G_KYC_P0_04_GATE_ON_SMOKE_PASS_2026-09-09.md`](./G_KYC_P0_04_GATE_ON_SMOKE_PASS_2026-09-09.md) · smoke 3A/OFF: [`PF3D_3A_OFF_SMOKE_PASS_2026-07-26.md`](./PF3D_3A_OFF_SMOKE_PASS_2026-07-26.md) · smoke 3B/OFF: [`PF3D_3B_OFF_SMOKE_PASS_2026-07-27.md`](./PF3D_3B_OFF_SMOKE_PASS_2026-07-27.md)
**Pré-condição:** PF3C **PASS** — [`PF3C_VEHICLE_DOCUMENT_ALERTS_SMOKE_PASS_2026-07-24.md`](./PF3C_VEHICLE_DOCUMENT_ALERTS_SMOKE_PASS_2026-07-24.md)  
**Cadeia:** [`PARTNER_FLEET_3_VEHICLE_DOCUMENTS.md`](./PARTNER_FLEET_3_VEHICLE_DOCUMENTS.md)  
**Handoff:** [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md)

---

## 1. Estado actual

| Facto | Detalhe |
|-------|---------|
| **PF3C** | Alertas / visibilidade documental — **sem** gates operacionais |
| **`document_summary`** | Existe em `GET /partner/vehicles` (batch BE); badges Viaturas + alerta Home |
| **Matching** | **Não** lê `active_vehicle_id` nem `vehicle_documents` / `document_summary` |
| **Categorias matching** | Vêm do **driver** (`vehicle_categories`); não da viatura (`service_categories`) |
| **`active_vehicle_id`** | Existe (assign/unassign Partner); **não** é gate em online / matching / accept / start |
| **Docs pessoais motorista** | Gate **FE** (`isDriverDocumentsReady`) em prod; backend `go_online` não valida docs pessoais |
| **Docs viatura** | Só alertas Partner (PF3C) — zero enforcement |

**Espelhos de gates já existentes (para PF3D futuro):** driving hours (`driving_hours_blocked` em accept + `go_online`); categoria em accept (`forbidden_vehicle_category`); `DriverStatus.approved` no dispatch.

---

## 2. Matriz de compliance proposta

Legenda efeitos: **OK** · **alerta** · **bloquear** (só se gates activados) · **não hard-block** · **decisão aberta** · **—** (n/a).

| Estado / condição | Alerta (PF3C) | Assign viatura | Driver online | Matching | Aceitar trip | Iniciar trip | Override futuro |
|-------------------|---------------|----------------|---------------|----------|--------------|--------------|-----------------|
| `valid` | — | OK | OK | OK | OK | OK | — |
| `expiring_soon` | alerta | OK | OK | OK | OK | OK | — |
| `pending_review` | alerta | OK | **decisão A/B** | **decisão A/B** | **decisão A/B** | ver E | futuro |
| `missing` | alerta | não hard-block | **bloquear*** | **bloquear*** | **bloquear*** | ver E | futuro |
| `expired` | alerta | não hard-block | **bloquear*** | **bloquear*** | **bloquear*** | ver E | futuro |
| `expired_pending` | alerta | não hard-block | **bloquear*** | **bloquear*** | **bloquear*** | ver E | futuro |
| `rejected` | alerta | não hard-block | **bloquear*** | **bloquear*** | **bloquear*** | ver E | futuro |
| Sem `active_vehicle_id` | — | n/a | **decisão A** | **decisão A** | **decisão A** | ver E | — |

\* Se / quando gates backend estiverem activados (PF3D-3+). Até lá: só alerta (PF3C).

### Regras de produto propostas (matriz)

| Tema | Proposta |
|------|----------|
| **`valid`** | OK em tudo |
| **`expiring_soon`** | **Alerta apenas** — não bloquear |
| **`pending_review`** | Decisão aberta — proposta conservadora: **alerta primeiro**; bloquear só se decisão produto/legal |
| **`missing` / `expired` / `expired_pending` / `rejected`** | Alerta agora; **bloquear online / matching / accept** quando gates activados |
| **Sem `active_vehicle_id`** | Decisão aberta — proposta: **bloquear** online / matching / accept quando gates por viatura; **antes:** auditoria / backfill de viaturas activas |
| **`start_trip`** | **Não bloquear** se a viagem já está `accepted` / `arriving` — gates devem prevenir **antes** (online / matching / accept) |
| **Assign viatura** | **Não hard-block** — Partner prepara frota/documentos; avisar, não impedir assign |

---

## 3. Decisões em aberto (A–E)

Fechar **antes** de PF3D-3 (gates). Helper (PF3D-1) e API read-only (PF3D-2) podem avançar com defaults provisórios alinhados às propostas abaixo.

### A. `active_vehicle_id` obrigatório?

| | |
|--|--|
| **Pergunta** | Exigir viatura activa para online / matching / accept? |
| **Proposta** | **Sim** — gates documentais ancoram na viatura activa |
| **Pré-condição** | Auditoria da frota actual + backfill / atribuição **antes** de ligar gates |
| **Estado** | **Aberta** |

### B. `pending_review` bloqueia?

| | |
|--|--|
| **Pergunta** | Motorista/viatura com docs em revisão fica fora de operação? |
| **Proposta inicial** | **Não bloquear** — só alerta (PF3C) |
| **Alternativa** | Bloquear até revisão / Admin approval |
| **Estado** | **Aberta** |

### C. Partner force-online respeita gates?

| | |
|--|--|
| **Pergunta** | `set_partner_driver_availability` (force online) ignora compliance? |
| **Proposta** | **Sim, respeitar** os mesmos gates backend — senão vira bypass |
| **Estado** | **Fechado em código** (Partner force-online + Admin recover-driver); flag continua **OFF** |

### D. Partner reassign valida docs / viatura?

| | |
|--|--|
| **Pergunta** | Reassign operacional valida novo motorista + `active_vehicle_id` + docs? |
| **Proposta** | **Sim** — validar antes de reassign |
| **Estado** | **Aberta** |

### E. `start_trip` bloqueia por docs?

| | |
|--|--|
| **Pergunta** | Recusar start se docs da viatura estiverem inválidos? |
| **Proposta** | **Não** — evitar bloquear motorista já no local; prevenir em online / matching / accept |
| **Estado** | **Aberta** (proposta forte: não bloquear) |

---

## 4. Pontos de inserção futuros (sem alterar código)

Listagem de candidatos — **não** implementar nesta fase:

| Área | Local (futuro) |
|------|----------------|
| Matching | `offer_dispatch.create_offers_for_trip` |
| Redispatch | loops equivalentes em `offer_dispatch` / location redispatch |
| Accept | `trips.accept_offer`, `trips.accept_trip` |
| Online | `driver_status.go_online` |
| Lista pool | `list_available_trips` |
| Partner reassign | `partner_trip_ops` (reassign driver) |
| Partner force availability | `partner_fleet` set availability |
| FE Driver | `DriverDashboard` — mensagens / gate UX |
| FE Partner / Admin | mensagens de bloqueio / CTA documentos |
| Ops | `debug_routes` / root_cause (opcional) |

**Helper a reutilizar (quando PF3D-1):** `document_summary_for_vehicle` / `summarize_vehicle_documents_rows` / `_WORST_STATUS_RANK` em `partner_vehicle_documents.py`.

**Espelho de padrão:** `assert_driver_can_accept_by_driving_hours` + 409 `driving_hours_blocked` em `go_online`.

---

## 5. Fases propostas

| Fase | Tema | Bloqueia ops? | Estado (2026-07-27) |
|------|------|---------------|---------------------|
| **PF3D-0** | Docs-only — decisão / matriz (este ficheiro) | Não | **PASS** |
| **PF3D-1** | Backend helper puro: `vehicle_compliance_status` · `vehicle_is_compliant` + pytest — **sem** wiring operacional | Não | **PASS** (#459) |
| **DATA-1A…1E** | Audit / suggest / apply local / seed docs dummy / re-audit | Não (scripts) | **PASS** — [`PF3D_DATA_1E_REAUDIT_AFTER_DEV_SEED.md`](./PF3D_DATA_1E_REAUDIT_AFTER_DEV_SEED.md) |
| **PF3D-2** | API read-only — expor `compliance_status` — **sem** bloqueio | Não | **PASS** (#466) |
| **PF3D-3A** | Gates atrás de `ENABLE_VEHICLE_COMPLIANCE_GATES` (default código **false**) | Só se flag ON | **PASS** código (#467 + #468) · smoke OFF · **PROD ON** [`G_KYC_P0_04_GATE_ON_SMOKE_PASS_2026-09-09.md`](./G_KYC_P0_04_GATE_ON_SMOKE_PASS_2026-09-09.md) |
| **PF3D-3B** | Mensagens / observabilidade (i18n + CTA + logs) — **sem** activar flag | Não | **PASS** código (#486) · smoke **OFF** [`PF3D_3B_OFF_SMOKE_PASS_2026-07-27.md`](./PF3D_3B_OFF_SMOKE_PASS_2026-07-27.md) · DIAG [`PF3D_3B_GATE_MESSAGES_DIAG_2026-07-27.md`](./PF3D_3B_GATE_MESSAGES_DIAG_2026-07-27.md) |
| **PF3D-3** | Ligar gates globalmente / ON em prod | **Sim** | **DONE (G-KYC-P0-04)** — flag ON PROD + smoke PASS 2026-09-09; IMT/docs pessoais/PF3D-4 **não** incluídos |
| **PF3D-4** | FE mensagens ricas Driver / Partner / Admin (além do mínimo 3B) | UX | **Parcial** — códigos bloqueantes (`vehicle_inactive` + compliance) mapeados PT/EN Driver/Partner (G-KYC-P0-04 FE); UX rica/Admin still pending |
| **PF3D-5** | Override Admin / Partner — só se necessário | Controlo ops | Pendente |

---

## 6. Riscos

| Risco | Impacto |
|-------|---------|
| Frota sem `active_vehicle_id` | Matching / online / accept param se gate exigir viatura |
| `pending_review` demasiado estrito | Frota parada à espera de review |
| Gate **só FE** | Bypass via Partner force-online / API directa |
| Bloquear `start_trip` | Má UX — motorista no pickup sem poder iniciar |
| Soft-skip matching sem hard accept | Race / inconsistência |
| Hard-block no Partner assign | Impede preparar frota / documentos na viatura atribuída |
| Sem override | Recuperação ops difícil |
| Categoria driver ≠ categoria viatura | Decisão **separada** — não misturar com compliance documental |

---

## 7. Fora de scope

- OCR · IMT · S3  
- Pagamentos / Stripe  
- Passenger UX  
- Redesign UI  
- Migrations sem necessidade comprovada  
- Bloqueios sem fechar decisões A–E  
- Produção sem smoke / auditoria prévia de `active_vehicle_id`  

---

## 8. Recomendação final

1. **G-KYC-P0-04 / PF3D-3 ON em PROD:** **FECHADO** (smoke 2026-09-09).  
2. **Não** confundir com fecho de A6/IMT nem docs pessoais Driver.  
3. Próximo natural: **PF3D-4** (UX rica Admin) · auditoria frota real · IMT (A6.3+).  
4. Set bloqueante actual: `{ rejected, expired, expired_pending, missing }` + `no_active_vehicle` com flag ON; `expiring_soon` / `pending_review` → warning (ops permitidas).

---

## 9. Relação com PF3C

| | PF3C | PF3D |
|--|------|------|
| Objectivo | Visibilidade / alertas | Compliance / bloqueios |
| `document_summary` | Sim | Reutilizar |
| Matching / online / accept | Intactos (só alertas) | Gates **ON** em PROD (G-KYC-P0-04) |
| Estado | **PASS** | **PF3D-3 ON** · PF3D-4/IMT abertos |

---

*G-KYC-P0-04 docs close 2026-09-09. Sem alterações runtime nesta tarefa de fecho.*
