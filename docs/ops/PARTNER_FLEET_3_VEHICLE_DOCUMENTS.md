# PARTNER-FLEET-3 — Documentos da viatura

**Estado:** PF3A **merged** · PF3B UI **em curso**  
**Pré-condição:** PARTNER-FLEET-2 **PASS** · `main` inclui [#432](https://github.com/frankbexxx/tvde/pull/432) (backend docs) e [#430](https://github.com/frankbexxx/tvde/pull/430) (clear `active_vehicle_id` em transfer/remove).

---

## Cadeia

| Slice | Tema | Estado |
|-------|------|--------|
| **PF3A** | Tabela `vehicle_documents` · Partner API CRUD · upload/download `UPLOAD_DIR` · `computed_status` · UNIQUE `(vehicle_id, document_type)` · hard delete MVP | **Merged** [#432](https://github.com/frankbexxx/tvde/pull/432) |
| **PF3B** | UI Partner Frota → Viaturas · painel Documentos expansível · 4 tipos P0 · form inline · upload/download | **Em curso** (`feat/partner-vehicle-documents-ui`) |
| **PF3C** | Alertas de caducidade (lista / agregados) | Fora deste slice |
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
- `POST …/upload` (multipart, máx. 5 MB)
- `GET …/file`

Regras:

- Tenant-safe por `partner_id`
- Duplicado `document_type` → **409** `document_type_exists`
- Path: `{partner_id}/vehicles/{vehicle_id}/{type}/{uuid}{ext}`
- `computed_status`: `rejected` · `pending_review` · `expired` · `expiring_soon` (≤30d) · `valid`
- `drivers.documents.inspecao_viatura` **intacto** (não migrado)

---

## UI (PF3B)

- Frota → Viaturas: botão **Documentos** por row (sempre visível)
- Painel expansível; **lazy-load** só ao abrir
- Sempre 4 slots P0 (incluindo **Em falta**)
- Form inline: número, emissor, datas, notas, status armazenado, ficheiro
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

## Smoke manual PF3B (após UI)

1. Partner → Frota → Viaturas  
2. Abrir Documentos de uma viatura  
3. Ver 4 tipos P0  
4. Adicionar Seguro TVDE com `expires_at` futuro  
5. Upload ficheiro (PDF/JPG/PNG ≤5 MB)  
6. Descarregar/ver ficheiro  
7. Editar validade/notas  
8. Adicionar Inspeção com validade futura  
9. Confirmar estados válidos / pendente  
10. Documento expirado → estado **Expirado** (mesmo se pendente de revisão)  
11. Remover → Em falta  
12. Regressão: assign/desassign, categorias, «Em viagem», CSV OK  
13. Ficheiro >5 MB ou tipo inválido → erro local, sem request preso  

**Correcções pós-smoke (PF3B-SMOKE-FIX-1):** validação cliente 5 MB + PDF/JPG/PNG; display expirado prioriza validade; backend rejeita `invalid_file_type` (415).

**PF3B-SMOKE-FIX-2:** `expires_at` compara por **data UTC** (não timestamp). Validade = hoje → ainda válido / `expiring_soon`, nunca `expired`.
 
