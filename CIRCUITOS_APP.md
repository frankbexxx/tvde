# Circuitos da App TVDE — Resumo Gráfico

Diagramas dos fluxos principais. Renderiza em [GitHub](https://github.com), [Mermaid Live](https://mermaid.live) ou extensões Markdown com suporte Mermaid.

---

## 1. Arquitetura Geral

```mermaid
flowchart TB
    subgraph Frontend["Web App (React)"]
        P[Passageiro]
        D[Motorista]
        P --> |/passenger| API
        D --> |/driver| API
    end

    subgraph Backend["Backend (FastAPI)"]
        API[Routers]
        SVC[Services]
        API --> SVC
    end

    subgraph Data["Dados"]
        DB[(PostgreSQL)]
        SVC --> DB
    end

    subgraph External["Externo"]
        Stripe[Stripe API]
        WH[Webhook Stripe]
        SVC --> Stripe
        WH --> |payment_intent.succeeded| SVC
    end

    P -.->|polling 3s| API
    D -.->|polling 2s| API
```

---

## 2. State Machine da Viagem

```mermaid
stateDiagram-v2
    [*] --> requested: Passageiro cria

    requested --> assigned: Auto-dispatch ou Assign
    assigned --> requested: Timeout 2 min

    assigned --> accepted: Motorista ACEITAR
    accepted --> cancelled: Timeout 10 min
    accepted --> arriving: Motorista Cheguei
    accepted --> cancelled: Motorista Cancelar

    arriving --> ongoing: Motorista Iniciar
    arriving --> cancelled: Motorista Cancelar

    ongoing --> completed: Motorista Concluir
    ongoing --> failed: Timeout 6 h

    completed --> [*]
    cancelled --> [*]
    failed --> [*]
```

---

## 3. Fluxo Passageiro

```mermaid
flowchart LR
    subgraph Passageiro
        A[Sem viagem] -->|Pedir viagem| B[À procura]
        B -->|Auto-dispatch ou Assign| C[Motorista atribuído]
        B -->|Cancelar| A
        C -->|Motorista aceita| D[Em viagem]
        C -->|Cancelar| A
        D -->|Motorista conclui| E[Concluída]
        E -->|Pedir nova viagem| A
    end

    subgraph Backend
        B -.->|create_trip| API1
        C -.->|assign_trip| API2
        D -.->|complete_trip| API3
    end
```

---

## 4. Fluxo Motorista

```mermaid
flowchart LR
    subgraph Motorista
        O[Offline] -->|Toggle| D[Disponível]
        D -->|Toggle| O
        D -->|Ver lista| L[Lista assigned]
        L -->|ACEITAR| A[A caminho]
        A -->|Cheguei| AR[A chegar]
        AR -->|Iniciar| OG[Em viagem]
        OG -->|Concluir| C[Concluída]
        A -->|Cancelar| D
        AR -->|Cancelar| D
        C --> D
    end
```

---

## 5. Fluxo Stripe (Accept → Complete)

```mermaid
sequenceDiagram
    participant M as Motorista
    participant API as Backend
    participant S as Stripe
    participant WH as Webhook

    Note over M,WH: ACEITAR (accept_trip)
    M->>API: POST /driver/trips/{id}/accept
    API->>S: create_authorization_payment_intent (50¢)
    S-->>API: requires_confirmation
    API->>API: Payment(processing), Trip(accepted)
    API-->>M: 200 OK

    Note over M,WH: CONCLUIR (complete_trip)
    M->>API: POST /driver/trips/{id}/complete
    API->>API: Calcular final_price
    API->>S: update_payment_intent_amount
    API->>S: capture_payment_intent
    S-->>API: succeeded
    API->>API: Trip(completed), driver is_available=True
    API-->>M: 200 OK

    S->>WH: payment_intent.succeeded
    WH->>API: POST /webhooks/stripe
    API->>API: Payment(succeeded)
```

---

## 6. Endpoints por Actor

```mermaid
flowchart TB
    subgraph Passageiro
        P1[POST /trips - criar]
        P2[GET /trips/history]
        P3[GET /trips/{id}]
        P4[POST /trips/{id}/cancel]
    end

    subgraph Motorista
        D1[GET /driver/trips/available]
        D2[POST /driver/trips/{id}/accept]
        D3[POST /driver/trips/{id}/arriving]
        D4[POST /driver/trips/{id}/start]
        D5[POST /driver/trips/{id}/complete]
        D6[POST /driver/trips/{id}/cancel]
    end

    subgraph Admin
        A1[POST /admin/run-timeouts]
        A2[POST /admin/trips/{id}/assign]
    end

    subgraph Dev
        DEV1[POST /dev/seed]
        DEV2[POST /dev/tokens]
        DEV3[POST /dev/auto-trip]
    end
```

---

## 7. Disponibilidade do Motorista

```mermaid
flowchart LR
    subgraph Driver
        AV[is_available = true] -->|ACEITAR| BUSY[is_available = false]
        BUSY -->|Complete / Cancel| AV
    end

    subgraph Regras
        AV -.->|Aparece em available| LIST
        BUSY -.->|Não aparece| LIST
        BUSY -.->|409 se outro aceitar| RACE
    end
```

---

## Legenda

| Símbolo | Significado |
|---------|-------------|
| `-->` | Transição / chamada |
| `-.->` | Polling / assíncrono |
| `[*]` | Estado inicial/final |
