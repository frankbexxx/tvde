# Manifesto de envio externo — template

| Campo | Valor |
|-------|--------|
| **type** | EXTERNAL SEND MANIFEST |
| **confidentiality** | INTERNAL |
| **audience** | INTERNAL |

Copiar para [`outbox/`](../outbox/) com nome `EXT-{DOM}-YYYY-MM-DD.md`.

---

## Identificação

| Campo | Valor |
|-------|--------|
| **external_id** | `EXT-LEG-2026-10-11` *(exemplo)* |
| **data preparação** | YYYY-MM-DD |
| **data envio** | YYYY-MM-DD ou — |
| **audiência** | Advogado · Contabilista · Seguradora · IMT · AMT · Stripe |
| **destinatário** | _nome / firma_ |
| **assunto** | _linha de assunto email ou referência_ |
| **versão dossier** | v0.1 |
| **responsável pelo envio** | _nome_ |

---

## Conteúdo

| Campo | Valor |
|-------|--------|
| **Q-EXT incluídas** | Q-EXT-LEG-001, … |
| **dossier (referência)** | path repo ou storage externo + hash |
| **anexos enviados** | lista numerada |
| **nomes dos ficheiros** | `dossier-v01.pdf`, … |
| **hashes** *(quando aplicável)* | sha256:… |

---

## Localização e resposta

| Campo | Valor |
|-------|--------|
| **localização externa** | _URI / pasta / nota “email Manel” — sem credenciais no Git_ |
| **estado** | PREPARADO · ENVIADO · AGUARDA RESPOSTA · RESPONDIDO · INCORPORADO · FECHADO |
| **data resposta** | — |
| **response summary** | [`responses/RES-___-YYYY-MM-DD.md`](../responses/RES-___-YYYY-MM-DD.md) ou — |
| **DEC resultante** | DEC-___ ou — |

---

## Notas

- Manifesto **não** substitui [`EXTERNAL_CONSULTATIONS.md`](../../registers/EXTERNAL_CONSULTATIONS.md); actualizar registo quando envio/resposta forem factos confirmados.
- Original sensível **fora** do Git; este ficheiro regista rastreabilidade.
