# PROMPT AMB-F4 — Driver/Passenger micro-ambiance

**Estado:** executável  
**Pré-requisito:** F1 merged; F3 main estável; F2 recomendado  
**Branch sugerido:** `feat/amb-f4-map-roles`

---

```
Fase AMB-F4 — Driver/Passenger: micro-ambiance mapa

Pré-requisito: F1 merged; F3 main estável (gate Frank). F2 merged recomendado.

Objectivo: micro-ajustes chrome em overlays mapa — máximo cuidado, mínimo diff.

Scope IN:
- infoBoxTemplate.ts — constantes mapa/sheet/chip restantes (após piloto F1)
- MapBottomSheet.tsx, ActionPanel, InfoPanel, chips overlay (MAP_CHIP_OVERLAY)
- DriverSideMenu / PassengerSideMenu — APENAS classes surface (MENU_SURFACE, MENU_ROW_BTN), SEM reestruturar árvore ou AppMenuShell
- DriverDashboard / PassengerDashboard — só se wrapper sheet/chip

Scope OUT:
- MapView tiles, markers, rotas
- Bottom nav comportamento
- Partner (já F3)
- Estados críticos: border-l-info success accept, destructive cancel — manter

Regras:
- "Micro" = tokens + sombra/blur subtis; zero ornamentos novos
- Testar contraste: sheet compacta sobre mapa claro/escuro
- Regressão info-box-template.md: cantos rounded-2xl, scroll rules intactas

Validação:
- npm run build
- Smoke driver: idle, oferta, viagem activa — 2 temas
- Smoke passenger: pedido, viagem — 2 temas
- playwright driver/passenger existentes se houver

NÃO:
- Hub cards driver
- Menu raiz identidade
- Novos temas

Gate final: relatório curto "presença contida" — o que mudou vs o que ficou de fora (F3b, AppMenuShell, etc.)
```
