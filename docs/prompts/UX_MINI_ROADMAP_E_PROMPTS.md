# UX — Mini roadmap e prompts (web-app)

Documento de trabalho: **só frontend** (React / Vite / TypeScript). Horizonte **3–5 dias**.

**Contexto no Cursor:** usar **`@web-app`** (ou a pasta `web-app/` no contexto) em cada prompt.

**Língua:** copy e microcopy **só em português de Portugal (PT-PT)** — sem variantes brasileiras (PT-BR); léxico europeu.

**Ortografia:** **Acordo Ortográfico de 1990 (AO90)** em toda a copy visível e na documentação de produto em PT (ex.: _ação_, _atualizar_, _seção_, _ativa_) — reduz ruído ao extrair chaves para **EN/ES**.

---

## Princípio base (não negociável)

**Incluir isto no início de todas as prompts para o Cursor:**

- **NÃO** alterar backend core
- **NÃO** alterar lógica Stripe
- **NÃO** alterar state machine
- **SÓ** mexer em UX / frontend / mensagens / estados visíveis

Restrições adicionais por prompt:

- **NÃO** alterar endpoints nem contratos API
- **NÃO** alterar lógica de negócio no servidor
- Alterações **mínimas e localizadas**; **sem** refactor global

---

## UX roadmap — curto prazo (3 a 5 dias)

### Dia 1 — Estados visíveis (crítico)

**Objetivo:** o utilizador percebe **sempre** o que está a acontecer.

**Problemas típicos:** silêncio, polling invisível, estado técnico vs humano.

**Passenger (labels humanos):**

| Estado (API) | Label sugerido                                 |
| ------------ | ---------------------------------------------- |
| `requested`  | À procura de motorista                         |
| `assigned`   | Motorista atribuído                            |
| `accepted`   | Motorista a caminho                            |
| `arriving`   | Chegou / quase a chegar                        |
| `ongoing`    | Viagem em curso                                |
| (pagamento)  | Pagamento a processar (quando aplicável na UI) |
| `completed`  | Concluído / Viagem concluída                   |
| `cancelled`  | Viagem cancelada                               |

**Driver (labels humanos):**

| Contexto                   | Label sugerido             |
| -------------------------- | -------------------------- |
| Viagem disponível na lista | Nova viagem disponível     |
| `accepted`                 | A dirigir-se ao passageiro |
| `arriving`                 | À espera / no local        |
| `ongoing`                  | Em viagem                  |
| `completed`                | Viagem concluída           |

_Ajustar copy fino na Prompt 5 (microcopy)._

---

### Dia 2 — Erros e falhas (crítico)

**Objetivo:** nunca deixar o utilizador perdido.

**Incluir:** erro de rede, falha de polling, timeout de ação, pagamento falhado.

**Regra:** sempre mostrar **o que aconteceu** + **o que fazer a seguir**.

**Prompt completa:** [Prompt 2](#prompt-2--erros-e-fallback-ux) (após validar o Dia 1).

---

### Dia 3 — Pagamento (confiança)

**Objetivo:** remover dúvida.

**Incluir:** estado visível de pagamento, confirmação explícita na UI, mensagem se webhook/atualização atrasar (sem mudar Stripe no backend).

**Prompt completa:** [Prompt 3](#prompt-3--pagamento-visível-só-ui).

---

### Dia 4 — Fluxo e fricção

**Objetivo:** remover hesitação.

**Incluir:** botões claros, loading states, evitar cliques duplicados, feedback imediato.

**Prompt completa:** [Prompt 4](#prompt-4--loading--anti-double-click).

---

### Dia 5 — Polimento final

**Objetivo:** parecer app “real”.

**Incluir:** microcopy, consistência visual, pequenos atrasos naturais, feedback suave.

**Prompt completa:** [Prompt 5](#prompt-5--microcopy-e-polimento).

---

## Formato padrão das prompts (copiar para cada tarefa)

```text
1. CONTEXTO
   Web-app ride-sharing (React + Vite + TypeScript). Backend estável — NÃO alterar.

2. REGRAS (CRÍTICO)
   - NÃO alterar backend
   - NÃO alterar endpoints
   - NÃO alterar contratos API
   - NÃO alterar lógica de negócio no servidor
   - NÃO alterar state machine / Stripe no backend
   - SÓ frontend (UI / UX / mensagens)

3. OBJETIVO CLARO
   (uma frase)

4. OUTPUT ESPERADO
   - código completo nas zonas tocadas
   - alterações mínimas e localizadas
   - sem refactor global
   - listar ficheiros alterados
```

---

## Estratégia de execução

1. **Não mandes tudo ao Cursor de uma vez** — **1 prompt → validar → integrar → próxima**.
2. Não uses Prompt 2–5 no Cursor **antes** de fechar e testar a Prompt 1.
3. **Verdade importante:** não estás a construir features de produto; estás a **eliminar confusão** (mensagens, estados, erros, fricção).

**Próximo passo imediato:** Prompt 1 → aplicar → testar rapidamente em `localhost:5173` (passenger + driver), com `@web-app` no contexto.

---

## Prompt 1 — Estados visíveis (passenger + driver)

**Estado:** pronta para colar no Cursor.

```text
UX IMPROVEMENT — VISUAL STATES (PASSENGER + DRIVER)

Context
We are working on a ride-sharing web app (React + Vite + TypeScript).
The backend is already stable and MUST NOT be changed.

Rules (STRICT)
- DO NOT modify backend
- DO NOT change API endpoints
- DO NOT change request/response formats
- DO NOT refactor architecture
- DO NOT change business logic or state machine on the server
- ONLY modify frontend (UI/UX layer)

Goal
Make ALL trip states clearly visible and understandable to a non-technical user.

Problem
Currently, system states are either:
- too technical
- not visible enough
- or unclear during transitions (polling, async updates)

Task

Passenger UI
Map backend trip states to human-readable labels (Portuguese):
- requested → "À procura de motorista"
- assigned → "Motorista atribuído"
- accepted → "Motorista a caminho"
- arriving → "Motorista quase a chegar" (or "Chegou" if the UI already distinguishes)
- ongoing → "Viagem em curso"
- completed → "Viagem concluída"
- cancelled → "Viagem cancelada"

Also include:
- loading/polling indicator ("A atualizar estado…" or similar)
- fallback if no update for a few seconds (subtle message, no backend change)

Driver UI
Map states for the active trip flow:
- when a trip is available to accept → reflect "Nova viagem disponível" in list context
- accepted → "A caminho do passageiro"
- arriving → "Chegou ao local" (or equivalent)
- ongoing → "Viagem em curso"
- completed → "Viagem concluída"

Requirements
- Add a visible status component (badge, banner, or section) where it helps most
- Keep changes minimal and localized
- Reuse existing components if possible
- No global refactor

Output
- Show exact code changes
- Indicate files modified
- Keep implementation simple and readable
```

---

## Prompt 2 — Erros e fallback UX

**Quando usar:** depois da Prompt 1 validada. Contexto: **`@web-app`**.

```text
UX IMPROVEMENT — ERRORS AND FALLBACK (PASSENGER + DRIVER)

Context
Ride-sharing web app (React + Vite + TypeScript), codebase under web-app/.
Backend is stable and MUST NOT be changed.

Rules (STRICT)
- DO NOT modify backend, endpoints, or API contracts
- DO NOT change Stripe or payment logic on the server
- ONLY frontend: messages, banners, inline alerts, empty states

Goal
The user is never left wondering what happened or what to do next.

Problem
Silent failures, generic errors, or missing guidance after network/polling issues.

Task
1. Network errors: detect failed fetches / offline (use existing patterns, e.g. navigator.onLine or catch blocks). Show a clear Portuguese message + suggested action (retry, check connection).
2. Polling / refresh failures: if a poll returns error or trip temporarily missing, show a non-alarming message and keep last known good state visible where safe.
3. Action timeout: if a user action takes unusually long (use a sensible client-side threshold), show “Ainda a processar…” or equivalent; do not add new API calls.
4. Payment failed: if trip or payment payload already exposes failed payment state, surface it clearly (Portuguese) with next steps (“Tenta novamente” / contact support placeholder if you only have copy, no new backend).

Requirements
- Reuse existing layout/components where possible
- Minimal, localized changes
- List files touched

Output
Exact code changes + file list
```

---

## Prompt 3 — Pagamento visível (só UI)

**Quando usar:** depois da Prompt 2 validada. Contexto: **`@web-app`**.

```text
UX IMPROVEMENT — PAYMENT VISIBILITY (TRUST)

Context
Ride-sharing web app (React + Vite + TypeScript), web-app/.
Backend and Stripe integration MUST NOT be changed.

Rules (STRICT)
- DO NOT modify backend or webhooks
- DO NOT add endpoints or change response shapes
- ONLY display and copy based on data the UI already receives (trip, payment fields if present)

Goal
Remove doubt about payment status during and after the trip.

Problem
User cannot tell if payment is processing, succeeded, or pending confirmation.

Task
1. Where payment status exists in existing client models/responses, show a clear label (Portuguese): e.g. processing / succeeded / failed — map from current field names without renaming API.
2. After trip completion, show an explicit short confirmation line when payment is succeeded (if data allows).
3. If trip is completed but payment still shows processing (if that state can occur in UI data), show a calm message: payment may take a few seconds to update — no new polling endpoints; optional reuse of existing poll interval copy.

Requirements
- No fake data; only reflect API state
- Minimal changes
- Passenger-focused first; driver if the same data is shown

Output
Code changes + files modified
```

---

## Prompt 4 — Loading + anti double-click

**Quando usar:** depois da Prompt 3 validada. Contexto: **`@web-app`**.

```text
UX IMPROVEMENT — LOADING STATES AND DOUBLE-SUBMIT PREVENTION

Context
Ride-sharing web app (React + Vite + TypeScript), web-app/.
Backend MUST NOT be changed.

Rules (STRICT)
- DO NOT modify backend
- ONLY UI state: disabled buttons, pending flags, spinners

Goal
Remove hesitation and accidental duplicate actions.

Problem
Users double-click accept/complete/arriving/start; buttons look idle while request is in flight.

Task
1. For primary trip actions (passenger and driver flows), disable the triggering button (or full action bar) while the related mutation request is pending.
2. Show a small loading indicator on or next to the button during pending (reuse existing Button/spinner patterns).
3. On success, rely on existing navigation/state refresh; on error, re-enable and show message (reuse error UX from Prompt 2 if already implemented).
4. Avoid global state refactor; prefer local component state or existing hooks.

Requirements
- Cover the main flows: request trip, accept, arriving, start, complete, cancel where applicable
- List files changed

Output
Code changes + file list
```

---

## Prompt 5 — Microcopy e polimento

**Quando usar:** depois da Prompt 4 validada. Contexto: **`@web-app`**.

```text
UX IMPROVEMENT — MICROCOPY AND FINAL POLISH

Context
Ride-sharing web app (React + Vite + TypeScript), web-app/.
Backend MUST NOT be changed.

Rules (STRICT)
- DO NOT modify backend
- Text, spacing, minor CSS/transitions only
- No large visual redesign

Goal
The product feels like a finished app: consistent, calm, Portuguese-first.

Task
1. Unify tone (tu vs você — pick one project-wide for passenger/driver) in user-visible strings touched in Prompts 1–4.
2. Shorten or clarify any awkward labels; fix typos.
3. Add subtle transitions (CSS) for status changes where cheap (opacity/transform 150–250ms), without new libraries.
4. Align spacing/typography for status banners and key CTAs for visual consistency.

Requirements
- Do not change routing or API usage
- Keep diffs small and readable
- List files modified

Output
Code changes + file list
```

---

## Índice das prompts UX

| #   | Seção                                                     | Tema                                  |
| --- | --------------------------------------------------------- | ------------------------------------- |
| 1   | [Prompt 1](#prompt-1--estados-visíveis-passenger--driver) | Estados visíveis (passenger + driver) |
| 2   | [Prompt 2](#prompt-2--erros-e-fallback-ux)                | Erros e fallback UX                   |
| 3   | [Prompt 3](#prompt-3--pagamento-visível-só-ui)            | Pagamento visível (só UI)             |
| 4   | [Prompt 4](#prompt-4--loading--anti-double-click)         | Loading + anti double-click           |
| 5   | [Prompt 5](#prompt-5--microcopy-e-polimento)              | Microcopy e polimento                 |

---

## Próximo passo

1. Colar **Prompt 1** num chat Cursor com **`@web-app`** (ou `web-app/` no contexto).
2. Aplicar, testar rapidamente em `localhost:5173`.
3. Só depois colar **Prompt 2**, e assim sucessivamente.

---

_Relacionado: `docs/architecture/TVDE_ENGINEERING_ROADMAP.md` (engenharia); este ficheiro é só UX web-app._
