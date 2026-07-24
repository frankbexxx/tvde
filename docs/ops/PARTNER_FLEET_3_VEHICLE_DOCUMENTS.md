# PARTNER-FLEET-3 — Documentos da viatura

**Estado:** PF3A **PASS** · PF3B **PASS** · PF3C **PASS** (smoke visual 2026-07-24)  
**`main`:** ≥ `bd2664c` (merge [#456](https://github.com/frankbexxx/tvde/pull/456); cadeia PF3C).  
**Smoke 3B:** [`PARTNER_FLEET_3B_SMOKE_2026-07-22.md`](./PARTNER_FLEET_3B_SMOKE_2026-07-22.md)  
**Smoke 3C:** [`PF3C_VEHICLE_DOCUMENT_ALERTS_SMOKE_PASS_2026-07-24.md`](./PF3C_VEHICLE_DOCUMENT_ALERTS_SMOKE_PASS_2026-07-24.md)  
**Pré-condição:** PARTNER-FLEET-2 **PASS** · `main` inclui [#432](https://github.com/frankbexxx/tvde/pull/432) (backend docs) e [#430](https://github.com/frankbexxx/tvde/pull/430) (clear `active_vehicle_id` em transfer/remove).

---

## Cadeia

| Slice | Tema | Estado |
|-------|------|--------|
| **PF3A** | Tabela `vehicle_documents` · Partner API CRUD · upload/download `UPLOAD_DIR` · `computed_status` · UNIQUE `(vehicle_id, document_type)` · hard delete MVP | **PASS** [#432](https://github.com/frankbexxx/tvde/pull/432) |
| **PF3B** | UI Partner Frota → Viaturas · painel Documentos expansível · 4 tipos P0 · form inline · upload/download | **PASS** ([#435](https://github.com/frankbexxx/tvde/pull/435) + smoke fixes [#440](https://github.com/frankbexxx/tvde/pull/440) · [#441](https://github.com/frankbexxx/tvde/pull/441)) |
| **PF3C** | Alertas de caducidade — `document_summary` · badges lista · Home agregado | **PASS** ([#452](https://github.com/frankbexxx/tvde/pull/452)–[#456](https://github.com/frankbexxx/tvde/pull/456)) |
| **PF3D** | Compliance gates / bloqueios | Fora deste slice / próximo natural |

---

## Tipos P0

| `document_type` | Label PT |
|-----------------|----------|
| `vehicle_registration` | DUA / Certificado de Matrícula |
| `vehicle_insurance` | Seguro TVDE |
| `periodic_inspection` | Inspeção Periódica Obrigatória |
| `tvde_sticker` | Dístico TVDE / Identificação TVDE |

---

## Backend (PF3A — referência)

Endpoints Partner:

- `GET/POST /partner/vehicles/{vehicle_id}/documents`
- `GET/PATCH/DELETE /partner/vehicles/{vehicle_id}/documents/{document_id}`
- `POST …/upload` (multipart, máx. 5 MB; PDF/JPG/PNG)
- `GET …/file`

Regras:

- Tenant-safe por `partner_id`
- Duplicado `document_type` → **409** `document_type_exists`
- Path: `{partner_id}/vehicles/{vehicle_id}/{type}/{uuid}{ext}`
- `computed_status`: `rejected` · `pending_review` · `expired` · `expiring_soon` (≤30d) · `valid`
- Expiry por **data UTC** (não timestamp): validade = hoje → não `expired`
- `drivers.documents.inspecao_viatura` **intacto** (não migrado)

---

## UI (PF3B)

- Frota → Viaturas: botão **Documentos** por row (sempre visível)
- Painel expansível; **lazy-load** só ao abrir
- Sempre 4 slots P0 (incluindo **Em falta**)
- Form inline: número, emissor, datas, notas, status armazenado, ficheiro
- Validação cliente: ≤5 MB · PDF/JPG/PNG · erros locais sem request preso

---

## Alertas (PF3C)

- `GET /partner/vehicles` → `document_summary` (batch backend)
- Badges na lista Viaturas (pluralização PT/EN)
- Partner Home: alerta agregado «Documentos de viaturas» + CTA «Ver viaturas» (`openMenu('fleet_vehicles')`)
- Soft-load vehicles na Home; falha não derruba métricas/drivers/trips
- **Sem** gates / **sem** bloqueio operacional

---

## Fora de scope (confirmado)

- Compliance gates / bloqueios (→ **PF3D**)  
- Admin approval / alertas Admin  
- Integração IMT · OCR · S3/CDN  
- Histórico de versões  
- Driver docs / migrar `inspecao_viatura`  
- Matching · Stripe/payments · Passenger/Driver/NAV  
- Redesign total Documentos / mobile  
- DB cleanup · env/secrets · Ruff 0.16  

---

## Smoke manual

- **PF3B:** [`PARTNER_FLEET_3B_SMOKE_2026-07-22.md`](./PARTNER_FLEET_3B_SMOKE_2026-07-22.md)  
- **PF3C:** [`PF3C_VEHICLE_DOCUMENT_ALERTS_SMOKE_PASS_2026-07-24.md`](./PF3C_VEHICLE_DOCUMENT_ALERTS_SMOKE_PASS_2026-07-24.md)  

**Correcções pós-smoke (PF3B-SMOKE-FIX-1)** [#440](https://github.com/frankbexxx/tvde/pull/440): validação cliente 5 MB + PDF/JPG/PNG; display expirado prioriza validade; backend rejeita `invalid_file_type` (415).

**PF3B-SMOKE-FIX-2** [#441](https://github.com/frankbexxx/tvde/pull/441): `expires_at` compara por **data UTC** (não timestamp). Validade = hoje → ainda válido / `expiring_soon`, nunca `expired`.

---

## Dívida UX / follow-up (não bloqueante)

O painel actual é **funcional** (PASS), mas visualmente denso. Erros no topo do painel podem parecer globais a todos os documentos.

Melhorar no futuro (fora de PF3B):

1. Lista simples top-down dos documentos  
2. Abrir detalhe de cada documento em novo patamar / aba / sub-ecrã  
3. Mostrar erros junto ao documento / form afectado  
4. Evitar múltiplos forms abertos no mesmo scroll  

---

## Conclusão

**PARTNER-FLEET-3B = PASS funcional** · **PF3C = PASS funcional.**

UI Partner de documentos da viatura (4 tipos P0, upload/download, estados) + alertas/badges/Home (`document_summary`) validados em smoke. Próximo natural: **PF3D** gates (quando produto pedir).
