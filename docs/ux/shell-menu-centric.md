# Shell menu-centric — contrato UX (todas as roles)

Princípio: **nada órfão**. Cada funcionalidade tem um sítio canónico num **sub-ecrã do menu lateral**. A bottom bar e atalhos no main **abrem o menu** nesse sub-ecrã (ou renderizam o **mesmo componente**).

## Regras

1. **Uma fonte de verdade** — extrair *screen components* reutilizados entre menu e main (se algum main persistir).
2. **Bottom nav** — excepto «Início» (main leve) e toggle «Menu» (raiz):
   - atalhos abrem `menuScreen` correspondente com drawer aberto;
   - tab activa reflecte `menuScreen` quando o menu está aberto.
3. **Header `userCompact`** — sem ícones soltos de perfil/definições; conta e preferências **dentro do menu** (`profile` / `settings`).
4. **Início** — KPIs, alertas, pesquisa rápida; **sem** painéis de conta duplicados.
5. **Rotas profundas** (`/partner/drivers/:id`, etc.) — mantêm-se; header compacto + voltar.

## Checklist órfãos (por role)

| Critério | Driver | Passageiro | Partner |
|----------|--------|------------|---------|
| Bottom nav abre menu no sub-ecrã | Rendimentos, Caixa | Histórico, Conta | Frota, Caixa |
| Conta BETA só no menu | Perfil | Conta | Perfil |
| Header userCompact | Sim | Sim | Sim (PR shell) |
| Lista completa ≠ resumo no menu | Docs, viagens | Histórico | Frota (lista+mapa) |
| Sem UI duplicada tab vs menu | — | — | Frota/Caixa |

## Implementação por fase

- **Fase 1 (partner):** este contrato; partner alinhado a driver/passageiro.
- **Fase 2 (O-NAV-PP-1):** auditoria driver/passageiro com este checklist; fixes mínimos.

Referências: [`DriverDashboard.tsx`](../../web-app/src/features/driver/DriverDashboard.tsx), [`PassengerDashboard.tsx`](../../web-app/src/features/passenger/PassengerDashboard.tsx), [`PartnerHome.tsx`](../../web-app/src/features/partner/PartnerHome.tsx).
