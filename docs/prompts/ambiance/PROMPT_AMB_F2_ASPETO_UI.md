# PROMPT AMB-F2 — Ecrã Aspeto melhorado

**Estado:** executável  
**Pré-requisito:** F1 merged; tokens chrome activos em ≥1 superfície piloto  
**Branch sugerido:** `feat/amb-f2-aspeto-ui`

---

```
Fase AMB-F2 — Ecrã Aspeto melhorado

Pré-requisito: F1 merged; tokens chrome activos em pelo menos 1 superfície piloto.

Objectivo: melhorar Menu → Definições → Aspeto (transversal 3 roles) com preview honesto — baixo risco, alto sinal.

Ficheiros principais:
- web-app/src/design-system/components/app/ThemeSelector.tsx
- web-app/src/features/settings/AppAppearanceSettings.tsx
- (opcional) extrair AmbiancePreviewCard.tsx pequeno no design-system

Implementar:
- Card por ambiance: mini swatch (3–4 cores dos tokens chrome + primary)
- Nome + descrição curta (1 linha, PT): ex. Portugal "Claro, operacional"; Dev "Escuro, menos glare"; etc.
- Estado activo claro (preferência actual, incluindo Auto)
- Bloco Auto: explicar "segue claro/escuro do telemóvel → Portugal / Dev"
- Preview usa tokens reais (não cores hardcoded fictícias)
- Manter data-testid app-appearance-settings; adicionar testids nos cards se útil

Regras:
- Sem novos ThemeId
- Sem mover Aspeto para fora de Menu → Definições
- Sem alterar fluxos menu v2
- Acessibilidade: botões focusáveis, contraste AA nos labels

Validação:
- npm run build
- Smoke: partner + driver + passenger → Menu → Definições → trocar tema → ver preview + piloto F1

NÃO:
- Partner dashboards (F3)
- Map sheets além do que F1 já ligou
- Renomear "Dev (sandbox)" sem pedido explícito
```
