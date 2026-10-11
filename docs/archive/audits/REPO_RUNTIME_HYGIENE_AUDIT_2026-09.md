# REPO + RUNTIME HYGIENE AUDIT — 2026-09

**Branch:** `audit/repo-runtime-hygiene-sep2026`  
**Modo:** READ-ONLY (excepto criação deste relatório + branch)  
**HEAD base:** `80480a3` (`main` alinhada com `origin/main` no início da auditoria)  
**Ambientes Render lidos:** `tvde-api`, `tvde-staging-api`, `tvde-app`, `tvde-staging-app`  
**Alterações a código / deps / env / deploy:** nenhuma

---

## Executive summary

O sistema está **estável em produção**. Não foram encontrados tracebacks, restarts, OOM, nem rajadas de 4xx/5xx nos logs Render amostrados (última semana / deploys recentes).

A auditoria aponta sobretudo para:

1. **Higiene de config Render** — staging e prod logam `ENV=production` + `BETA_MODE=True` (staging não é reconhecido por `is_staging_environment()`).
2. **Frontend debt** — chunk JS ~2.2 MB, `npm audit` com vulnerabilidades runtime (maplibre / react-router), componentes Radix/shadcn sem consumers, wrappers OTP no cliente sem uso.
3. **Backend debt controlada** — flags OFF / deprecated settings ainda no `Settings`, groundwork B2 (`queued` / `ENABLE_NEXT_TRIP_CHAINING`), `ruff` instalado no build Render, warning FastAPI de Operation ID duplicado (HEAD+GET health).
4. **Código morto confirmado** — poucos ficheiros; a maior parte dos “unused” do vulture são **falsos positivos** (rotas FastAPI).

**Não iniciar cleanup em massa sem revisão humana.** Preferir PRs pequenos e reversíveis.

### Contagens de prioridade (findings deste relatório)

| Prioridade | Count | Significado |
|---|---:|---|
| **P0** | **0** | Nada bloqueia operação estável agora |
| **P1** | **5** | Antes do piloto/comercial ou revisão de superfície de risco |
| **P2** | **14** | Manutenção próxima |
| **P3** | **12** | Housekeeping |

---

## Inventário (mapa do repo)

| Área | Local | Notas |
|---|---|---|
| Backend | `backend/app` (~157 módulos `.py`) | FastAPI + SQLAlchemy 2 + Alembic |
| Migrations | `backend/alembic/versions` (**27** ficheiros) | Inclui `c2d3…_trip_status_queued` (B2 inert) |
| Tests BE | `backend/tests` (**96** `test_*.py`) | Cobertura ampla; vulture não substitui testes |
| Web app | `web-app/src` (**317** `.ts/.tsx`) | Vite 7 + React 19 |
| Tests FE | `web-app` (**72** `*.test.*`) + Playwright e2e | |
| Scripts | `scripts/`, `backend/scripts/`, `scripts/ops/` | Mix operacional recente (F4 tolls) + históricos |
| Site landing | `site/` (`index.html`, `styles.css`, asset) | Estático VAMULÁ |
| Docs | `docs/` | Análise / ops / legal |
| CI | `.github/workflows/{backend,frontend,web-e2e}-ci.yml` | |
| Audits snapshot | `audits/` | Artefactos Maio/Abril 2026 (desactualizados vs npm audit 2026-09) |
| Tools | `tools/`, `backend/tools/simulator` | |

### Classificação usada

- **CONFIRMED DEAD** — zero referências + evidência git de abandono / substituição
- **PROBABLY DEAD** — tool diz unused; falta prova de caller dinâmico
- **LEGACY BUT ACTIVE** — antigo mas ainda no caminho runtime / config
- **UNKNOWN** — precisa verificação manual / staging probe

---

## Ferramentas usadas

| Ferramenta | Resultado resumido |
|---|---|
| `git` branch + archaeology | Branch criada; origem de ficheiros suspeitos |
| `ruff check app` | **All checks passed** |
| `vulture` (venv local, confidence 60/80) | 80%: vazio; 60%: sobretudo **falsos positivos** de rotas FastAPI |
| `pip-audit` (live 2026-09) | **Não concluiu** (timeout/rede OSV); fallback `audits/` Maio 2026 |
| `npx knip` | Unused files/deps/exports (ver secções A/B/C) |
| `npx depcheck` | `@tailwindcss/postcss` unused; `geojson` missing |
| `npm run lint` | 1 warning `react-hooks/exhaustive-deps` |
| `tsc -b` | **exit 0** |
| `npm audit` | **20** vulns (2 critical, 11 high, …) |
| Render CLI `services` / `deploys list` / `logs` | PROD+STG API + FE static builds |

**Nota:** `vulture` foi instalado no `backend/venv` local só para análise; **não** alterou lockfiles do repo.

---

## A. Confirmed dead code

| Item | Evidência | Confidence | P |
|---|---|---|---|
| `web-app/src/components/layout/BottomActionStack.tsx` | Introduzido em USER-SHELL-C (#323, Mai/2026); **zero imports** no repo; knip unused file | CONFIRMED DEAD | P3 |
| `web-app/src/components/ui/{alert-dialog,avatar,badge,card,progress,tabs}.tsx` | knip unused files; grep sem imports | CONFIRMED DEAD (UI stubs) | P3 |
| `@radix-ui/react-{alert-dialog,avatar,progress,tabs}` | Só usados pelos stubs acima; knip + depcheck | CONFIRMED DEAD (deps) | P3 |
| `web-app/src/api/auth.ts` → `requestOtp` / `verifyOtp` | Exportados; **LoginScreen** só chama `login`; zero outros callers | CONFIRMED DEAD (client wrappers) — **backend OTP continua activo** | P2 |
| `scripts/docs-audit-lote{1,2,3,4}.mjs` | One-shot Jun/2026; sem referências operacionais | CONFIRMED DEAD (histórico) | P3 |
| `web-app/scripts/dia23-static-audit.mjs` | knip unused file | CONFIRMED DEAD | P3 |

---

## B. Probable dead / needs verification

| Item | Razão | Refs | Class | P |
|---|---|---|---|---|
| `web-app/src/dev/simulateRoute.ts`, `testRoutes.ts` | knip unused; só se referem entre si | Dev map sim | PROBABLY DEAD | P3 |
| `web-app/src/dev/dia23LayoutProbe.ts` + hook | Soft-debug `?dia23debug=1`; pode ainda ser útil | Query-param gate | LEGACY BUT ACTIVE (dev) | P3 |
| Deprecated exports (`PASSENGER_TRIP_STATUS_LABELS`, cancel presets, payment disclosure literals, `AMBIANCE_OPTIONS`, `MENU_SECTION_TITLE` alias, etc.) | Marcados `@deprecated`; knip unused exports | Manter até limpar testes | PROBABLY DEAD / LEGACY | P3 |
| `backend` `@biomejs/biome` + `biome.json` | Lint scripts usam **ruff**; biome não referenciado em scripts CI principais | package.json backend | PROBABLY DEAD | P3 |
| `@tailwindcss/postcss` | depcheck/knip unused; project usa Tailwind 3 + postcss clássico | package.json | PROBABLY DEAD | P3 |
| `ENABLE_NEXT_TRIP_CHAINING` + `TripStatus.queued` | Flag default OFF; só config + state_machine + teste defaults; **sem writers runtime** | Comentários B2 SPIKE | LEGACY BUT ACTIVE (groundwork) | P2 — **não apagar** |
| Settings `BASE_FARE` / `PRICE_PER_KM` / `PRICE_PER_MIN` / `CANCELLATION_FEE_PERCENT` / `CANCELLATION_FEE_MIN` | Marcados DEPRECATED; ignorados por pricing actual | `config.py` + `pricing.py` | LEGACY BUT ACTIVE (compat .env) | P2 — **não apagar sem migração env** |
| Scripts históricos (`scripts/debug_map_pipeline.py`, `convert_uber_lisboa_veiculos.py`, `test_endpoints.py`, `1_start_db.ps1`…) | Datas Mar–Mai/2026; utilidade operacional baixa | Pasta `scripts/` | PROBABLY DEAD / archive | P3 |
| `audits/*.txt` snapshots | Desactualizados vs auditoria 2026-09 | Pasta `audits/` | LEGACY | P3 |
| Vulture “unused” routers (`admin_*`, `auth.login`, …) | FastAPI regista por decorator; vulture não vê callers | — | **FALSE POSITIVE** | — |

---

## C. Dependency findings

### Backend (instalado local venv + requirements)

| Package | Versão observada | Evidência | Severidade | Acção recomendada | Risco upgrade |
|---|---|---|---|---|---|
| fastapi | 0.128.2 (`requirements`: `>=0.115,<0.136.3`) | Pin anti MAL-2026-4750 | INFO | Manter pin até fix PyPI | Médio se subir major |
| sqlalchemy | 2.0.46 | Runtime OK | INFO | Sem urgência | Médio |
| pydantic | 2.12.5 | Runtime OK | INFO | Sem urgência | Médio |
| stripe | 14.3.0 | Runtime OK | INFO | Seguir changelog Stripe | Médio |
| sentry-sdk | 2.58.0 | Runtime OK | INFO | — | Baixo |
| PyJWT | ≥2.12 (CI ignora PYSEC-2025-183) | Comentário requirements | LOW (disputado) | Manter JWT_SECRET ≥32 | Baixo |
| ruff | 0.15.22 pinned **em requirements prod** | Aparece no `pip install` do deploy Render | P2 smell | Mover para deps de CI/dev | Baixo |
| pygments | 2.19.2 (transitivo) | `audits/pip-audit.txt` CVE-2026-4539 → 2.20.0 | P2 (dev/test) | Pin quando estável | Baixo |
| pytest / python-dotenv / pip | CVEs listadas em audits Mai/2026 | Snapshot antigo | P2/P3 | Re-correr `pip-audit` com rede estável | Baixo–médio |

**pip-audit live (2026-09-16):** tentativas com timeout — **não usar como “limpo”**. Re-executar offline/CI antes de upgrades.

### Frontend (`web-app` npm audit 2026-09-16)

| Package | Sev | Notas | P | Acção |
|---|---|---|---|---|
| `maplibre-gl` | **critical** | Runtime mapa | **P1** | Upgrade controlado + smoke mapas |
| `vitest` | **critical** | Dev/test | P2 | Upgrade em PR de tooling |
| `react-router` / `react-router-dom` | **high** | Runtime routing | **P1** | Upgrade patch/minor + smoke auth routes |
| `vite` / `undici` | **high** | Sobretudo toolchain/build/dev server | P2 | `npm audit fix` cuidadoso (sem `--force` cego) |
| `@playwright/test` / `playwright` | **high** | E2E | P2 | Upgrade Playwright |
| `postcss` / `nanoid` / `js-yaml` / `brace-expansion` / `browserslist` | high/mod | Transitivos build | P2–P3 | Via audit fix |
| `geojson` types | missing | Import type em maps/routing | P3 | Add `@types/geojson` ou dep explícita |

Versões app (package.json): React 19.2, Vite 7.3, RR 7.13, MapLibre 5.19, Stripe.js 9.x, Sentry React 10.x — stack moderna; dívida é **patch de segurança**, não “framework antigo”.

---

## D. Deprecated APIs

| API / símbolo | Onde | Estado | P |
|---|---|---|---|
| Settings fare knobs `BASE_FARE`… | `backend/app/core/config.py` | Deprecated; não usados em fare | P2 (docs/env only) |
| `CANCELLATION_FEE_PERCENT/MIN` | idem | Fee fixo em `pricing.py` | P2 |
| FE `@deprecated` labels/presets | `tripStatus`, `tripCancelReasons`, `passengerPaymentCopy`, `ambianceMeta`, `infoBoxTemplate` | Aliases; knip unused | P3 |
| `INITIAL_LOAD_TIMEOUT_MS` | `api/client.ts` | Alias de cold-start | P3 |
| `LEGACY_PET_CATEGORY = "pet"` | `pet_trip.py` | **LEGACY BUT ACTIVE** (compat dados) | **P2 — não remover** |
| `pi_mock_*` path | trips + reconciliation | Activo com `STRIPE_MOCK` / limpeza admin | LEGACY BUT ACTIVE | P2 |
| OTP client wrappers | `auth.ts` | Dead no UI; API backend viva | P2 |

---

## E. Render PROD warnings (`tvde-api` / `tvde-app`)

**Service IDs:** `srv-d6hj2g3uibrs73a036o0` (API), `srv-d6hmjc9aae7s73c10d60` (app)

### API

| Warning / sinal | Classificação | Notas |
|---|---|---|
| Startup `[TVDE] config ENV=production … BETA_MODE=True` | **EXPECTED** (beta) | Confirma política actual |
| `dev_tools_mounted=False` | **EXPECTED** | `/dev/*` off em prod |
| Alembic “Will assume transactional DDL” | **BENIGN** | Startup migration |
| pip notice “new release of pip” no build | **BENIGN** | Build image |
| `WEB_CONCURRENCY=1` default | **INFO** | Instância pequena |
| Sem matches `warning/ERROR/Traceback` em query `--text` 7d | **INFO** | Amostra limitada pela retenção/CLI |
| Request logs 4xx/5xx query vazia | **UNKNOWN** | CLI `--type request` não devolveu linhas nesta sessão |

Deploy live amostrado: merge tolls F4/F5 era (2026-09-14).

### Frontend static build

| Warning | Class | P |
|---|---|---|
| `Browserslist: caniuse-lite is 7 months old` | Pode adiar | P3 |
| Chunk JS **2 234 kB** (gzip ~630 kB) > 500 kB | ACTIONABLE manutenção | **P2** |
| `npm audit` echo no build log | INFO | Reflecte dívida FE |

---

## F. Render staging warnings (`tvde-staging-api` / `tvde-staging-app`)

**Service IDs:** `srv-d81kqbgg4nts7386kmi0`, `srv-d81l3nfaqgkc73fe61g0`

| Warning | Só staging? | Class | P |
|---|---|---|---|
| FastAPI `UserWarning: Duplicate Operation ID root__head` / `health_check_health_head` (`health.py` GET+HEAD no mesmo handler) | **Sim** (observado no build/startup staging 2026-09-14) | ACTIONABLE / benigno runtime | **P2** |
| `[TVDE] config ENV=production … BETA_MODE=True` | **Comum com prod** | Config smell: staging **não** usa label `staging` | **P1** (revisão env) |
| Mesmos sinais pip/alembic/WEB_CONCURRENCY | Comum | BENIGN | P3 |
| FE: browserslist + chunk large (~2 154 kB) | Comum | P2 | |

**Implicação:** `settings.is_staging_environment()` é **False** em staging se `ENV=production`. Funções que distinguem staging (ex. `is_stripe_live_deploy` para staging mock) **não** vêem este ambiente como staging. Verificar intencionalidade antes de “corrigir” à cega.

---

## G. Frontend/build warnings

| Warning | Origem | Ambiente | Frequência | Impacto | Acção |
|---|---|---|---|---|---|
| Chunk > 500 kB | Vite build | PROD+STG Render | Cada build | Perf load inicial | Code-split rotas/mapa (**P2**) |
| Browserslist stale | Vite/build | PROD+STG | Cada build | Baixo | `update-browserslist-db` (**P3**) |
| `react-hooks/exhaustive-deps` em `AdminDashboard.tsx:682` | eslint | Local | Contínuo | Risco stale closure | Corrigir deps (**P2**) |
| `tsc -b` limpo | local | — | — | — | OK |
| knip unused Radix/UI | local | — | — | Bundle/deps | Remover após review (**P3**) |

---

## H. Security hygiene

| Finding | Notas | Class | P |
|---|---|---|---|
| `DEFAULT_PASSWORD = "123456"` em Settings | Legacy; `allow_default_password_login` / `is_forbidden_default_password` mitigam prod | LEGACY BUT ACTIVE | **P1** review (garantir flags prod) |
| OTP `print` código | Só se `dev_tools_router_enabled()` — **off em prod** | BENIGN prod | P3 |
| `/debug/*` montado quando `BETA_MODE` em prod | Endpoints sensíveis: JWT + guards; `driver-locations` exige `_require_dev` → 404 prod | LEGACY BUT ACTIVE | **P1** decidir se beta ainda justifica superfície |
| `/config` expõe `google_oauth_client_id` em beta | Intencional para FE OAuth | EXPECTED | — |
| CORS prod: lista explícita + credentials | `main.py` A023 | OK | — |
| Secrets hardcoded reais | Não encontrados no código app (só placeholders testes/`whsec_test`) | OK | — |
| `audits/` e fixtures com passwords demo | Test-only | EXPECTED | P3 não publicar |
| npm **critical** maplibre | Runtime map | Deve corrigir (upgrade) | **P1** |
| Stripe live ainda roadmap | Fora desta auditoria | Do not touch sem gate O-STRIPE-LIVE | — |

**Redacção:** nenhum secret real impresso nesta sessão.

---

## I. Performance / maintenance smells (evidência)

| Smell | Evidência | P |
|---|---|---|
| Bundle monolítico ~2.2 MB | Render FE build log | P2 |
| Polling driver/passenger (3–12 s) | `usePolling`, `DRIVER_REMOTE_AVAILABILITY_POLL_MS=12s`, location hooks | LEGACY BUT ACTIVE — não “bug”; monitorar carga | P2 review |
| Admin sem poll global | Comentário `ADMIN-POLL-1` | Bom padrão | — |
| `ruff` no install prod | Build logs Render | P2 |
| Python **3.14** wheels no build Render | `cp314` nos logs de pip | Risco manutenção runtime jovem | **P2** |
| N+1 / sync-in-async | Não auditado com profiler nesta fase | UNKNOWN | — |

---

## J. Safe cleanup candidates

(Pequenos, baixo risco, após OK humano)

1. Remover `BottomActionStack.tsx` + confirmar e2e não referencia.
2. Remover stubs UI + deps Radix não usadas (`alert-dialog`, `avatar`, `badge`, `card`, `progress`, `tabs`).
3. Remover ou arquivar `scripts/docs-audit-lote*.mjs` e `dia23-static-audit.mjs`.
4. Remover exports OTP client **ou** repor UI OTP (decisão produto) — não remover rotas backend.
5. Adicionar `@types/geojson` / dep `geojson` para knip/tsc limpos.
6. Fix Operation IDs em `health.py` (HEAD/GET).
7. Actualizar browserslist DB.
8. ESLint exhaustive-deps em AdminDashboard.

---

## K. Risky cleanup candidates

| Item | Porquê risco |
|---|---|
| Apagar `TripStatus.queued` / flag B2 | Migração + state machine; trabalho futuro |
| Remover settings DEPRECATED fare/cancellation | `.env` antigos podem crashar Settings se `extra=forbid` no futuro; hoje `extra=ignore` mas knobs documentados |
| Remover `LEGACY_PET_CATEGORY` | Dados históricos `pet` |
| Remover `pi_mock_*` paths | Staging/sim + admin reconciliation |
| Desligar `BETA_MODE` / `/debug` em prod | Pode partir fluxo beta actual |
| Mudar `ENV` staging de `production` → `staging` | Pode alterar CORS, alembic-on-startup, Stripe live rules — **precisa checklist** |
| `npm audit fix --force` | Breaking changes Vite/RR |
| Remover biomes/`backend/node_modules` tooling sem confirmar CI local |

---

## L. Do not touch

- Migrations Alembic já aplicadas (nunca “apagar” versões em prod).
- Stripe live / keys / webhook sem gate explícito.
- HERE tolls (acabou de fechar F4/F5) — sem refactor oportunista.
- `CRON_SECRET` / JWT / OTP secrets.
- Landing `site/` conteúdo legal até dados comerciais confirmados noutro thread.
- Roadmap oficial priorities (não reordenar automaticamente).

---

## M. Recommended cleanup roadmap

### Já (sem cleanup de código — só decisões)

1. Confirmar se **staging deve** ter `ENV=production` ou `ENV=staging` / `ENVIRONMENT=staging`.
2. Confirmar se **BETA_MODE=True em prod** continua desejado (implica `/debug` montado + limites beta).
3. Agendar PR segurança FE: **maplibre** + **react-router** (P1).

### Sprint higiene (P2)

1. Fix FastAPI duplicate operation IDs (health HEAD).
2. Code-split FE (mapa / admin / partner lazy).
3. Mover `ruff` para fora do requirements de runtime Render.
4. Re-correr `pip-audit` com rede OK; pin pygments/pytest se CVEs confirmadas.
5. Remover stubs Radix + BottomActionStack (PR separado).
6. Decidir destino OTP UI vs API-only.

### Housekeeping (P3)

1. Arquivar scripts docs-audit / uber convert / debug map.
2. Limpar `@deprecated` exports após greps nos testes.
3. Actualizar pasta `audits/` ou apagar snapshots obsoletos.
4. Avaliar remoção `@biomejs/biome` se ruff é canónico.

---

## Warnings conhecidos vs reais (tabela unificada)

| Warning | Origem | Ambiente | Frequência | Impacto | Acção |
|---|---|---|---|---|---|
| Duplicate Operation ID health HEAD | FastAPI | Staging (visto) | Deploy/startup | OpenAPI noise | **Deve corrigir** (P2) |
| Chunk > 500 kB | Vite | PROD+STG | Cada build | Perf | **Deve corrigir** (P2) |
| Browserslist stale | Build | PROD+STG | Cada build | Baixo | Pode adiar (P3) |
| npm audit criticals | npm | Local+build | Contínuo | Security | **Deve corrigir** runtime (P1); tooling pode adiar |
| ENV=production em staging | Config Render | Staging | Startup | Lógica env errada | **Deve rever** (P1) |
| BETA_MODE=True prod | Config | PROD | Startup | Superfície debug/beta | Rever política (P1) |
| pip new version notice | Build | Ambos | Deploy | Nenhum | Ignorar |
| Alembic transactional DDL | Startup | Ambos | Deploy | Nenhum | Ignorar |
| Vulture unused routes | Local tool | — | — | Falso positivo | Ignorar |
| ESLint exhaustive-deps Admin | Local | — | Contínuo | Possível bug UI | Deve corrigir (P2) |

### Deve corrigir
- MapLibre / React Router vulns (P1)
- Revisão ENV staging vs `is_staging_environment` (P1)
- Política BETA_MODE + `/debug` em prod (P1)
- Health Operation IDs (P2)
- Bundle splitting (P2)
- ESLint Admin deps (P2)

### Pode adiar
- Browserslist
- Vitest/Playwright/Vite audit (dev)
- Remoção stubs UI
- Deprecated settings knobs
- ruff em requirements

### Ignorar
- Vulture em routers FastAPI
- Notices pip no build
- Alembic “transactional DDL”
- OTP print (já gated)

---

## Apêndice — comandos úteis (reexecução)

```text
git checkout audit/repo-runtime-hygiene-sep2026
# Backend
cd backend && ruff check app
# FE
cd web-app && npm run lint && npx tsc -b && npm audit && npx knip --no-exit-code
# Render (read-only)
render services --output json
render logs -r srv-d6hj2g3uibrs73a036o0 --limit 100 --output text
render logs -r srv-d81kqbgg4nts7386kmi0 --text warning,WARN --limit 100 --output text
```

---

*Fim do relatório. Nenhum cleanup iniciado nesta sessão.*
