# README_ENVIO — EXT-LEG-2026-10-11 (interno VAMULÁ)

**Não enviar ao advogado.** Checklist operacional do pacote jurídico (histórico de envio + preparação).

| Campo | Valor |
|-------|--------|
| **Data preparação** | 2026-10-13 |
| **ID dossier** | EXT-LEG-2026-10-11 |
| **Estado dossier (source)** | **REVIEW** |
| **Pacote v1 enviado** | **2026-10-14** |
| **Conteúdo enviado** | Dossier principal + **A1** + **A2** |
| **Destinatário** | Advogado (sem identificação pessoal) |
| **Aceitação / mandato** | **Pendente** |
| **Parecer** | **Não recebido** |
| **Incorporação `DECISIONS.md`** | **Pendente após parecer** |
| **Consulta fechada** | **Não** |

---

## Pacote v1 — enviado 2026-10-14

| Item | Ficheiro | Notas |
|------|----------|--------|
| Dossier principal | `%LOCALAPPDATA%\TVDE\documents\EXT-LEG-2026-10-11\dossier.docx` | Artefacto Word enviado; **não regenerar** só por mudança de estado |
| **A1** Modelo de papéis | `annexes/A1_modelo_de_papeis.md` → DOCX enviado | Fonte Git |
| **A2** Conformidade operacional | `annexes/A2_resumo_conformidade_operacional.md` → DOCX enviado | Contexto interno; não parecer |

---

## NÃO enviados no pacote v1 (2026-10-14)

| Item | Notas |
|------|--------|
| **A3** Licença plataforma **354/2026** | Disponível se pedido |
| **A4** Livro Reclamações / RAL | Disponível se pedido |
| **A5** Termos / privacidade | Disponível se pedido |
| **Q-EXT-LEG-006** (art. 17.º-A) | **PREPARAR** — fora do pacote |

---

## DISPONÍVEL SE PEDIDO (não enviar proactivamente)

| Item | Notas |
|------|--------|
| Resposta **Q-EXT-IMT-001** | Quando existir |
| Excertos matriz legal / A3 | Por linha L-* relevante |

---

## NÃO ENVIAR

| Item |
|------|
| Dossier / anexos **EXT-FIS** (fiscal) |
| Matriz legal **integral** |
| **TVDE_59_2026_TECHNICAL_FINDINGS** integral |
| **L25_LIVRO_RECLAMACOES_RAL** bruto |
| Actas operacionais / Manel |
| Contratos assinados |
| KYC / documentos motorista |
| Código / runbooks |
| PII (NIF, IBAN, matrículas, emails pessoais, nomes) |

---

## Checklist PII / secrets (pré-envio — referência)

- [x] Sem NIF, IBAN, sede completa desnecessária *(pacote enviado)*
- [x] Sem matrículas, seguros nominativos, motoristas identificados
- [x] Sem emails operacionais / actas
- [x] Sem contratos ou PDFs KYC
- [x] A2 **não** lido como conclusão de conformidade
- [x] O1/O2/O3/O8 **não** fechados nos anexos
- [x] LEG-006 fora do pacote

---

## Provenance

| Artefacto | Referência |
|-----------|------------|
| Branch anexos | `docs/ext-leg-annexes-2026-10-13` (merged) |
| `dossier.md` / `dossier.yaml` | **`status: REVIEW`** — inalterados nesta sincronização |
| DOCX enviados | Cópias locais finais; **não** alterar retroactivamente |

---

## Próximos passos operacionais

1. Aguardar **aceitação** do acompanhamento / pedidos de informação adicional.
2. Quando existir parecer: resumo interno → [`DECISIONS.md`](../../../registers/DECISIONS.md); actualizar [`EXTERNAL_CONSULTATIONS.md`](../../../registers/EXTERNAL_CONSULTATIONS.md).
3. Factos O1–O3/O8 após Manel — **não** injectar PII nos anexos sem nova revisão.
4. **Não** promover source a **CLOSED** sem decisão explícita.

---

*Documento interno — repositório VAMULÁ/TVDE.*
