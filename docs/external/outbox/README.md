# Outbox — manifestos de envio

| Campo | Valor |
|-------|--------|
| **type** | REGISTER (folder) |
| **audience** | INTERNAL |
| **status** | ACTIVO |

---

## Propósito

Aqui vivem **manifestos** de envio externo (`EXT-*`), não dossiers confidenciais completos **por defeito**.

Cada manifesto segue [`templates/EXTERNAL_SEND_MANIFEST_TEMPLATE.md`](../templates/EXTERNAL_SEND_MANIFEST_TEMPLATE.md).

Política: [`../README.md`](../README.md)

---

## Nome sugerido

| Padrão | Exemplo |
|--------|---------|
| `EXT-LEG-YYYY-MM-DD.md` | Advogado |
| `EXT-FIS-YYYY-MM-DD.md` | Contabilista |
| `EXT-INS-YYYY-MM-DD.md` | Seguradora |
| `EXT-IMT-YYYY-MM-DD.md` | IMT |
| `EXT-AMT-YYYY-MM-DD.md` | AMT |
| `EXT-STRIPE-YYYY-MM-DD.md` | Stripe |

O **external_id** no manifesto deve coincidir com o nome do ficheiro (sem extensão).

---

## Regras

1. Um manifesto por **envio** (ou lote acordado) a um destinatário.
2. Listar todas as `Q-EXT-*` incluídas e versão do dossier.
3. PDF/dossier final → **storage externo**; manifesto regista hash/localização.
4. Actualizar [`EXTERNAL_CONSULTATIONS.md`](../../registers/EXTERNAL_CONSULTATIONS.md) apenas quando envio/resposta forem **confirmados** (não nesta fase de estrutura).

---

## Estado inicial

Pasta vazia (2026-10-11) — nenhum envio registado.
