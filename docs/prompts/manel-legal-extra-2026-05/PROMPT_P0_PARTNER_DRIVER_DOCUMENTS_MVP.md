# PROMPT P0 — Documentos motorista (partner + motorista) MVP

**Backlog:** itens 5 e 6 (ingestão, revisão partner, validade, sugestão automática com fallback manual).

## Objectivo (MVP)

- **Fonte de verdade** no campo `drivers.documents` (JSON texto) partilhado entre motorista e partner.
- Partner **vê e actualiza** estados (aprovar / rejeitar / expirado / notas / `expires_at`).
- Motorista **submete** documentos para revisão (`pending_review`) e pode pedir **sugestão de validade** a partir de texto colado (simula leitura de PDF sem pipeline de ficheiros pesada).

## Âmbito técnico

- **Backend:** `GET` + `PATCH` `/driver/documents`; `POST` `/driver/documents/suggest-expiry` (body `{ "text": "..." }`); `PATCH` `/partner/drivers/{id}/documents`.
- Regras: motorista não marca `approved` sozinho; partner não precisa de OCR — só merge de campos permitidos.
- **Web partner:** secção no detalhe do motorista com lista de documentos e acções.
- **Web motorista:** sincronizar estado local com API ao carregar; gravar alterações no servidor ao actualizar documentos no menu.

## Critérios de aceitação

- Partner com motorista na frota vê o mesmo estado de documentos que o motorista após sync.
- `suggest-expiry` devolve datas plausíveis para texto PT comum (DD/MM/AAAA, etc.) ou `null`.

## Fora de âmbito (fase seguinte)

- Upload binário persistente (S3), fila async, OCR em PDF nativo, multi-tenant de storage.
