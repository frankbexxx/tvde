# Responses — resumos internos pós-resposta

| Campo | Valor |
|-------|--------|
| **type** | REGISTER (folder) |
| **audience** | INTERNAL |
| **status** | ACTIVO |

---

## Propósito

Guardar **resumos internos** de respostas externas. O original confidencial pode ficar **fora do Git**.

Template: [`templates/EXTERNAL_RESPONSE_SUMMARY_TEMPLATE.md`](../templates/EXTERNAL_RESPONSE_SUMMARY_TEMPLATE.md)

Política: [`../README.md`](../README.md)

---

## Ligações obrigatórias

Cada resumo deve ligar a:

| Ligação | Onde |
|---------|------|
| Manifesto | [`outbox/`](../outbox/) `EXT-*` |
| Perguntas | `Q-EXT-*` em [`EXTERNAL_CONSULTATIONS.md`](../../registers/EXTERNAL_CONSULTATIONS.md) |
| Decisão | [`DECISIONS.md`](../../registers/DECISIONS.md) `DEC-*` *(após incorporação)* |
| Finding | [`FINDINGS.md`](../../registers/FINDINGS.md) *(se afectado)* |

---

## Nome sugerido

`RES-LEG-YYYY-MM-DD.md` · `RES-FIS-YYYY-MM-DD.md` — espelhar domínio do manifesto.

---

## Estado inicial

Pasta vazia (2026-10-11) — nenhuma resposta registada.
