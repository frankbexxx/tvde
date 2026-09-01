# DEMO MANEL 2 — guião final (Setembro 2026)

**Estado:** **DEMO PASS** · **ETAPA 02 DONE** · **`S-DEM-01` DONE** (execução produção 2026-09-01)  
**Confrontado com código:** 2026-09-01 (`main` tip pós-retoma)  
**Base contas/URLs:** [`DEMO_4_PAPEIS.md`](DEMO_4_PAPEIS.md) — **só telefones; nunca passwords neste ficheiro**  
**Duração alvo:** ~15–20 min (+ extras se sobrar)  
**ETAPA:** 02 · `S-DEM-01`

| | |
|--|--|
| **App** | `https://tvde-app-j51f.onrender.com` |
| **API health** | `https://tvde-api-fd2z.onrender.com/health` |
| **Papéis** | Passenger · Driver · Partner · Admin/SA |

---

## 1. Smoke pré-demo

Executar **antes** da chamada. Marcar resultado.

| # | Check | Resultado |
|---|--------|-----------|
| S01 | API `GET /health` → `status: ok` (aguardar cold start se preciso) | ☐ PASS / FAIL |
| S02 | App prod abre (HTTP 200) | ☐ PASS / FAIL |
| S03 | `/health?diagnostic=1` → `dev_tools: false` | ☐ PASS / FAIL |
| S04 | Login Passenger demo (`+351912345678`) | ☐ PASS / FAIL |
| S05 | Login Driver demo (`+351911111111`) → **Disponível** + GPS permitido | ☐ PASS / FAIL |
| S06 | Login Partner (`+351955555502`, password própria) | ☐ PASS / FAIL |
| S07 | Login Admin/SA Frank (`+351924075365`, password real) | ☐ PASS / FAIL |
| S08 | Partner/Admin + password **demo** → login **recusado** (esperado) | ☐ PASS / FAIL |
| S09 | Driver GPS perto do pickup da demo (~zona habitual) | ☐ PASS / FAIL |
| S10 | Ensaio rápido: pedido → oferta → Aceitar (pode cancelar a seguir) **ou** confiança no smoke 2026-07-30 | ☐ PASS / FAIL |
| S11 | Partner Home / Frota / Viagens carregam sem erro bloqueante | ☐ PASS / FAIL |
| S12 | Admin Agora · Viagens · Saúde (leitura) carregam | ☐ PASS / FAIL |
| S13 | Render: `STRIPE_MOCK` = **true** (piloto) — dashboard | ☐ PASS / FAIL |
| S14 | Cron/jobs activos | **NÃO NECESSÁRIO** (fluxo demo não depende do cron) |
| S15 | Stripe live / webhook live | **NÃO NECESSÁRIO** |
| S16 | B2 / PF3D / confirm-on-accept | **NÃO NECESSÁRIO** (devem estar OFF; não testar ON) |

**Critério para avançar:** S01–S07 + S09 **PASS**. S08 recomendado. S10–S13 recomendados; se S10 falhar, usar Plano B.

---

## 2. Guião passo a passo

Usar **4 janelas/perfis**. Ordem fixa.

### PASSO 01 — Acordar produção

* **Quem:** operador  
* **Acção:** abrir health API; se falhar, esperar 30–60 s e repetir  
* **Esperado:** `{"status":"ok"}`

### PASSO 02 — Abrir 4 sessões

* **Quem:** operador  
* **Acção:** login Pax · Driver · Partner · Admin (telefones em `DEMO_4_PAPEIS.md`)  
* **Esperado:** os 4 entram; Partner/Admin **não** usam password demo

### PASSO 03 — Driver disponível

* **Quem:** Driver  
* **Acção:** permitir GPS; pôr **Disponível** (não Offline)  
* **Esperado:** estado Disponível; posição a actualizar

### PASSO 04 — Pedir viagem

* **Quem:** Passenger  
* **Acção:** origem → destino válidos → **Pedir viagem**  
* **Esperado:** UI «À procura de motorista» (API `requested`)

### PASSO 05 — Aceitar oferta

* **Quem:** Driver  
* **Acção:** ver oferta → **Deslizar para aceitar** (não confundir com Silenciar)  
* **Esperado:** viagem `accepted`; oferta some; Pax deixa de procurar

### PASSO 06 — Chegada ao pickup

* **Quem:** Driver  
* **Acção:** aproximar-se do pickup (GPS real ou posição perto). Se aparecer **Cheguei** (longe), confirmar; quando ≤ ~70 m, usar **Iniciar viagem**  
* **Esperado:** botão **Iniciar viagem** activo perto do pickup

### PASSO 07 — Iniciar viagem

* **Quem:** Driver  
* **Acção:** **Iniciar viagem**  
* **Esperado:** `ongoing` / a decorrer

### PASSO 08 — Pax acompanha

* **Quem:** Passenger  
* **Acção:** mostrar mapa / estado  
* **Esperado:** coerente com Driver (sem ecrã preso)

### PASSO 09 — Terminar viagem

* **Quem:** Driver  
* **Acção:** **Terminar viagem**  
* **Esperado:** `completed`; pagamento mock settle (piloto) — **não** falar em Stripe real

### PASSO 10 — Rating (se aparecer)

* **Quem:** Passenger  
* **Acção:** avaliar **ou** «Agora não»  
* **Esperado:** fecha limpo; histórico OK

### PASSO 11 — Partner

* **Quem:** Partner  
* **Acção:** Home (resumo) → Frota → Viagens; mencionar viagem recente se visível  
* **Esperado:** listas/KPIs sem erro bloqueante

### PASSO 12 — Admin (só leitura)

* **Quem:** Admin/SA  
* **Acção:** Agora → Viagens (localizar trip se fácil) → Saúde  
* **Esperado:** carrega; refresh manual OK  
* **Proibido neste passo:** assign, demote, delete, force, Operações destrutivas

---

## 3. Extras (só se sobrar tempo)

Ordem: **A → B → C**.

| Extra | Quem | Acção | Esperado / frase |
|-------|------|--------|------------------|
| **A Recusar** | Driver | 2.º pedido → **Recusar** (≠ **Silenciar**) | Pax continua a procurar; oferta rejeitada no servidor |
| **B Mapa Partner** | Partner | Menu Frota → **Mapa live** | *«Visão operacional em evolução — não é tracking perfeito.»* |
| **C Refresh Pax** | Passenger | F5 a meio da viagem activa | Estado recupera; se estranho, não insistir |

---

## 4. Frases se perguntarem

| Tema | Dizer |
|------|--------|
| Pagamento | *«Nesta fase é mock. Stripe live / payouts não estão nesta demo.»* |
| Next-trip (B2) | *«Decidido em produto; ainda OFF — fora desta sessão.»* |
| Docs viatura (PF3D) | *«Gates de documentos OFF.»* |
| Admin | *«Ferramenta de excepção e leitura. Matching do dia = Partner + apps.»* |

---

## 5. Se algo falhar durante a demo

| Problema | Fallback (humano, curto) |
|----------|---------------------------|
| **Cold start Render** | Esperar health OK; repetir último passo |
| **Geolocalização / Iniciar** | Re-permitir GPS; aproximar Driver do pickup (~70 m); se só vê **Cheguei**, confirmar e aproximar |
| **Matching / sem oferta** | Driver **Disponível**? GPS fresco? Refresh Driver; Pax cancela e novo pedido; oferta expira ~60 s |
| **Pagamento mock** | Não abrir Stripe; viagem `completed` basta; se Saúde mostrar anomalia, não diagnosticar em voz alta |
| **Refresh / sessão** | F5 na janela afectada; re-login só se necessário; não misturar papéis no mesmo perfil |
| **Viagem irrecuperável** | Parar fluxo viagem; mostrar Partner (frota/viagens) + Admin Agora; anotar para re-smoke |

Admin recovery / force: **só** se já ensaiado — não improvisar.

---

## 6. Pontos a **não** demonstrar

| Evitar | Motivo |
|--------|--------|
| Stripe live / Connect / payouts | Mock em piloto; live incompleto |
| B2 next-trip while ongoing | Flag `ENABLE_NEXT_TRIP_CHAINING` OFF |
| Confirm payment on accept / 3DS | `ENABLE_CONFIRM_ON_ACCEPT` OFF |
| PF3D / bloqueio por docs viatura | `ENABLE_VEHICLE_COMPLIANCE_GATES` OFF |
| Admin como dispatcher diário (assign) | Papel de excepção; risco |
| Demote / delete driver com histórico | Integridade; fora do guião |
| Partner/Admin com password demo | Deve falhar; não “provar” em ecrã partilhado |
| Passwords no ecrã partilhado | Segurança |
| Onboarding RGPD / users comerciais novos | Não validado para esta sessão |
| Docker / backend local como path da demo | Demo = produção |
| Zonas Driver «Cheguei à zona» como fluxo principal | Outro produto; confunde com **Cheguei** do pickup |
| Operações Admin destrutivas / reconcile apply | Só leitura Saúde |

---

## 7. Checklist pós-demo

| # | Item | OK? |
|---|------|-----|
| 1 | Viagem completa (ou Plano B documentado) | ☐ |
| 2 | Partner sem erro bloqueante | ☐ |
| 3 | Admin leitura OK (sem dispatcher) | ☐ |
| 4 | Extras A/B/C feitos ou skip anotados | ☐ |
| 5 | Feedback Manel (3 bullets) | ☐ |
| 6 | Nada prometido: B2 ON · Stripe live · PF3D ON | ☐ |

---

## 8. Notas de alinhamento código (2026-09-01)

| Guião antigo | Código actual |
|--------------|---------------|
| «Aceitar» genérico | Oferta: **Deslizar para aceitar** |
| Pickup → Iniciar directo | Longe: **Cheguei**; perto (~70 m): **Iniciar viagem** |
| Searching | UI; API = `requested` |
| Contas / URLs | Sem mudança vs `DEMO_4_PAPEIS.md` |

**Referência smoke histórico:** DEMO_4_PAPEIS PASS 2026-07-30 · Manel 1 completa 2026-08.

---

## 9. Resultado final

| Campo | Valor |
|-------|--------|
| **DEMO** | **PASS** |
| **ETAPA 02** | **DONE** |
| **S-DEM-01** | **DONE** |
| Ambiente | produção |
| Quatro papéis | Passenger · Driver · Partner/Frota · Admin/SA — **PASS** |
| Fluxo principal | pedido → matching/oferta → aceitar → iniciar → acompanhar → concluir → rating/fecho → visível Partner + Admin — **PASS** |
| Novos bloqueadores | **0** |
| Novas decisões de produto | **0** |

### Nota

A sessão teve como objectivo validar o estado funcional actual da plataforma. As decisões de produto, negócio, pagamentos, compliance, mobile e restantes temas continuam a ser governadas pelos documentos e TODOs já existentes ou serão tomadas em etapas futuras.
