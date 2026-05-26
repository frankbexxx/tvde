# Onda D — Inbox + documentos simulados (build)

**Branch:** `feat/onda-d-inbox-docs`  
**PR título:** `feat(partner+driver): onda D — inbox mínimo + docs upload simulado`  
**Depende de:** merge Onda B (C opcional)

**Sub-ondas recomendadas se PR inchada:**
1. `feat/onda-d1-inbox` — inbox only  
2. `feat/onda-d2-docs` — documentos only  

---

## Objetivo

Inbox operacional partner→driver + documentos com ficheiro persistido (simulado, sem S3).

**Modelo documentos (decidido):** opção **1** — guardar ficheiro em disco local ou coluna DB (path/base64); preview/download honesto.

---

## Checklist técnico — P7 Inbox

### Backend

| # | Tarefa | Ficheiros |
|---|--------|-----------|
| D1 | Migration: `partner_messages` (id, partner_id, driver_user_id nullable, title, body, priority, created_at, created_by) | `backend/alembic/versions/` |
| D2 | Migration: `driver_message_reads` (message_id, driver_user_id, read_at) | idem |
| D3 | `GET /driver/messages` — lista com read flag | novo router ou `driver.py` |
| D4 | `PATCH /driver/messages/{id}/read` | idem |
| D5 | `POST /partner/messages` — to one driver or broadcast (driver_user_id null + partner scope) | `partner.py` |
| D6 | `GET /partner/messages` — sent history optional | `partner.py` |
| D7 | pytest inbox básico | `backend/tests/` |

### Frontend Driver

| # | Tarefa | Ficheiros |
|---|--------|-----------|
| D8 | Substituir placeholder Caixa | `DriverOperationsMenu` / `DriverDashboard.tsx` |
| D9 | Lista mensagens: título, data, prioridade, lida/não lida | idem |
| D10 | Detalhe + marcar lido ao abrir | idem |
| D11 | `api/driverMessages.ts` ou extensão `api/trips.ts` | novo |

### Frontend Partner

| # | Tarefa | Ficheiros |
|---|--------|-----------|
| D12 | Form enviar mensagem: 1 motorista ou «toda a frota» | `PartnerDriverDetail.tsx` ou modal home |
| D13 | Prioridade select (normal/alta) | idem |

---

## Checklist técnico — P2 Documentos simulados

### Backend

| # | Tarefa | Ficheiros |
|---|--------|-----------|
| D14 | Config `UPLOAD_DIR` env (default `./uploads` dev) | `config.py` |
| D15 | `POST /driver/documents/{doc_key}/upload` — multipart, max size, store path in `documents` JSON | `drivers.py` ou documents router |
| D16 | `GET /driver/documents/{doc_key}/file` — serve file (driver own) | idem |
| D17 | `GET /partner/drivers/{id}/documents/{doc_key}/file` — partner fleet scope | `partner.py` |
| D18 | Actualizar `apply_partner_documents_patch` — não aprovar sem `file_path` presente (opcional warn) | `driver_documents.py` |
| D19 | Alembic se necessário (ou JSON column only) | — |

### Frontend Driver

| # | Tarefa | Ficheiros |
|---|--------|-----------|
| D20 | Input file por documento + upload progress | `DriverOperationsMenu` documents section |
| D21 | Remover dependência gate fake localStorage como fonte única | `driverDocuments.ts` |

### Frontend Partner

| # | Tarefa | Ficheiros |
|---|--------|-----------|
| D22 | Link «Ver documento» abre/download se `file_path` | `PartnerDriverDetail.tsx` |
| D23 | Aprovar/rejeitar disabled ou aviso se sem ficheiro | idem |

---

## Testes / validação

```bash
cd backend && pytest tests/ -q -k "inbox or document"
cd web-app && npm run build
```

Smoke: partner envia msg → driver vê Caixa → marca lido; driver upload PDF → partner preview → aprova.

---

## Não fazer (Onda D)

- Push notifications
- S3 / cloud storage
- OCR real
- Admin tab Documentos localStorage fix

---

## PROMPT — executar Onda D (completa)

```
Implementa ONDA D — Inbox + documentos conforme docs/build/ONDA_D_INBOX_DOCS_BUILD.md

Regras:
- Branch feat/onda-d-inbox-docs (ou d1/d2 se split)
- P7: migrations + API partner/driver messages + UI Caixa real + partner enviar
- P2: upload multipart → UPLOAD_DIR; download partner/driver; preview honesto
- Documentos: opção 1 persistência local/DB path
- Sem S3, Stripe, auth, push
- pytest + build
- Se scope grande: PR1 inbox, PR2 docs — avisar antes de split
- Resumo curto no fim
```

## PROMPT — executar só Inbox (D1)

```
Implementa ONDA D1 — só Inbox conforme secção P7 em docs/build/ONDA_D_INBOX_DOCS_BUILD.md
Branch feat/onda-d1-inbox → commit + PR. Sem upload documentos ainda.
```

## PROMPT — executar só Documentos (D2)

```
Implementa ONDA D2 — só Documentos simulados conforme secção P2 em docs/build/ONDA_D_INBOX_DOCS_BUILD.md
Branch feat/onda-d2-docs → commit + PR. Requer merge D1 ou independente se inbox já merged.
```
