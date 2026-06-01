# PROMPT AMB-F0 — Contrato ambiance/chrome (DOC ONLY)

**Estado:** executável  
**Fase:** F0 — documentação  
**Branch:** doc-only (main ou `docs/amb-f0-contract`)

---

```
Fase AMB-F0 — Contrato ambiance/chrome (DOC ONLY)

Objectivo: produzir documentação antes de qualquer código visual. Zero alterações em web-app/src.

Criar/atualizar:
1. docs/build/AMBIANCE_CHROME_BUILD.md — índice master (objectivo, fases, gates, links)
2. docs/ux/ambiance-chrome-contract.md — contrato técnico

O contrato DEVE incluir:
- Definição: ambiance vs tema vs chrome vs palco (mapa)
- Lista FECHADA de tokens propostos (6–8 max), prefixo --color-chrome-* ou --chrome-*:
  • sheet-bg, sheet-border, sheet-shadow (ou equivalente)
  • menu-surface, menu-row-hover, menu-row-active
  • gradient-subtle (shell/menu)
  • chip-overlay (opcional)
- Matriz aplicação: Onde ENTRA / Onde PROIBIDO
  • ENTRA: MapBottomSheet, infoBoxTemplate (só constantes que referenciem tokens), MENU_* , Sheet drawer
  • PROIBIDO: MapView tiles, semantic success/warning/destructive, PrimaryActionButton estados críticos
- Regra por role: Partner (craft alto) vs Driver/Passenger (micro) vs Admin (minimal, fora de scope F3–F4)
- Mapeamento aos 4 temas existentes + auto (portugal, dev, minimal, neon) — sem novos IDs
- Checklist smoke manual (tabela: tema × ecrã × o que verificar)
- Secção "Não-fazer" alinhada ao master

Referências obrigatórias a ler:
- web-app/src/design-system/themes/portugal.css (filosofia bandeira)
- web-app/src/components/layout/infoBoxTemplate.ts
- docs/ux/info-box-template.md
- docs/ux/shell-menu-centric.md

Entregáveis:
- Só markdown em docs/
- No fim: resumo 5–8 bullets + pedir aprovação Frank antes de F1

NÃO: código CSS, componentes React, commits em web-app, refactor menus, novos temas.
```
