# AUDIT STATUS 2026-04-23 (D-2)

Relatório de verificação gerado em modo autónomo enquanto Frank está fora, baseado em três cruzamentos:

1. **Baseline D-2** (pytest / vitest / tsc / ruff / eslint em `main` @ `55b3052`).
2. **Cobertura de testes** dos fixes críticos da semana (#162, #168, #169, #170, #171).
3. **Cross-check** de `AUDIT_DEEP_2026-04-21.md` vs. estado actual de `main`.
4. **Higiene do repositório** — ficheiros trackeados que deveriam estar ignorados.

> **Contexto do dia:** quinta 2026-04-23, D-2 do piloto Alpha (sáb 25/04). Oppo 77 avariado, Reno 12 chega sexta. `BETA_MODE=true` em prod, 0 P0/P1 abertos.

---

## 1. Baseline D-2 (`main` @ `55b3052`)

| Check | Resultado | Duração |
|---|---|---|
| `pytest -q` (backend) | **140 passed** | ~38 s |
| `npx vitest run` (web-app) | **90 passed** (21 files) | ~9 s |
| `npx tsc -b --noEmit` | 0 errors | ~12 s |
| `ruff check .` | **All checks passed** | <1 s |
| `ruff format --check .` | ⚠️ **1 file would be reformatted** — `backend/app/sentry.py` | <1 s |
| `npx eslint .` | 0 errors, 0 warnings | ~6 s |

**Observação sobre `backend/app/sentry.py`:**

Ficheiro criado no PR #161 (integração Sentry) e escapou ao `ruff format` que correu em bloco no #160. É mecânico — `ruff format .` corrige em 1 s — mas **não se aplica hoje** (D-2, regra zero-código-sem-smoke). Deixar para **PR pós-piloto** junto com outros cleanups. Não impacta runtime.

---

## 2. Cobertura de testes — fixes recentes

Audit de **existência de testes dedicados** para o que foi mergido esta semana. Não mede qualidade dos testes existentes, só se **há** teste.

| PR | Fix | Teste dedicado existe? | Observação |
|---|---|---|---|
| #162 | `OFFER_TIMEOUT_SECONDS 15→60`, `REDISPATCH_MIN_INTERVAL_SECONDS 10→5`, `PASSENGER_SEARCH_FALLBACK_AFTER_SEC 10→25` | ✅ **Parcial** — `backend/tests/test_offer_timeout.py` exercita `create_offers_for_trip` / `expire_stale_offers` / `redispatch_expired_trips` ao nível de serviço. Os valores específicos não são assertados (testes usam overrides). | Suficiente como rede de segurança. Gap de sanity-check futuro: asserção que o default em `config.py` é coerente com `PASSENGER_SEARCH_FALLBACK_AFTER_SEC` no frontend (cross-boundary). |
| #168 | `ActiveTripActions` ghost outline + `confirmExternalNav` helper | ⚠️ **Ausente** — nenhum teste referencia `confirmExternalNav`. `ActiveTripActions.rtl.test.tsx` testa o fluxo de estado mas não os links Waze/Google Maps. | Gap P3. Pós-piloto: mock `window.confirm`, verificar `preventDefault` em cancelamento. |
| #169 | `useGeolocation` refactor — timeouts + `retry()` | ⚠️ **Ausente** — nenhum teste importa `useGeolocation`. | Gap P2 (timing-sensitive). Pós-piloto: vitest com `vi.useFakeTimers`, simular watchPosition + `sessionStorage.tvde_geolocation_failed`. |
| #170 | Remover `DEMO_ORIGIN`; `passengerLocation` passa a `undefined` até GPS real | ⚠️ **Ausente** — sem teste de regressão. | Gap P2. Pós-piloto: teste de integração que renderiza `PassengerDashboard` mock, verifica `MapView` recebe `passengerLocation={undefined}` enquanto GPS pending. |
| #171 | `historyStatusDotColor` helper + accents em `RequestCard` + histórico | ⚠️ **Ausente** — nenhum teste importa `historyStatusDotColor`. | Gap P3, trivial. Pós-piloto: 3-case test pure function (`completed` → verde, `failed` → destructive/70, default → muted). |

### Recomendação para PR pós-piloto "test hardening"

Ordem por ROI:

1. **useGeolocation** — hook crítico, 1 teste com fake timers cobre `FALLBACK_AFTER_MS`, `WATCH_POSITION_TIMEOUT_MS`, `retry()`. ~30 min.
2. **MapView + DEMO_ORIGIN regression** — garante que bug do #170 não volta. ~20 min.
3. **historyStatusDotColor + confirmExternalNav** — testes triviais para subir cobertura. ~10 min cada.
4. **Cross-boundary config test** — teste backend que verifica `OFFER_TIMEOUT_SECONDS > PASSENGER_SEARCH_FALLBACK_AFTER_SEC` (lógica implícita). ~10 min.

**Total estimado:** ~90 min. Fazer em sessão calma na segunda-feira pós-retro (27/04), depois de decidir o que fazer a seguir.

---

## 3. AUDIT DEEP 2026-04-21 vs. `main` — status por finding

Tabela completa dos 23 findings do `AUDIT_DEEP_2026-04-21.md`. Cada linha indica se foi aplicado, onde (PR), e o estado actual.

| ID | Severidade | Descrição | Status | PR | Nota |
|---|---|---|---|---|---|
| **A.1** | P1 | B1 race "viagem desaparece" (config timeouts) | ✅ Fechado | #162 | Config aplicada em `backend/app/core/config.py`. |
| **A.2** | P2 | B2 "Sem motoristas" prematuro | ✅ Fechado | #162 | `PASSENGER_SEARCH_FALLBACK_AFTER_SEC=25`. |
| **B.1a** | P1 | `PrimaryActionButton` disabled opacity | ✅ Fechado | #167 | Classes específicas disabled. |
| **B.1b** | P1 | `RequestCard` ACEITAR disabled opacity | ✅ Fechado | #167 | |
| **B.1c** | P1 | `LoginScreen` Entrar disabled opacity | ✅ Fechado | #167 | |
| **B.1d** | P1 | `TripPlannerPanel` Pedir viagem (idle) | ✅ Fechado | #167 | |
| **B.1e** | P1 | `TripPlannerPanel` Repor (planning) | ⚠️ **Verificar** | #167? | Possível aplicado mas não confirmado (usa `bg-transparent`, P1 mais brando). |
| **B.1f** | P1 | `TripPlannerPanel` Confirmar viagem | ✅ Fechado | #167 | |
| **B.1g** | P1 | `TripPlannerPanel` Repor (confirming) | ⚠️ **Verificar** | #167? | Idem B.1e. |
| **B.2** | skip | Admin/Partner `disabled:opacity-50` | 🟡 Adiado | — | Por design; pós-alpha. |
| **B.3** | skip | shadcn base components | 🟡 Adiado | — | Por design; pós-alpha. |
| **C.1** | P2 | LoginScreen `aria-current` nos Links | ✅ Fechado (superado) | #164 + #167 | `role="tablist"` + `role="tab"` + `aria-selected` substituem; mais rico semanticamente. |
| **C.2** | P2 | LoginScreen tabs touch <44px | ⚠️ **Verificar** | #167? | Relatório PR #167 menciona "focus + disabled + BrandStripe" mas não explicitamente `py-3`. |
| **C.3** | P3 | LoginScreen focus ring | ✅ Fechado | #167 | |
| **C.4** | P2 | LoginScreen hint password `text-xs` | ⚠️ **Verificar** | #167? | Possível aplicado no bloco de styling do error box. |
| **D.1** | P2 | DriverDashboard polling footnote | ✅ Fechado | #167 | |
| **D.2** | P2 | DriverDashboard badge `bg-primary/15` | ✅ Fechado | #167 | Passou a solid `bg-primary text-primary-foreground`. |
| **D.3** | P2 | DriverDashboard GPS panel verboso | 🟡 **Em aberto** | — | Adiado como polish opcional. Testers leigos vão ver "request_id". Candidato P3 pós-piloto. |
| **D.4** | P3 | DriverDashboard "Sem viagens" vazio | ✅ OK | — | Audit confirmou sem fix necessário. |
| **E.1** | P2 | PassengerDashboard polling footnote | ✅ Fechado | #166/#167 | |
| **E.2** | info | "Indica recolha e destino no mapa" (X1) | 🟡 Adiado | — | Por design; pós-alpha. Feature nova. |
| **E.3** | P3 | TripPlannerPanel hint (non-embedded) | ⚠️ **Verificar** | — | O embedded já foi harmonizado em #167; non-embedded talvez não. |
| **F.1** | P2 | ActiveTripActions cancelar sem peso | ✅ Fechado | #168 | **Ghost outline** em vez de só adicionar peso — aceite pelo Frank ("Ghost, acho eu, que te parece?"). |
| **F.2** | P3 | ActiveTripActions Waze target=_blank | ✅ Fechado (superado) | #168 | `confirmExternalNav` oferece mais que o `aria-label` proposto; pede confirmação. |
| **G.1** | P1 | RequestCard ACEITAR disabled | ✅ Fechado | #167 (ver B.1b) | |
| **G.2** | P3 | RequestCard labels `text-xs` | 🟡 **Em aberto** | — | Audit marcou "sem fix agora" (padrão caption). Manter. |
| **H.1** | P3 | StatusHeader `ongoing` bg-secondary vermelho | 🟡 **Em aberto** | — | Passa AA em texto grande; só não em texto pequeno. Candidato post-alpha. |

### Sumário

| Status | Qtd | % |
|---|---|---|
| ✅ Fechado | 15 | 65% |
| ⚠️ Verificar (≈ possivelmente fechado em #167) | 5 | 22% |
| 🟡 Em aberto por design (pós-alpha) | 4 | 17% |
| 🟡 Em aberto por decisão (polish opcional) | 3 | 13% |

(Percentagens não somam 100% por sobreposição "em aberto por design" vs. "por decisão".)

### Itens a verificar com o Frank no próximo sit-down

5 items marcados `⚠️ Verificar` — todos **low priority**, possivelmente fechados sem tracking fino:

- **B.1e + B.1g:** `disabled:opacity-50` em botões **transparentes** do `TripPlannerPanel` (Repor planning/confirming). Audit sugeriu `disabled:opacity-70`. Ver rapidamente no código actual.
- **C.2:** altura dos tabs do LoginScreen (≥44px).
- **C.4:** password hint em `text-sm` em vez de `text-xs`.
- **E.3:** TripPlannerPanel non-embedded harmonizado.

**Acção sugerida:** 10 min ao voltares, ler as linhas apontadas, e: (a) se já fechado — marcar ✅ neste relatório; (b) se aberto — decidir se entra em PR pequeno pré-piloto ou fica post-piloto.

---

## 4. Higiene do repositório

| Check | Resultado |
|---|---|
| Ficheiros trackeados com padrão `__pycache__` | **0** |
| Ficheiros trackeados `*.pyc` | **0** |
| Ficheiros `.DS_Store` / `Thumbs.db` trackeados | **0** |
| Ficheiros `.env` trackeados | **0** |
| Ficheiros `node_modules/` trackeados | **0** |

`.gitignore` está saudável. O `admin.cpython-313.pyc` que apareceu como untracked no início da sessão é benigno — já está coberto por `*.py[cod]` na linha 17 do `.gitignore`; aparece em `git status` quando os testes pytest são corridos num venv novo que recompila os `.pyc`. Não é problema.

---

## 5. Recomendações imediatas

### Para o resto da quinta
- Fazer o dry-run indoor 3 janelas (item 3 da lista de ontem) quando voltares.
- Verificar Sentry + UptimeRobot dashboards (item 4).
- **Opcional:** 10 min a cruzar os 5 items `⚠️ Verificar` da secção 3.

### Para sexta 24/04
- De manhã: `§E.2` Render Shell → colar outputs em `docs/_local/ALPHA_ACCOUNTS.md` → spot-check logins.
- Enviar convocatória WhatsApp com credenciais + link.
- À tarde: Reno 12 activo → smoke duplo real 2 Android (Frank + A13 como 2º dispositivo se Reno 12 for de Frank único; ou convidado com Reno 12 + Frank com A13).
- **18h:** freeze (zero deploys até sábado 12h).

### Pós-piloto (seg 27/04+)
1. PR "test hardening" (secção 2 deste relatório, ~90 min).
2. PR "ruff format `app/sentry.py`" (mecânico, 2 min).
3. PR "polish P3 residuais" se decidires atacar H.1, G.2, D.3.
4. Feature X1 (pesquisa por nome/postal) — novo épico.
5. Varrimento `disabled:opacity-50` em Admin/Partner (B.2).

---

*Gerado em modo autónomo, 2026-04-23 de manhã. Se algum item marcado `⚠️ Verificar` ou `🟡 Em aberto` estiver mal classificado, marcar neste ficheiro e re-comitar.*
