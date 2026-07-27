# Availability — Active trip guard (Caso B) — Smoke PASS (2026-07-27)

**Estado:** **PASS** — Caso B (viagem activa)  
**`main` / app build:** `ea4678a`  
**Caso A (sync sem viagem):** **PASS** — [`AVAILABILITY_FORCE_ONLINE_SYNC_SMOKE_PASS_2026-07-26.md`](./AVAILABILITY_FORCE_ONLINE_SYNC_SMOKE_PASS_2026-07-26.md)  
**Handoff:** [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md)

---

## 1. Contexto

Availability Guard actual = **Caso A + Caso B**:

| Caso | Regra | Estado |
|------|--------|--------|
| **A** | Partner force-online/offline reflecte na Driver app aberta (sem refresh) | PASS (2026-07-26) |
| **B** | Com trip activa `accepted` / `arriving` / `ongoing`, Partner force-online **não** reabre disponibilidade | **PASS** (esta sessão) |

Código de suporte já em `main` (≥ `ea4678a`): locks / UX Partner / sync Driver (#469–#477). Este smoke **não** alterou código, env, DB nem migrations.

**Nota explícita:** *Next-trip while ongoing / ETA ≤ 5 min* é **feature futura (B2)** e **não** faz parte desta regra actual. O modelo actual não admite intencionalmente duas trips activas por driver; o smoke valida só o guard de segurança vigente.

---

## 2. Regra actual validada

Com motorista em viagem activa (`accepted` | `arriving` | `ongoing`):

- Partner «Colocar online» / `PATCH …/availability` com `online=true` → **409** `driver_has_active_trip`
- UI Partner: erro amigável; Estado actual permanece **Offline**
- Driver **não** volta a «À espera de viagens»; permanece no fluxo da viagem
- Matching: `is_available=false`; sem novas ofertas (`available_count=0`)

---

## 3. Scope

| Incluído | Excluído |
|----------|----------|
| Caso B — force-online **com** trip activa | Next-trip while ongoing / ETA ≤ 5 min |
| UI Partner erro + chip Offline | Alterações de código |
| Driver no fluxo da viagem activa | Env / DB / migrations / workflows |
| Cleanup cancel passenger | Activar PF3D gates |

---

## 4. Passos executados

1. Driver `+351911111111` online → «À espera de viagens» (GPS Oeiras fresco)  
2. Passenger criou pedido de viagem (origem perto do driver)  
3. Driver aceitou oferta → status `accepted`  
4. Confirmar UI Driver: «A caminho do passageiro»; Iniciar / Cancelar; **não** «À espera de viagens»  
5. Partner (`test_partner`) → Frota → detalhe `test_driver`  
6. Estado actual: **Offline** → clicar «Colocar online»  
7. Observar erro UI + resposta API; confirmar Driver e disponibilidade  
8. Cleanup: passenger cancela viagem → `is_available=true`, active=null  

---

## 5. Evidência observada

### 5.1 Estado inicial

| Superfície | Observado |
|------------|-----------|
| Driver | `+351911111111` online · «À espera de viagens» · GPS Oeiras fresco |

### 5.2 Viagem activa

| Superfície | Observado |
|------------|-----------|
| Trip | `accepted` (UI: «A caminho do passageiro») |
| Driver | Iniciar / Cancelar · **fora** de «À espera de viagens» |
| Disponibilidade | `is_available=false` |

### 5.3 Partner «Colocar online»

| Superfície | Observado |
|------------|-----------|
| Partner Detail | Estado actual: **Offline** · botão «Colocar online» |
| UI após clique | **«Não é possível colocar online: motorista tem uma viagem activa.»** |
| API | **409** `driver_has_active_trip` |
| Chip / estado | Permanece **Offline** (não passa a Online) |

### 5.4 Depois do clique

| Superfície | Observado |
|------------|-----------|
| Driver | Continua no fluxo da viagem activa |
| Ofertas | `available_count=0` |

### 5.5 Cleanup

| Superfície | Observado |
|------------|-----------|
| Trip | `cancelled` (passenger) |
| Driver | `is_available=true` · active trip `null` |

---

## 6. Critérios PASS / FAIL / BLOCKED

| Critério | Resultado |
|----------|-----------|
| Com trip activa, force-online **não** torna o motorista disponível | **PASS** |
| UI erro amigável **ou** 409 `driver_has_active_trip` | **PASS** (ambos) |
| Partner não passa a Online | **PASS** |
| Driver não volta a «À espera de viagens» | **PASS** |
| Sem novas ofertas durante a trip | **PASS** |
| FAIL: Partner consegue pôr disponível durante trip | **não** observado |
| BLOCKED: sem detalhe Partner / sem botão / trip não chega a activa | **não** aplicável |

---

## 7. Conclusão

**Smoke Caso B = PASS.**

Availability Guard actual = **PASS**:

- Caso A sync PASS + Caso B active trip guard PASS.  
- Next-trip ongoing / ETA fica como feature futura **B2** (spike de modelo 2 trips / queued / locks / UI **antes** de implementar).

---

## 8. Fora de scope / próximos passos produto

- Desenhar **B2** «next trip while ongoing ETA ≤ 5 min» (decisão produto)  
- Spike técnico: suporte a 2 trips (ongoing + accepted futura), locks, UI Driver/Partner  
- PF3D gates ON só após atribuição real + docs reais  
- Sem implementação nesta documentação  

---

*Docs-only. Sem código · testes · env · DB · migrations · workflows · PF3D ON.*
