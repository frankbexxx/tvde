# PROMPT AMB O-1–O-3 — AppMenuShell + paridade menus + wayfinding

**Estado:** executável  
**Pré-requisito:** F0–F4 + F3b merged  
**Branch:** `feat/amb-o1-o6-shell-themes`

---

```
Fase AMB O-1–O-3 — Shell partilhado, secções driver/passenger, wayfinding activo

Objectivo: três SideMenus partilham primitivos visuais; driver/passenger com secções como partner; highlight na raiz quando o utilizador entrou via bottom nav ou sub-ecrã.

O-1 — AppMenuShell.tsx
Exportar: AppSideMenuSheet, AppMenuHeader, AppMenuIdentity, AppMenuSection, AppMenuRow (active, badge, rowId), AppMenuLogoutRow, AppMenuBody.
Renomear PARTNER_SECTION_TITLE → MENU_SECTION_TITLE (alias deprecated).
Migrar PartnerSideMenu como prova.

O-2 — Secções raiz
Passageiro: Identidade (badge Passageiro) | Viagens | Conta | App | Sair
Motorista: Identidade (BETA trailing) | Operação | Conta | Configuração | CTA Ficar disponível | Sair
Partner: comportamento actual preservado.

O-3 — Wayfinding
Helpers: partnerRootHighlightKey, driverRootHighlightKey, passengerRootHighlightKey
Estado menuRootHighlight nos dashboards/shell context.
AppMenuRow active: ring-1 ring-primary/30 + bg chrome-menu-row-active.

NÃO:
- Alterar screens folha/hubs
- Unificar lógica de negócio num mega-router
- E2E novos (O-7)

Validação: npm run build + smoke 3 roles.
```
