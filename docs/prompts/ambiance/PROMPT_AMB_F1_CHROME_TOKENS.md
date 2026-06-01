# PROMPT AMB-F1 — Tokens chrome

**Estado:** executável  
**Pré-requisito:** [`docs/ux/ambiance-chrome-contract.md`](../../ux/ambiance-chrome-contract.md) aprovado  
**Branch sugerido:** `feat/amb-f1-chrome-tokens`

---

```
Fase AMB-F1 — Tokens chrome (implementação mínima)

Pré-requisito: docs/ux/ambiance-chrome-contract.md aprovado.

Objectivo: declarar tokens chrome nos 4 ficheiros de tema + tokens.css; ligar a 1–2 superfícies piloto para validar — SEM redesign de layout ou menus.

Implementar:
1. Variáveis em web-app/src/design-system/tokens.css (defaults/fallbacks)
2. Valores por tema em portugal.css, dev.css, minimal.css, neon.css (lista exacta do contrato F0)
3. tailwind.config.js — só se necessário mapear tokens para utilities reutilizáveis (evitar explosão de classes)
4. Wiring piloto (escolher 2, não mais):
   • MAP_BOTTOM_SHEET ou MAP_CARD_FRAME em infoBoxTemplate.ts → usar tokens chrome
   • MENU_SURFACE ou MENU_ROW_BTN → usar tokens chrome
   Não reescrever todo infoBoxTemplate.ts nesta fase.

Regras:
- data-theme permanece em document.documentElement (useTheme.ts intocado salvo bug)
- Cores semânticas (--color-success, --color-destructive, etc.) INALTERADAS
- MapView / tiles: zero alterações
- Sem novos ThemeId; sem renomear labels UI

Validação:
- npm run build (web-app)
- Smoke manual: portugal + dev + auto + minimal num ecrã piloto (driver sheet OU menu drawer)
- Documentar no PR quais superfícies piloto foram ligadas e quais ficam para F3/F4

NÃO:
- ThemeSelector / AppAppearanceSettings
- PartnerHome / dashboards
- AppMenuShell / refactor SideMenus
- Testes e2e novos (salvo regressão óbvia)

No fim: resumo diff + lista superfícies ainda por ligar.
```
