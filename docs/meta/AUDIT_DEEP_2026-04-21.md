# Audit Deep 2026-04-21 (code-only) — caminho crítico alpha

Audit feito sem Firefox, só lendo código. Complementa o audit visual com Firefox Dev Edition já em curso (ver `ALPHA_2026-04-25.md §9.1`). Produzido em sessão solo de ~2h enquanto o Frank está a almoçar.

**Scope**: apenas driver + passenger + auth (+ shared UI que eles usam). Partner/Admin ficam fora por decisão — não são target mobile do alpha.

**Regra**: nada codado neste audit. Só findings classificados + fix proposto. Aplicação fica para PR depois de review.

---

## A. Bugs funcionais (prioridade sobre a11y — impactam alpha directamente)

### A.1 (P1) — **B1: race "viagem desaparece do driver"** — CAUSA IDENTIFICADA

**Sintoma**: durante o smoke desta manhã (2 tabs driver+passenger), a viagem apareceu na lista do driver, depois desapareceu, depois reapareceu com "insistência" (refresh manual).

**Causa confirmada no código**:

1. `backend/app/core/config.py:62` — `OFFER_TIMEOUT_SECONDS: int = 15` — offer expira 15s após criado.
2. `backend/app/services/trips.py:967-982` — `list_offers_for_driver` filtra `TripOffer.expires_at > now` + `TripOffer.status == pending` + `Trip.status == requested`.
3. `backend/app/services/offer_dispatch.py:217-235` — `expire_stale_offers` marca como `expired` tudo `< now`.
4. `backend/app/services/offer_dispatch.py:238-289` — `redispatch_expired_trips` cria novos offers, **mas** com throttle `REDISPATCH_MIN_INTERVAL_SECONDS = 10s`.

**Timeline reproduzível**:

- `t=0s` — passageiro pede, offer criada, `expires_at = t+15s`.
- `t=4s` — driver poll 1: vê a viagem.
- `t=8s` — driver poll 2: vê a viagem.
- `t=12s` — driver poll 3: vê a viagem.
- `t=15s` — offer expira.
- `t=16s` — driver poll 4: **não vê** (offer expired filtrado).
- `t=25s` — `redispatch_expired_trips` corre (10s depois do último dispatch), cria novo offer.
- `t=28s` — driver poll 6: **vê outra vez**.

→ Gap ~10s onde viagem "desaparece". Bate exactamente com o que observámos.

**Fix proposto (zero risco, config-only)**:

```python
OFFER_TIMEOUT_SECONDS: int = 60   # era 15
REDISPATCH_MIN_INTERVAL_SECONDS: int = 5  # era 10
```

- 60s dá ao motorista tempo real para avaliar e aceitar (Uber usa ~30s mas temos 1 motorista na alpha, mais generoso).
- 5s de redispatch cobre gap se acontecer.
- CI e2e usa override (`OFFER_TIMEOUT_SECONDS=1`, `E2E_OFFER_TIMEOUT_FLOOR_SECONDS=120`) — **não afectado** pelo default novo.

**Deploy**: mudar default em `config.py` + confirmar no Render env vars se há override.

**Risco**: baixo. Só prolonga janela de vida do offer. Se motorista fica muito tempo sem aceitar, `redispatch_expired_trips` ainda corre depois.

**Prioridade**: **P1 alpha** — aplicar antes de sábado.

### A.2 (P2) — **B2: passenger vê "Sem motoristas disponíveis" apesar de driver ter aceitado**

**Sintoma**: durante o smoke, o passenger viu "Sem motoristas disponíveis de momento" (estado amarelo, timestamp 11:24:00) depois de o driver já ter aceitado (timestamp 11:23:47).

**Causa provável no código**:

- `PassengerStatusCard.tsx:15` — `PASSENGER_SEARCH_FALLBACK_AFTER_SEC = 10` → a mensagem muda de "A procurar motorista…" para "Sem motoristas disponíveis de momento" ao cabo de 10s.
- Render free tem cold start. Poll do passenger é a cada ~2s mas pode haver atraso de rede + delay entre o commit do accept no DB e o push ao passenger.

**Fix proposto (baixo risco)**:

```ts
// web-app/src/features/passenger/PassengerStatusCard.tsx
export const PASSENGER_SEARCH_FALLBACK_AFTER_SEC = 25  // era 10
```

25s dá margem ao cold start + propagação. Se realmente não há motorista, o tester vai esperar 25s em vez de 10s — aceitável para alpha sábado.

**Alternativa mais robusta (maior esforço)**: em vez de depender do tempo, detectar `trip.status === 'accepted' || 'arriving' || 'assigned'` e não mostrar fallback nesse caso. Já deve estar parcialmente implementado mas vale ver.

**Prioridade**: **P2 alpha** — aplicar se tempo permitir.

---

## B. Contraste / a11y universal — `disabled:opacity-50` (12+ sítios)

**Padrão problemático identificado globalmente**: `disabled:opacity-50` em botões com fundo colorido e texto branco (ou inverso) colapsa o contraste para ~1.5:1 (muito abaixo de WCAG AA mínimo 4.5:1). Firefox Inspector já o detectou no `BetaAccountPanel` (#157) mas o padrão está em **toda a app**.

### B.1 Sítios críticos para alpha (driver + passenger + auth)

| # | Ficheiro | Linha | Elemento | Fix |
|---|---|---|---|---|
| B1a | `components/layout/PrimaryActionButton.tsx` | 23 | Base do botão principal (usado por passenger "Pedir viagem", driver "Aceitar"/"Iniciar"/"Terminar") | **Crítico** — uma mudança aqui resolve múltiplos ecrãs. Trocar `disabled:opacity-50` por `disabled:from-muted disabled:to-muted disabled:text-muted-foreground disabled:shadow-none`. |
| B1b | `components/cards/RequestCard.tsx` | 64 | Botão "ACEITAR" do driver | `disabled:opacity-50` → `disabled:from-muted disabled:to-muted disabled:text-muted-foreground disabled:shadow-none`. |
| B1c | `features/auth/LoginScreen.tsx` | 177 | Botão "Entrar" | `disabled:opacity-50` → `disabled:bg-muted disabled:text-muted-foreground`. |
| B1d | `features/passenger/TripPlannerPanel.tsx` | 139 | Botão "Pedir viagem" (idle) | `disabled:opacity-50` → `disabled:bg-muted disabled:text-muted-foreground`. |
| B1e | `features/passenger/TripPlannerPanel.tsx` | 168 | Botão "Repor" (planning) | `disabled:opacity-50` → `disabled:opacity-70` (bg-transparent tolera opacity). |
| B1f | `features/passenger/TripPlannerPanel.tsx` | 202 | Botão "Confirmar viagem" | `disabled:opacity-50` → `disabled:bg-muted disabled:text-muted-foreground`. |
| B1g | `features/passenger/TripPlannerPanel.tsx` | 220 | Botão "Repor" (confirming) | `disabled:opacity-50` → `disabled:opacity-70`. |

**Prioridade**: **P1 alpha** — 7 fixes, 1 PR, zero risco lógico.

### B.2 Sítios não-críticos para alpha (Partner + Admin)

**~30 ocorrências em `AdminDashboard.tsx`, `PartnerDriverDetail.tsx`, `PartnerHome.tsx`, `PartnerTripDetail.tsx`**.

Não são mobile-first nem target dos testers. **Skip no PR de alpha**. Pós-alpha, fazer varrimento em 1 PR dedicado.

### B.3 shadcn/ui base (`button.tsx`, `tabs.tsx`, `input.tsx`)

3 ocorrências em componentes shadcn da base. Propagar fix aqui afecta toda a app. **Não fazer agora** — risco de partir testes ou UX em sítios não auditados. Pós-alpha.

---

## C. LoginScreen (4 separadores Passageiro/Motorista/Frota/Admin)

### C.1 (P2) — **Separadores como Links sem `aria-current`**

**Código** (`LoginScreen.tsx:94-135`): 4 `<Link>` com classe condicional para estado activo. Screen readers não sabem qual está seleccionado.

**Fix**:

```tsx
<Link
  to="/passenger"
  aria-current={requestedRole === 'passenger' ? 'page' : undefined}
  className={...}
>
  Passageiro
</Link>
```

Aplicar a todos os 4 Links. Zero impacto visual, melhora navegação com leitor de ecrã.

**Nota alternativa**: mudar para `role="tablist"` + `role="tab"` seria semanticamente puro (é o que parece visualmente), mas perde a navegação por URL que o user deseja (cada "tab" abre `/passenger`, `/driver`, etc). Manter como Links é o correcto. Só falta `aria-current`.

**Prioridade**: **P2 alpha** — fix trivial, justifica entrar.

### C.2 (P2) — **Separadores com altura <44px**

**Código**: `py-2.5` → ~40px altura. Touch target mínimo é 44px.

**Fix**: `py-3` → ~48px. Ou `min-h-11`.

**Prioridade**: **P2 alpha** — trivial, melhora tap em mobile.

### C.3 (P3) — **Focus ring em falta nos Links**

Links têm `hover:scale`/`active:scale` mas sem `focus-visible:ring-2 focus-visible:ring-ring`. Keyboard users perdem indicação.

**Fix**: adicionar `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none`.

**Prioridade**: **P3 alpha** — nice-to-have. Testers de alpha usam touch, não keyboard.

### C.4 (P2) — **Hint de password em `text-xs`**

**Código** (`LoginScreen.tsx:166-169`): texto com instrução importante sobre password BETA em `text-xs` (~12px).

**Fix**: `text-xs` → `text-sm`.

**Prioridade**: **P2 alpha** — testers precisam de ler isto para entrar.

---

## D. DriverDashboard

### D.1 (P2) — **Polling footnote em `text-xs text-foreground/55`**

**Código** (`DriverDashboard.tsx:780`): `<p className="text-center text-xs text-foreground/55 ...">` mostra "A atualizar estado…", "Sem novidades…".

Opacity 55% do foreground escuro sobre bg claro → contraste ~3:1. Em 360px é apertado.

**Fix**: `text-xs text-foreground/55` → `text-sm text-foreground/75`.

### D.2 (P2) — **Badge de estado com contraste possivelmente baixo**

**Código** (`DriverDashboard.tsx:775`): `<span className="... bg-primary/15 text-primary text-xs font-semibold ...">`.

`text-primary` sobre `bg-primary/15` — verde sobre verde diluído. Contraste ~3:1 estimado. Firefox Inspector provavelmente assinalaria.

**Fix**: `bg-primary/15 text-primary` → `bg-primary/20 text-primary-foreground` (branco sobre verde mais saturado — contraste claro AA).

Alternativa mais segura: `bg-primary text-primary-foreground` (sólido).

**Prioridade**: **P2 alpha**.

### D.3 (P2) — **Painel GPS upload é demasiado verboso para tester leigo**

**Código** (`DriverDashboard.tsx:448-483`): mostra "GPS upload: ok", "Servidor: 38.69462, -9.30379 (age ~6s)", `request_id`, erros com status HTTP.

É excelente debug info para o Frank, mas 5 testers leigos vão ver "request_id fjdksljf" e assustar-se.

**Fix proposto (médio)**: esconder coords+request_id atrás de `<details>` HTML nativo com label "Diagnóstico técnico" ou só em DEV mode (`import.meta.env.DEV`).

**Prioridade**: **P2 alpha** — UX para testers.

### D.4 (P3) — **Texto "Sem viagens disponíveis" em estado vazio**

**Código** (`DriverDashboard.tsx:613-616`): `text-base` + `text-sm mt-1`. OK visualmente. Sem fix.

---

## E. PassengerDashboard

### E.1 (P2) — **Polling footnote em `text-xs text-foreground/55`** (idêntico a D.1)

**Código** (`PassengerDashboard.tsx:883`). Mesmo fix: `text-sm text-foreground/70`.

### E.2 (Info — X1) — **"Indica recolha e destino no mapa"**

**Código** (`PassengerDashboard.tsx:804`): texto que pressupõe selector por mapa. O user quer substituir por pesquisa de nome/código postal (anotado como X1 na sessão anterior).

**Não fixar agora** — parte da feature X1, PR separado pós-alpha.

### E.3 (P3) — **TripPlannerPanel "Começa por indicar o destino" em `text-xs`**

**Código** (`TripPlannerPanel.tsx:127`): `text-xs text-muted-foreground`. Já foi fixado na versão **embedded** do PassengerDashboard (#157), mas em modo **não-embedded** ainda é `text-xs`.

**Fix**: harmonizar para `text-sm`.

**Prioridade**: **P3 alpha** — o modo embedded é o que os testers vêem em mobile, mas bom harmonizar.

---

## F. ActiveTripActions

### F.1 (P2) — **Botão "Cancelar viagem" sem peso visual em estado normal**

**Código** (`ActiveTripActions.tsx:235-246`): `text-muted-foreground` em estado normal, só muda para destrutivo em hover. Num smoke real, o motorista pode não perceber que é um botão até passar o dedo.

**Fix**: adicionar `font-medium` para dar peso; ou usar `text-foreground/75` em vez de `text-muted-foreground` para contraste ligeiramente melhor mantendo a hierarquia visual.

**Prioridade**: **P3 alpha** — o botão primário (Iniciar viagem) é dominante e é o que importa.

### F.2 (P3) — **Links Waze/Google Maps abrem new tab sem aviso**

**Código** (`ActiveTripActions.tsx:187-225`): `target="_blank"` sem indicação visual/aria de "abre em nova janela".

**Fix**: adicionar `aria-label="Pickup no Waze (abre noutra aplicação)"` a cada link.

**Prioridade**: **P3 alpha** — não bloqueia nada.

---

## G. RequestCard

### G.1 (P1) — **Botão "ACEITAR" usa `disabled:opacity-50`** (ver B.1b)

### G.2 (P3) — **Labels em `text-xs uppercase tracking-wide`**

**Código** (`RequestCard.tsx:41, 46, 51, 57`): 4 labels em `text-xs`.

Em 360px apertado mas é padrão "caption". Sem fix agora.

---

## H. StatusHeader

### H.1 (P2) — **`ongoing` usa `bg-secondary` (vermelho médio) + texto branco**

**Código** (`StatusHeader.tsx:21`): `bg-secondary text-secondary-foreground`. Theme portugal.css:
- `--color-secondary: hsl(0 55% 55%)` → vermelho médio claro (#c36464)
- `--color-secondary-foreground: hsl(0 0% 100%)` → branco
- Contraste ~3.05:1. **Passa AA para texto grande (`text-xl`)** mas é apertado.

**Fix opcional**: escurecer para `hsl(0 55% 45%)` → contraste ~4.5:1. Afecta toda a app (tema base). Discutir em PR dedicado.

**Prioridade**: **P3 alpha** — já passa AA em texto grande, só não em texto pequeno.

### H.2 (Info) — **Outros variants OK**

- `requested` (accent amarelo/preto): contraste >7:1. OK.
- `accepted`/`arriving` (primary verde/branco): contraste ~4.5:1. OK.
- `completed` (muted/foreground): contraste >10:1. OK.
- `error` (destructive): contraste ~5:1. OK.

---

## I. BetaAccountPanel (já fixado em #157)

- A1 (contraste 1.47:1) já resolvido com `disabled:bg-muted disabled:text-muted-foreground`.
- Nota: mesmos componentes no painel do Admin (`AdminDashboard.tsx`) têm o mesmo padrão. Skip para alpha (não-mobile).

---

## J. MapView

- A5 (mapa sem aria-label) já fixado em #157.
- Outros aspectos (marcadores, tiles, gestão de tokens MapTiler) fora de scope audit.

---

## Sumário executivo — PR proposto para aplicar antes de sábado

### PR 1: "fix(alpha): B1 race viagem driver + B2 passenger polling buffer" ⭐ **crítico**

- `config.py`: `OFFER_TIMEOUT_SECONDS 15→60`, `REDISPATCH_MIN_INTERVAL_SECONDS 10→5`.
- `PassengerStatusCard.tsx`: `PASSENGER_SEARCH_FALLBACK_AFTER_SEC 10→25`.
- Testes: confirmar que testes E2E com override continuam a passar.
- Docs: adicionar entrada em `ALPHA_2026-04-25.md §9.1` marcando B1/B2 como resolvidos.

**Tempo estimado**: 30 min. **Risco**: baixo. **Impacto alpha**: alto.

### PR 2: "mobile: a11y pass 2 — disabled state + LoginScreen tabs" (Onda 2.5 continuação)

- `PrimaryActionButton.tsx`, `RequestCard.tsx`, `LoginScreen.tsx`, `TripPlannerPanel.tsx` × 4 → trocar `disabled:opacity-50` por `disabled:bg-muted/from-muted`.
- `LoginScreen.tsx`: `aria-current` nos 4 Links + `py-3` + `focus-visible:ring` + hint password `text-sm`.
- `DriverDashboard.tsx`: polling footnote `text-sm text-foreground/70`; badge de estado contraste.
- `PassengerDashboard.tsx`: polling footnote `text-sm text-foreground/70`.
- `TripPlannerPanel.tsx`: hint "Começa por indicar o destino" → `text-sm`.
- Docs: `ALPHA_2026-04-25.md §9.1` com lista completa.

**Tempo estimado**: 60 min. **Risco**: baixo (visual only). **Impacto alpha**: alto.

### PR 3: "driver: ocultar diagnóstico GPS atrás de `<details>` em prod" (opcional)

- `DriverDashboard.tsx:448-483` → esconder coords + request_id em produção, manter em DEV.

**Tempo estimado**: 30 min. **Risco**: baixo. **Impacto alpha**: médio.

### Fora do PR de alpha (pós-piloto)

- Varrimento `disabled:opacity-50` em Admin/Partner (~30 sítios).
- Varrimento em shadcn base components.
- `StatusHeader.ongoing` — escurecer vermelho para AA em texto pequeno.
- Focus ring global nos botões/links.

---

## Metodologia deste audit

- **Sem Firefox**, só leitura de código. Cruzámos com padrões conhecidos do PR #157 (contraste/opacity-50).
- **Sem side effects**: nenhum ficheiro foi tocado neste audit.
- **Scope fechado**: driver + passenger + auth apenas.
- **Bugs funcionais** apareceram porque investiguei B1 no backend (offer_dispatch, config) para dar causa concreta e fix preciso.
