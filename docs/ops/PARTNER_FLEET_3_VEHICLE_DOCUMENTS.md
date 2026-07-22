# PARTNER-FLEET-3 — Documentos da viatura

**Estado:** PF3A **PASS** · PF3B **PASS** (smoke final 2026-07-22)  
**`main`:** ≥ `387c491` (merge [#441](https://github.com/frankbexxx/tvde/pull/441); cadeia PF3B + smoke fixes).  
**Smoke 3B:** [`PARTNER_FLEET_3B_SMOKE_2026-07-22.md`](./PARTNER_FLEET_3B_SMOKE_2026-07-22.md)  
**Pré-condição:** PARTNER-FLEET-2 **PASS** · `main` inclui [#432](https://github.com/frankbexxx/tvde/pull/432) (backend docs) e [#430](https://github.com/frankbexxx/tvde/pull/430) (clear `active_vehicle_id` em transfer/remove).

---

## Cadeia

| Slice | Tema | Estado |
|-------|------|--------|
| **PF3A** | Tabela `vehicle_documents` · Partner API CRUD · upload/download `UPLOAD_DIR` · `computed_status` · UNIQUE `(vehicle_id, document_type)` · hard delete MVP | **PASS** [#432](https://github.com/frankbexxx/tvde/pull/432) |
| **PF3B** | UI Partner Frota → Viaturas · painel Documentos expansível · 4 tipos P0 · form inline · upload/download | **PASS** ([#435](https://github.com/frankbexxx/tvde/pull/435) + smoke fixes [#440](https://github.com/frankbexxx/tvde/pull/440) · [#441](https://github.com/frankbexxx/tvde/pull/441)) |
| **PF3C** | Alertas de caducidade (lista / agregados) | Fora deste slice / próximo natural |
| **PF3D** | Compliance gates / bloqueios | Fora deste slice |

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
- Sem alertas agregados na lista; sem redesign da frota

---

## Fora de scope (confirmado)

- Alertas agregados na lista de viaturas  
- Badges na lista de motoristas  
- Compliance gates / bloqueios  
- Admin approval  
- Integração IMT · OCR · S3/CDN  
- Histórico de versões  
- Driver docs / migrar `inspecao_viatura`  
- Matching · Stripe/payments · Passenger/Driver/NAV  
- Migrations novas · DB cleanup · env/secrets · backend novo neste slice  

---

## Smoke manual PF3B

Checklist e resultado final: [`PARTNER_FLEET_3B_SMOKE_2026-07-22.md`](./PARTNER_FLEET_3B_SMOKE_2026-07-22.md).

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

**PARTNER-FLEET-3B = PASS funcional.**

UI Partner de documentos da viatura (4 tipos P0, upload/download, estados, validações) validada em smoke real após fixes #440 e #441 em `main` ≥ `387c491`. Próximos naturais: PF3C alertas · PF3D gates.
