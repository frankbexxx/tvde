# README_ENVIO — EXT-FIS-2026-10-12 (interno VAMULÁ)

**Não enviar ao contabilista.** Checklist operacional de preparação do pacote.

| Campo | Valor |
|-------|--------|
| **Data preparação** | 2026-10-12 |
| **ID dossier** | EXT-FIS-2026-10-12 |
| **Estado dossier** | **REVIEW** |
| **Enviado** | **Não** |
| **Destinatário previsto** | Contabilista / TOC (email a definir no envio) |

---

## Pacote v1 — incluir no envio

| Item | Ficheiro | Estado preparação |
|------|----------|-------------------|
| Dossier principal | `%LOCALAPPDATA%\TVDE\documents\EXT-FIS-2026-10-12\dossier.docx` (canónico; ajustes Word manuais) | REVIEW — rebuild local quando necessário |
| **A1** Resumo tarifário | `annexes/A1_resumo_tarifario.md` → DOCX/PDF local | Fonte Git; artefacto final **fora do Git** |
| **A2** Exemplo preço viagem | `annexes/A2_exemplo_preco_viagem.md` → DOCX/PDF local | Idem |
| **A3** Resumo refunds | `annexes/A3_resumo_refunds.md` → DOCX/PDF local | Idem |

---

## Pacote v1 — explicitamente excluído

| Item | Motivo |
|------|--------|
| **O5** exemplo / comprovativo acerto semanal | Lacuna aberta; fora do v1 |
| Runbook refund original (`PILOT_STRIPE_REFUND.md`) | Ops interno; substituído por A3 resumo |
| Código `pricing.py` / `tariffs.py` | Não destinado ao contabilista |
| Matriz legal / dossier advogado | Outro destinatário |
| Dados parceiro / contas operacionais (actas internas) | PII/ops sensível |
| Q-EXT-FIS-007/008, Q-EXT-AMT-001 | Excluídos do dossier |

---

## Disponível se pedido (não enviar proactivamente)

- Excerto regra económica AMT 5% / 0,75% (já resumido no dossier)
- `PRICING_DECISION.md` (técnico-comercial)

---

## Classificação interna (v1)

| Item | Estado |
|------|--------|
| dossier principal | INCLUIR |
| A1 | INCLUIR |
| A2 | INCLUIR |
| A3 | INCLUIR |
| O5 exemplo | NÃO INCLUIR V1 |
| runbook refund original | NÃO ENVIAR |
| código pricing/tariffs | NÃO ENVIAR |
| legal matrix | NÃO ENVIAR |
| dados Manel / parceiro | NÃO ENVIAR |

---

## Checklist PII / secrets (pré-envio)

- [ ] Sem NIF, IBAN, emails pessoais, nomes de passageiros/motoristas
- [ ] Sem Payment Intent / Charge / Customer IDs reais
- [ ] Sem chaves Stripe ou tokens
- [ ] Anexos marcados como didácticos onde aplicável (A2)
- [ ] Q-EXT-FIS-002 **não** fechada nos anexos
- [ ] O5 **não** fechada
- [ ] Nenhum valor apresentado como fiscalmente validado sem suporte

---

## Origem Git (preencher no commit da PR)

| Artefacto | Referência |
|-----------|------------|
| Branch | `docs/ext-fis-annexes-2026-10-12` |
| Commit source anexos | *(ver PR)* |
| `dossier.md` blob (inalterado nesta PR) | `9cb07dea61d09e3bf722d1a64c656cf844e74042` @ base `main` |
| `dossier.yaml` | **Não modificado** — `status: REVIEW` |

| Hash local dossier.docx (último rebuild conhecido) | SHA256 `b3c3e47eb1bb21ab9f24568ede9cfc1859b533a9887ad218c5f5ddf4f61f595a` @ commit `b464753…` — **revalidar** se rebuild |

---

## Próximos passos operacionais

1. Gerar DOCX/PDF dos anexos (Pandoc/Word) para pasta local `…\EXT-FIS-2026-10-12\annexes\`.
2. Revisão humana Frank + contabilista **antes** de email.
3. **Não** alterar `status` para SENT sem decisão explícita.
4. Fecho O5 / Q-EXT-FIS-002 = respostas externas + registos (fora deste pacote).

---

*Documento interno — repositório VAMULÁ/TVDE.*
