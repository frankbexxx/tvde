# README_ENVIO — EXT-LEG-2026-10-11 (interno VAMULÁ)

**Não enviar ao advogado.** Checklist operacional de preparação do pacote jurídico.

| Campo | Valor |
|-------|--------|
| **Data preparação** | 2026-10-13 |
| **ID dossier** | EXT-LEG-2026-10-11 |
| **Estado dossier** | **REVIEW** |
| **Enviado** | **Não** |
| **Destinatário previsto** | Advogado (email a definir no envio) |

---

## Pacote v1 — INCLUIR

| Item | Ficheiro | Notas |
|------|----------|--------|
| Dossier principal | `%LOCALAPPDATA%\TVDE\documents\EXT-LEG-2026-10-11\dossier.docx` | Canónico; revisão cosmética Word em curso (Frank) |
| **A1** Modelo de papéis | `annexes/A1_modelo_de_papeis.md` → DOCX local | Fonte Git |
| **A2** Conformidade operacional | `annexes/A2_resumo_conformidade_operacional.md` → DOCX local | Contexto interno; não parecer |

---

## DISPONÍVEL SE PEDIDO (não enviar proactivamente)

| Item | Notas |
|------|--------|
| **A3** Licença plataforma **354/2026** | Excerto redigido; sem NIF/sede |
| **A4** Livro Reclamações / RAL | Resumo L-25; **sem** doc L25 bruto (PII/ops) |
| **A5** Termos / privacidade | URLs públicas + contexto M2.11 vs CTR-01 |
| Resposta **Q-EXT-IMT-001** | Quando existir |
| Excertos matriz legal / A3 | Por linha L-* relevante |

---

## NÃO ENVIAR

| Item |
|------|
| Dossier / anexos **EXT-FIS** (fiscal) |
| **Q-EXT-LEG-006** (art. 17.º-A) — PREPARAR |
| Matriz legal **integral** |
| **TVDE_59_2026_TECHNICAL_FINDINGS** integral |
| **L25_LIVRO_RECLAMACOES_RAL** bruto |
| Actas operacionais / Manel |
| Contratos assinados |
| KYC / documentos motorista |
| Código / runbooks |
| PII (NIF, IBAN, matrículas, emails pessoais, nomes) |

---

## Checklist PII / secrets (pré-envio)

- [ ] Sem NIF, IBAN, sede completa desnecessária
- [ ] Sem matrículas, seguros nominativos, motoristas identificados
- [ ] Sem emails operacionais / actas
- [ ] Sem contratos ou PDFs KYC
- [ ] A2 **não** lido como conclusão de conformidade
- [ ] O1/O2/O3/O8 **não** fechados nos anexos
- [ ] LEG-006 fora do pacote

---

## Provenance (preencher no merge da PR anexos)

| Artefacto | Referência |
|-----------|------------|
| Branch anexos | `docs/ext-leg-annexes-2026-10-13` |
| Commit sources anexos | *(ver PR)* |
| `dossier.md` / `dossier.yaml` | **Inalterados** nesta PR |
| DOCX dossier (último rebuild main) | Ver `build-manifest.json` local |

---

## Próximos passos operacionais

1. Aprovar merge PR anexos; rebuild A1/A2 DOCX se necessário.
2. Revisão Word dossier + anexos (Frank).
3. Factos O1–O3/O8 após Manel — **não** injectar PII nos anexos.
4. **Não** promover SENT sem decisão explícita.

---

*Documento interno — repositório VAMULÁ/TVDE.*
