# Demo 4 papéis — runbook operacional (prod)

Documento curto para **apresentar / validar** Passenger · Driver · Partner · Admin/SA em produção.

**Não contém passwords nem secrets.** Passwords: gestor local / memória — não colar no chat nem neste ficheiro.

**Handoff:** [`PROXIMA_SESSAO.md`](../meta/PROXIMA_SESSAO.md) · painel [`TODOdoDIA.md`](../../TODOdoDIA.md) · review [`PR_REVIEW_CHECKLIST.md`](../meta/PR_REVIEW_CHECKLIST.md)

**Checkpoint histórico (local Dev):** [`D_DEMO_1_CHECKPOINT_2026-07-16.md`](D_DEMO_1_CHECKPOINT_2026-07-16.md)

---

## 1. Pré-condições

| Item | Valor / regra |
|------|----------------|
| **App** | `https://tvde-app-j51f.onrender.com` |
| **API / health** | `https://tvde-api-fd2z.onrender.com/health` → `status: ok` |
| **Navegador** | Preferir **4 janelas / perfis / incógnito** (1 por papel) — evita misturar sessões |
| **GPS** | Driver: permitir localização; ideal perto do pickup da demo (Lisboa / zona de teste habitual) |
| **PF3D gates** | **OFF** — não esperar bloqueios por docs de viatura |
| **B2 next-trip** | **Fora de âmbito** — não demonstrar |
| **Rede** | Render pode “acordar” (~30–60 s) no 1.º pedido — esperar health OK |

### Contas por papel (só telefone — sem passwords)

| Papel | Telefone | Notas |
|-------|----------|--------|
| **Passenger** (demo) | `+351912345678` | Password = demo partilhada (`TEST_ACCOUNT_PASSWORD`) |
| **Driver** (demo) | `+351911111111` | Password = demo partilhada |
| **Partner** (baseline) | `+351955555502` | Password **própria** — **não** demo |
| **Admin / SA** | `+351924075365` (Frank) | Password **real** — **não** demo |
| Admin baseline *(opcional)* | `+351900000000` | Password própria; não necessário na demo principal |

**Não usar:** admin/partner + password demo (deve falhar).

---

## 2. Sequência demo (curta)

Ordem sugerida: **abrir os 4 logins** → fluxo viagem Pax+Driver → Partner → Admin.

### A. Abrir sessões

1. Health API OK.
2. Janela 1 — login **Passenger**.
3. Janela 2 — login **Driver** → online / disponível (não offline).
4. Janela 3 — login **Partner** (password própria).
5. Janela 4 — login **Admin/SA** (password real).

### B. Viagem (Passenger + Driver)

| Passo | Actor | Acção | Esperado |
|-------|-------|--------|----------|
| B1 | Passenger | Pedir viagem (origem → destino válidos) | Trip criada / searching |
| B2 | Driver | Ver oferta no mapa / lista | Oferta visível |
| B3 | Driver | Aceitar | Status `accepted` |
| B4 | Driver | Ir ao pickup (GPS / perto) | Botão «Iniciar viagem» quando perto |
| B5 | Driver | Iniciar viagem | `ongoing` |
| B6 | Passenger | Acompanhar no mapa / estado | Coerente com Driver |
| B7 | Driver | Terminar viagem | `completed` |
| B8 | Passenger | Rating (se pedido) | Aceite / histórico OK |

**Nav:** preferência Maps/Waze = manual (Opção B) — **não** exigir auto-open ao iniciar.

### C. Partner / Frota

| Passo | Acção | Esperado |
|-------|--------|----------|
| C1 | Home / KPIs / Frota | Carrega sem erro fatal |
| C2 | Lista motoristas / estado frota | Driver demo visível ou estado coerente |
| C3 | Viagens / histórico recente | Viagem da demo aparece ou lista saudável |
| C4 | **Não** insistir em docs P0 / gates ON | Gates OFF |

### D. Admin / SA

| Passo | Acção | Esperado |
|-------|--------|----------|
| D1 | Agora / dashboard | Carrega; refresh manual OK |
| D2 | Viagens — localizar trip da demo | Visível (activas ou histórico) |
| D3 | Saúde / ops (leitura) | Sem crash; anomalias opcionais |
| D4 | **Não** demote/delete driver com histórico | Integrity #499 |
| D5 | Contrato URL | `?tab=` · sem `?group=` |

---

## 3. Checklist PASS / FAIL

| ID | Item | PASS se… |
|----|------|----------|
| **D4-1** | Health API | `status: ok` |
| **D4-2** | Login Passenger demo | Entra |
| **D4-3** | Login Driver demo | Entra + online |
| **D4-4** | Login Partner própria | Entra |
| **D4-5** | Login Frank/SA | Entra |
| **D4-6** | Partner/Admin + demo | **FAIL** login (esperado) |
| **D4-7** | Pedido → accept → start → complete | Fluxo completo |
| **D4-8** | Passenger vê estados coerentes | Sem ecrã preso |
| **D4-9** | Partner vê frota/viagens base | Sem erro bloqueante |
| **D4-10** | Admin vê trip / saúde | Sem crash |

Marcar mentalmente ou numa nota local: **PASS** / **FAIL** / **SKIP**.

---

## 4. Sinais de perigo

| Sinal | Acção |
|-------|--------|
| Login privilegiado com **demo** passa | Parar demo; regressão auth — não continuar |
| Frank não entra com password real | Parar; não resetar via backfill |
| Driver nunca vê oferta | Ver fallback §6 |
| «Iniciar viagem» nunca aparece | GPS longe / gate proximidade — aproximar ou re-permitir localização |
| Partner/Admin ecrã em branco / erro permanente | Refresh; health; não mexer em env |
| Pedido de password/hash no chat ou ecrã partilhado | Não partilhar; cortar partilha de ecrã se preciso |

---

## 5. O que **NÃO** demonstrar ainda

- **B2** next-trip while ongoing (espera Manel)
- **PF3D gates ON** / bloqueio por documentos
- **Stripe live** / payouts / faturação real
- Onboarding RGPD / users comerciais novos
- Admin como **dispatcher** diário (assign = recovery SA; diário = Partner/matching)
- Demote/delete de drivers com trips
- Backfill / scripts Shell em live na frente da audiência

---

## 6. Fallback se matching falhar

1. Confirmar **Driver online** (não offline / não em viagem fantasma).
2. Confirmar **localização** Driver (GPS on; coords perto da zona do pedido).
3. **Refresh** Driver (F5) + voltar a «à espera»; Passenger cancelar e **novo pedido** se oferta expirou.
4. Health API + cold start Render — esperar e repetir B1.
5. Partner: ver se motorista aparece **indisponível** / desactivado.
6. Admin (só se necessário): leitura da trip / ops — **não** improvisar assign em demo salvo plano prévio e papel SA.
7. Se continuar a falhar: **encerrar fluxo viagem**; mostrar Partner home + Admin Agora como superfície estável; agendar re-smoke offline.

---

## 7. Duração alvo

| Bloco | Tempo |
|-------|--------|
| Logins 4 papéis | ~3–5 min |
| Viagem completa | ~5–10 min |
| Partner + Admin | ~3–5 min |
| **Total** | **~15–20 min** |

---

## 8. Resultado smoke humano (prod) — **PASS** 2026-07-30

| Área | Resultado |
|------|-----------|
| Health | **OK** |
| Logins Pax / Driver+online / Partner / Admin-SA | **OK** |
| Viagem completa (pedir → accept → start → ongoing → complete → rating) | **OK** |
| Partner Home/KPIs · lista/estado frota · viagens | **OK** |
| Admin Agora · Viagens · Saúde/ops leitura | **OK** |
| **BUG-DEMO-1** | **Corrigido** #513 (`49509e2`) — detalhe acima do menu Sheet; `data-testid=driver-history-trip-detail` |

Painel vivo: `O-DEMO-4ROLES` / `S-DEMO-4` = **Concluído** · `BUG-DEMO-1` = **Concluído** em [`TODOdoDIA.md`](../../TODOdoDIA.md).

---

## 9. DEMO MANEL 1 — **COMPLETA** (2026-08)

| Item | Estado |
|------|--------|
| Formato | Testes reais em carro / telefone |
| Cobertura | Não cobriu tudo · sem prints |
| Resultado | O que deveria funcionar, **funcionou** → considerar **completa** |
| **DEMO MANEL 2** | Agendada para **Setembro** (alargada) |
| Runbook base | Este documento + painel em [`TODOdoDIA.md`](../../TODOdoDIA.md) |

---

**Fim.**
