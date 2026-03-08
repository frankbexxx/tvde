# Estrutura de Componentes — Mobile-First Refactor

Documento gerado após refatoração estrutural da web-app (mobile-first absoluto).

---

## Árvore de Componentes

```
App
└── BrowserRouter
    └── ActivityLogProvider
        └── AuthProvider
            └── AppRoutes
                ├── header (sticky)
                │   ├── h1 "TVDE"
                │   └── RoleSelector
                └── main
                    └── Routes
                        ├── /passenger → PassengerDashboard
                        └── /driver → DriverDashboard

PassengerDashboard
├── ScreenContainer
│   ├── header (título + descrição)
│   ├── DevTools (collapsible)
│   └── content
│       ├── StatusHeader
│       ├── [error banner]
│       ├── [estimativa / TripCard / histórico]
│       └── PrimaryActionButton (fixed bottom, quando aplicável)

DriverDashboard
├── ScreenContainer
│   ├── header (título + descrição)
│   ├── DevTools (collapsible)
│   └── content
│       ├── Toggle (Disponível / Offline)
│       ├── [toast 409]
│       ├── [error banner]
│       ├── StatusHeader
│       ├── [RequestCard list | empty | ActiveTripSummary]
│       ├── [histórico]
│       └── ActiveTripActions (fixed bottom, quando viagem ativa)
│           └── PrimaryActionButton + [Cancelar link]

Layout components
├── ScreenContainer
├── StatusHeader
└── PrimaryActionButton

Cards
├── TripCard
└── RequestCard

UI primitives
├── Badge
├── Toggle
└── Spinner
```

---

## Decisões Estruturais

### 1. Separação /passenger e /driver
- Rotas distintas; role derivado do pathname (AuthContext).
- Cada feature tem o seu dashboard independente.
- RoleSelector no header permite alternar sem perder contexto.

### 2. ScreenContainer
- `max-w-md` (448px) centralizado — viewport alvo 375–430px.
- `min-h-screen`, flex column, padding generoso.
- Slot `bottomButton` para botão fixo no fundo (fora da área de scroll).

### 3. StatusHeader
- Sempre no topo do conteúdo.
- Badge grande colorido por estado (requested→amarelo, assigned→azul, etc.).
- Texto não técnico (ex: "À procura de motorista" em vez de "requested").

### 4. Uma ação primária por estado
- Passageiro: "Pedir viagem" | "Cancelar" | "Pedir nova viagem".
- Motorista: "ACEITAR" (por card) | "Cheguei" | "Iniciar viagem" | "Concluir viagem".
- Botão principal fixo no fundo quando existe ação.

### 5. Elementos técnicos
- ActivityPanel no layout (sidebar direita no desktop; abaixo no mobile).
- Sem IDs ou JSON visíveis na UI principal.
- DevTools colapsável (▶ Dev) para testes, sem impacto na UX.

### 6. Toggle Offline (motorista)
- Estado guardado em `localStorage`.
- Offline = não faz polling de viagens disponíveis.
- Backend continua a gerir `is_available` (ao aceitar/completar).

### 7. Toast 409
- Quando `accept` retorna 409: banner no topo "Viagem já foi aceite por outro motorista.".
- Lista de viagens é atualizada automaticamente (polling).

### 8. Polling 2.5s
- `usePolling` com intervalo de 2500ms (antes 5000ms).

---

## Fluxo Multi-Device

- **Passageiro no telemóvel, motorista no desktop:** fluxo suportado.
- **Dois motoristas no mesmo dispositivo:** 409 tratado com toast e refresh.
- **Responsivo:** `max-w-md` centralizado; em ecrãs maiores mantém largura fixa.
- **Safe area:** `safe-area-pb` para botões no fundo em dispositivos com notch/home indicator.

---

## Ficheiros Criados/Modificados

| Ficheiro | Tipo |
|----------|------|
| `components/layout/ScreenContainer.tsx` | Novo |
| `components/layout/StatusHeader.tsx` | Novo |
| `components/layout/PrimaryActionButton.tsx` | Novo |
| `components/cards/TripCard.tsx` | Novo |
| `components/cards/RequestCard.tsx` | Novo |
| `components/ui/badge.tsx` | Novo |
| `components/ui/Toggle.tsx` | Novo |
| `components/ui/Spinner.tsx` | Novo |
| `utils/format.ts` | Novo |
| `features/passenger/PassengerDashboard.tsx` | Refatorado |
| `features/driver/DriverDashboard.tsx` | Refatorado |
| `features/shared/DevTools.tsx` | Refatorado (collapsible) |
| `components/RoleSelector.tsx` | Simplificado |
| `routes/index.tsx` | ActivityPanel no sidebar (desktop) |
| `hooks/usePolling.ts` | Intervalo 2500ms |
| `index.css` | Safe area, fundo branco |
