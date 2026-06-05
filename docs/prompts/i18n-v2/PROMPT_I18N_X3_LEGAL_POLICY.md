# X3 — i18n legal / política

**Estado:** **Desbloqueado** — opção **B** (2026-06-05).

## Decisão (B)

| Opção | Descrição | Estado |
|-------|-----------|--------|
| A | Tradução legal completa EN | Não escolhida |
| **B** | `common.legalEnSummary` + `common.legalPtBinding`; texto vinculante PT | **Em vigor** |
| C | Legal PT-only em todas as locales | Não escolhida |

## Implementação

- Componente: `web-app/src/components/legal/LegalLocaleNotice.tsx` (visível só com locale EN).
- Superfícies: login (`LoginScreen`), Definições globais (`SettingsButton`).
- Quando existirem páginas de termos/privacidade: corpo PT + aviso EN no topo.

## Referência

- [I18N.md](../../architecture/I18N.md)
