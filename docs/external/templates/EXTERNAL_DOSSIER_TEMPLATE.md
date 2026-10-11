# Dossier externo — template

| Campo | Valor |
|-------|--------|
| **Dossier ID** | `EXT-___-YYYY-MM-DD` |
| **Data** | YYYY-MM-DD |
| **Versão** | v0.1 |
| **Estado** | RASCUNHO · REVISÃO · APROVADO ENVIO · ENVIADO |
| **Destinatário / audiência** | Advogado · Contabilista · Seguradora · IMT · AMT · Stripe · _outro_ |
| **Responsável interno** | _nome_ |
| **Confidencialidade** | EXTERNAL-CONFIDENTIAL *(por defeito dossier profissional)* |
| **Source of truth** | [`docs/registers/EXTERNAL_CONSULTATIONS.md`](../../registers/EXTERNAL_CONSULTATIONS.md) · docs internos listados abaixo |
| **Q-EXT incluídas** | Q-EXT-___-NNN, … |

---

## 1. Identificação

| Campo | Valor *(placeholders — não PII real no template)* |
|-------|-----------------------------------------------------|
| Entidade | `[RAZÃO SOCIAL]` |
| Projecto / plataforma | TVDE VAMULÁ — plataforma tecnológica |
| Contacto | `[NOME]` · `[EMAIL PROFISSIONAL]` |
| Referência | `[REF INTERNA / Q-EXT / EXT-ID]` |

---

## 2. Objectivo

_(Máximo 1 página.)_

Descrever **porque** este dossier é enviado e **que decisões** se pretende desbloquear no projecto.

---

## 3. Contexto factual

Só factos necessários ao destinatário. **Sem** dump do repositório.

- Estado do produto relevante (1–2 parágrafos).
- Links internos para detalhe: `ROADMAP`, `A3`, `A1`, findings, etc.

---

## 4. Decisões internas já tomadas

Referenciar [`DECISIONS.md`](../../registers/DECISIONS.md) — IDs `DEC-*` e aliases (`A1-D*`, `A3-D*`, …).

| ID | Resumo uma linha |
|----|------------------|
| DEC-___ | … |

---

## 5. Questões abertas / findings relevantes

Referenciar [`FINDINGS.md`](../../registers/FINDINGS.md).

| ID | Resumo |
|----|--------|
| FIND-___ / STRIPE-LIVE-__ | … |

---

## 6. Perguntas

Repetir bloco por cada `Q-EXT-*` incluída.

### Q-EXT-___-NNN

**Pergunta:**

_(Texto enviado ao destinatário.)_

**Contexto mínimo:**

**Porque precisamos da resposta:**

**Impacto da resposta:**

**Prioridade:** P0 · P1 · P2

_(Não sugerir resposta ao profissional.)_

---

## 7. Anexos

| Anexo | Descrição | Confidencialidade | Localização |
|-------|-----------|-------------------|-------------|
| A1 | _ex.: diagrama fluxo pagamento_ | INTERNAL / EXTERNAL | repo path ou storage externo |

Lista **curta** e controlada.

---

## 8. Forma de resposta pretendida

Pedir, quando aplicável:

- resposta **concreta** por pergunta;
- **fundamento** legal/normativo/procedimental;
- **condicionantes** e riscos;
- documentos/processos necessários;
- necessidade de contacto com entidade oficial (IMT/AMT);
- classificação **blocker** vs **recomendação**.

---

## 9. Registo de envio

| Campo | Valor |
|-------|--------|
| Data envio | |
| Meio | email · portal · reunião · postal |
| Destinatário | |
| Versão dossier | |
| Manifesto | [`outbox/EXT-___-YYYY-MM-DD.md`](../outbox/EXT-___-YYYY-MM-DD.md) |
