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
6. **Tree / um tema por ecrã** — se um scroll tiver **2+ temas distintos**, usar **hub** + folhas; **Voltar** folha → raiz (atalhos bottom podem voltar directo à raiz).
7. **Tema (Aspeto)** — canónico em **Menu → Definições** nas 3 roles (`AppAppearanceSettings`); header default (login/admin) mantém `SettingsButton`.

## Checklist órfãos (por role)

| Critério | Driver | Passageiro | Partner |
|----------|--------|------------|---------|
| Bottom nav abre menu no sub-ecrã | Rendimentos, Caixa | Histórico, Conta | Frota→lista, Caixa |
| Conta BETA só no menu | Perfil | Conta | Perfil |
| Tema em Menu → Definições | Sim | Sim | Sim |
| Header userCompact | Sim | Sim | Sim |
| Sair no menu raiz | Sim | Sim | Sim |
| Hubs onde scroll longo | Zonas, Viagens† | OK | Frota, Viagens |
| Sem UI duplicada tab vs menu | — | — | Frota/Caixa |

† Viagens: link fixo «Ofertas silenciadas» (sub-ecrã mesmo com 0).

## Árvores alvo (v2)

### Partner

```
Raiz → Frota (hub) → Lista | Mapa | Adicionar
     → Viagens (hub) → Resumo | Lista | Exportar
     → Definições → Aspeto (tema)
Bottom Frota → Lista (atalho; Voltar → raiz)
```

### Driver

```
Raiz → Viagens → [link] Ofertas silenciadas (sempre)
     → Zonas (hub) → Orçamento | Sessão | Pedir mudança
     → Definições → Aspeto (tema)
```

### Passageiro

```
Raiz → Histórico | QR | Conta | Definições | Sair
     → Definições → Aspeto (tema)
```

## Implementação por fase

- **Fase 1:** partner menu-centric (#344).
- **Fase 2:** menu tree v2 — partner hubs + driver zones/viagens + passageiro audit.
- **Fase 2b:** pós-smoke — tema transversal Definições, link silenciadas fixo, retry cold-start Perfil.

Referências: [`AppAppearanceSettings.tsx`](../../web-app/src/features/settings/AppAppearanceSettings.tsx), [`DriverDashboard.tsx`](../../web-app/src/features/driver/DriverDashboard.tsx), [`PassengerSideMenu.tsx`](../../web-app/src/features/passenger/PassengerSideMenu.tsx), [`PartnerHome.tsx`](../../web-app/src/features/partner/PartnerHome.tsx).
