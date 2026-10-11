# Roteiro — Pacote 4 (Smoothing / eliminar fricção) — **só depois de validar SP3**

**O que é isto:** pacote de execução em série — **não** é uma prompt única.  
Este pacote resolve “consigo usar mas ainda penso demasiado”.

**Ordem:** **S001 → S002 → S003 → S004 → S005 → J010**

---

## Contexto

Sistema já funcional + visível.

Problema:
- Ainda exige pensamento
- Ainda há inputs manuais

Objetivo:
- Tudo automático / intuitivo

---

## Itens (prompts granulares)

- **S001 — Eliminar IDs manuais**: trocar inputs UUID por dropdowns / selects / listas
- **S002 — Auto-select contexto**: partner logado → usar automaticamente `partner_id`
- **S003 — Action-based UI**: “Seleciona motorista” / “Adicionar à frota”
- **S004 — Safe actions**: confirmações simples (“Tens a certeza?”)
- **S005 — Login simplification (dev)**: reduzir fricção de OTP com segurança mínima
- **J010 — Runner non-interactive**: eliminar OTP manual em modo dev; execução automática

---

## Regras

- Não mexer no core backend
- Só UX / camada de interação

---

## Output

- Zero fricção
- Zero necessidade de saber IDs
- Utilização natural

