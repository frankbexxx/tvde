# PROMPT AMB-F3 — Partner craft visual

**Estado:** executável  
**Pré-requisito:** F1 merged; F2 recomendado  
**Branch sugerido:** `feat/amb-f3-partner-craft`

---

```
Fase AMB-F3 — Partner: craft visual (main content first)

Pré-requisito: F1 merged. F2 recomendado mas não bloqueante.

Objectivo: aplicar ambiance nos ecrãs Partner com mapa de listas/painéis — MELHOR campo de teste. Presença contida, não decoração.

Scope IN (prioridade):
1. web-app/src/features/partner/screens/PartnerHomeDashboard.tsx — KPIs, secções, cards
2. Hubs: PartnerFleetHubScreen, PartnerTripsHubScreen (cards entrada, não só botões)
3. PartnerAlertsPanel — se encaixar sem mudar lógica
4. Usar tokens chrome F1; estender tokens partner-only SÓ se contrato F0 permitir e documentar

Scope OUT (esta fase):
- PartnerSideMenu drawer (deixar para sub-fase F3b se F3 main estiver estável)
- Partner rotas profundas (/partner/drivers/:id) — opcional mínimo
- Admin dashboard
- Driver / Passenger

Regras visuais:
- Hierarquia: secções com títulos; hubs como cards (ícone + título + subtítulo 1 linha)
- Gradientes/sombras subtis; sem competir com dados tabulares
- Reutilizar infoBoxTemplate / BORDER_SURFACE / SHADOW_CARD onde fizer sentido
- Não alterar partnerMenuNav.ts nem árvore menu

Validação:
- npm run build
- Smoke partner: home → hubs Frota/Viagens → Definições Aspeto
- Verificar 4 temas no dashboard partner

NÃO:
- Refactor AppMenuShell
- Mapa live partner (PartnerFleetMapScreen) — toque mínimo se inevitável
- Novos temas

Sub-fase futura (NÃO executar agora): F3b PartnerSideMenu identidade + secções

No fim: screenshots descritos + lista F3b pendente.
```
