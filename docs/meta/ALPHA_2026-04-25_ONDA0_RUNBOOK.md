# Onda 0 — Runbook operacional (2026-04-20)

> Execução dos 5 sub-passos da Onda 0 do plano Alpha 2026-04-25. Ver [`ALPHA_2026-04-25.md §7.1`](ALPHA_2026-04-25.md) para contexto.
>
> **Não é código.** Só BD prod (SQL guiado), Render env, smoke UI, contas, convocatória WhatsApp.
>
> **Como usar:** percorrer os passos A → E por ordem. Colar outputs/confirmações em cada secção à medida que avanças. No fim, commit + PR com o runbook preenchido como registo de operação.
>
> **Regra sagrada:** qualquer `UPDATE` / `DELETE` em prod é executado só **depois** de ter o `SELECT` correspondente visto e validado.

---

## Checklist rápido (marca à medida que fechas)

- [ ] **A.** Convocatória WhatsApp redigida e guardada.
- [x] **B.** `BETA_MODE=True` confirmado na env do Render (prod backend).
- [x] **C.** OPS-BD-PI: cleanup profundo em prod (ver «Registo de execução 2026-04-20» abaixo).
- [x] **D.** OPS-SMOKE-132: smoke do botão «Alinhar pagamento (Stripe)» feito no ciclo de Bloco 1.
- [ ] **E.** 4 principais (1P + 1D + 2 admin) + 2 reserva (P2 / D2) criados em prod; spot-check login dos 4 principais.
- [x] **F.** Bloco 2 — fix de código para PI inexistente em Stripe (ver «Bloco 2» abaixo).

---

## Registo de execução 2026-04-20 (Bloco 1 — Cleanup prod)

**Ambiente:** Render prod (`ride_db_wypz`), executado via Render Shell (API service) com `psycopg2` + `os.environ["DATABASE_URL"]`. Plano Render subido para Starter (API + DB) para desbloquear shell e backups.

**Estado antes:**

- Trips: 301 (155 completed / 138 cancelled / 7 failed / 1 accepted)
- Payments: 202 (117 succeeded / 82 processing / 3 failed)
- Cruzamento: 38× `completed+processing`, 36× `cancelled+processing`, 7× `failed+processing`, 1× `accepted+processing`
- Por prefixo PI: 41 `mock+processing`, 31 `real+processing`, 10 `test+processing`, 117 `real+succeeded`, 3 `real+failed`

**Operações (em Render Shell, scripts `python - <<'EOF'` curtos):**

1. `CREATE TABLE _keep AS …` — 11 IDs preservados:
   - 5× `completed + payment succeeded` (mais recentes)
   - 3× `cancelled` (mais recentes)
   - 2× `failed` (mais recentes)
   - 1× `accepted` (único legítimo com `processing`)
2. `DELETE FROM trips WHERE id NOT IN (SELECT id FROM _keep)` → **290 trips apagadas** (cascade apaga `payments` + `trip_offers` via FK `ON DELETE CASCADE`).
3. `DELETE FROM audit_events WHERE entity_type='trip' AND entity_id NOT IN …` → **935 audit órfãos apagados**.
4. `DELETE FROM interaction_logs WHERE trip_id IS NOT NULL AND trip_id NOT IN …` → **877 ilogs órfãos apagados**.
5. Correcção adicional: 5 pagamentos em estado inconsistente (`cancelled|failed + processing`) actualizados para `failed`.

**Estado depois:**

- Trips: **11** (5 completed, 3 cancelled, 2 failed, 1 accepted)
- Payments: **11** (cruzamento: 5 completed+succeeded, 3 cancelled+processing, 2 failed+processing, 1 accepted+processing → 3+2 depois corrigidos → final 5 succeeded, 5 failed, 1 processing)
- Trip offers: 9
- Admin Health: `stuck payments=1`, `accepted too long=1` (ambos o `accepted` legítimo, fica como fixture para próximos smokes), `inconsistent financial state=0`

**Notas:**

- Tabela `_keep` dropada no fim, sem resíduos.
- `payments.trip_id` e `trip_offers.trip_id` têm `ON DELETE CASCADE`; `interaction_logs.trip_id` e `audit_events.entity_id` são soft-refs (sem FK) e precisaram de `DELETE` explícito.
- `trips.passenger_id` é `ondelete=RESTRICT` e `trips.driver_id` é `ondelete=SET NULL` — nenhum user/driver afectado.
- Método preferido a partir daqui: usar o **fix de código do Bloco 2** (botão «Alinhar pagamento (Stripe)» no Admin) em vez de SQL manual para novos casos.

---

## Bloco 2 — Code fix SP-F (PI inexistente no Stripe)

**Problema fechado:** `backend/app/services/admin_payment_reconciliation.py :: reconcile_stripe_for_completed_processing` invocava `stripe.PaymentIntent.retrieve(pi_id)` e, quando o PI não existia (`pi_mock_…`, `pi_test_…` antigos, PI de outro account), o Stripe devolvia `InvalidRequestError: No such payment_intent` com `code='resource_missing'`. O bloco `except Exception` registava item com `action="error"` mas **não mudava DB**, deixando pares `completed+processing` inconsistentes a acumular.

**Solução minimalista (este commit):**

- Novo helper privado `_is_pi_not_found_error(exc)` que detecta `resource_missing` via classe + código + mensagem (defensivo contra variações do SDK).
- No `except` de `retrieve_payment_intent`, se for «PI not found»:
  - `payment.status = failed`
  - `trip.status = failed`
  - Audit event `reconcile_payment_stripe_no_such_pi` com `reason=pi_not_found_in_stripe`
  - Item devolvido com `action="updated_no_such_pi"` (ou `dry_run_no_such_pi`)
- Outros erros (network, autenticação, etc.) mantêm o comportamento anterior (`action="error"`, sem mutação).

**Scope fora deste commit (por design):**

- UI do admin não muda — continua com os 2 botões «Stripe sync (aplicar)» e «Fechar sem PI (aplicar)». O primeiro passa agora a cobrir também `pi_mock/pi_test` inválidos.
- Não foi estendido para `cancelled+processing` ou `failed+processing` — para esses casos usar a reconciliação por viagem individual (`/admin/trips/{id}/reconcile-payment-stripe`), que já suportava `cancelled/failed` como estados terminais.

**Testes adicionados:**

- `test_stripe_sync_marks_failed_when_pi_not_found_in_stripe` — dry_run=False → payment+trip → failed.
- `test_stripe_sync_dry_run_pi_not_found_reports_without_mutation` — dry_run=True → item reportado, DB inalterada.
- Pytest local: 8/8 passed (`test_admin_payment_reconciliation.py`), ruff clean.

---

## Passo A — Convocatória WhatsApp (draft pronto para colar)

Texto-base em PT-PT, curto, factual. Ajusta horário, ponto de encontro e link Render conforme precisares.

```
Olá! Sábado 25/04 vamos fazer uma ronda de teste real da app TVDE em
Oeiras/Cascais. Preciso de cerca de 5 passageiros (pode ser ida e
volta, trajectos curtos).

• Dia: sábado 25/04
• Horário: 10h00 – 12h00 (2 horas de janela)
• Zona: Oeiras ↔ Cascais
• O que precisas: Android com internet móvel e bateria decente
• Sem pagamentos — é alpha controlada, tudo em modo teste
• Link + credenciais envio no grupo ~10 min antes
• Ponto de encontro inicial: [Largo Marquês de Pombal, Oeiras]
• Reportes de bugs por este grupo (escrito) ou chamada para mim

Conto contigo? Responde «dentro» ou «fora». Obrigado 🙏
```

**Variações curtas:**

- Para motorista: trocar "passageiros" por "motorista com carro próprio" e acrescentar "Waze no telefone, tarifa simulada".
- Para admin observador (parceiro, se fizer sentido): "Sábado 25/04, 10h–12h, fazemos ronda alpha em Oeiras/Cascais. Se puderes ficar online como observador no admin, agradeço."

**Acção:**

1. Copiar o texto acima.
2. Adaptar placeholders entre `[...]`.
3. Enviar aos contactos na segunda ou terça (margem para recusas).
4. Criar grupo WhatsApp `Alpha TVDE 25/04` com os que confirmarem.

### A.X — Estado

- [x] Template final aprovado (2026-04-21) — corpo acima.
- [x] **Revisão 2026-04-22:** texto pronto para envio; só falta decisão final sobre ponto de encontro exacto. Placeholders que ainda **podem** precisar de ajuste:
  - `[Largo Marquês de Pombal, Oeiras]` — confirmar sexta de manhã (proximidade do ponto de partida dos motoristas); alternativa: `[Estação de Oeiras (saída principal)]` (mais genérico, sem erro de busca).
  - Horário `10h00 – 12h00` — manter (conservador, já dá janela de 2h que cobre 3-4 viagens por tester com folga).
  - "Link + credenciais envio no grupo ~10 min antes" — manter (a execução do script §E.2 só acontece sexta de manhã, credenciais só são conhecidas nesse momento).
- [x] **Sequência sexta/sábado manhã:** §E.2 em Render Shell → receber 6 outputs `[NEW]` (4 principais + 2 reserva) → registar credenciais num ficheiro local (não comitado) → gerar PDFs dos handouts bilingue a partir de `docs/_local/pilot_handouts/` → enviar por WhatsApp a P1, D1 e Admin2 (parceiro).
- [ ] Contactos convidados (nº): `___`
- [ ] Confirmados "dentro": `___` / 5
- [ ] Grupo criado: sim / não

---

## Passo B — `BETA_MODE=True` no Render (prod backend)

**Porquê importa:** com `BETA_MODE=True`, o backend:

- Cria perfil de motorista automaticamente se um user com token driver ainda não o tem (`backend/app/services/driver_location.py:37`).
- Relaxa a autorização de `get_driver_location_for_trip` para permitir o mesmo user ver como passageiro e como motorista em multi-dispositivo (`driver_location.py:310+`).
- Faz **auto-dispatch de fallback** quando `multi-offer` criou 0 ofertas (atribui a viagem `requested` mais antiga ao próximo motorista que reporta localização) — `driver_location.py:160+`.
- Monta `/debug/*` em prod (`config.py:113`).

Tudo isto é o que queremos num alpha controlado.

**Como confirmar:**

1. Abrir <https://render.com/> → conta → serviço backend TVDE (o que serve a API prod).
2. Menu lateral → **Environment**.
3. Procurar variável `BETA_MODE`:
   - Se **não existe:** botão **Add Environment Variable** → Key `BETA_MODE`, Value `true`. Guardar.
   - Se **está `false`:** editar para `true`. Guardar.
   - Se **já está `true`:** nada a fazer, avançar.
4. Render faz redeploy automático (1–3 min).
5. Validar: abrir `https://<backend>/health` ou ver logs de arranque — procurar a linha `[TVDE] config … BETA_MODE=True …` emitida pelo arranque.

### B.X — Estado (preencher)

- [ ] Valor anterior: `___`
- [ ] Valor actual: `true`
- [ ] Redeploy concluído e health 200: sim / não
- [ ] Logs confirmam `BETA_MODE=True`: sim / não

---

## Passo C — OPS-BD-PI (limpeza `pi_mock` + `processing` em prod)

**Objectivo:** eliminar a inconsistência em que uma viagem está `completed` no domínio mas o `Payment` associado ficou com `stripe_payment_intent_id LIKE 'pi_mock_%'` e `status='processing'` (Stripe nunca vai capturar um PaymentIntent mock, portanto fica preso).

**Contexto de schema (confirmado em `backend/app/db/models/payment.py` + `backend/app/models/enums.py`):**

- Tabela `payments`: colunas `id`, `trip_id`, `status`, `stripe_payment_intent_id`, `created_at`, `updated_at`.
- `PaymentStatus` enum: `pending`, `processing`, `succeeded`, `failed`. **Não existe `completed`** (isso é estado de `Trip`).
- Tabela `trips`: coluna `status` com enum `TripStatus` incluindo `completed`, `cancelled`, `failed`.

### C.1 — Diagnóstico (SELECT; zero efeitos; executar primeiro)

```sql
-- C.1.a Contagem total de payments com pi_mock por status
SELECT p.status, COUNT(*) AS n
FROM payments p
WHERE p.stripe_payment_intent_id LIKE 'pi_mock_%'
GROUP BY p.status
ORDER BY n DESC;

-- C.1.b Cruzamento trip_status × payment_status para pi_mock
SELECT t.status AS trip_status, p.status AS payment_status, COUNT(*) AS n
FROM payments p
JOIN trips t ON t.id = p.trip_id
WHERE p.stripe_payment_intent_id LIKE 'pi_mock_%'
GROUP BY t.status, p.status
ORDER BY n DESC;

-- C.1.c Sample 10 mais recentes: trip completed + payment processing + pi_mock
SELECT p.id AS payment_id, p.trip_id, p.status AS payment_status,
       t.status AS trip_status, p.stripe_payment_intent_id,
       p.created_at, p.updated_at
FROM payments p
JOIN trips t ON t.id = p.trip_id
WHERE p.stripe_payment_intent_id LIKE 'pi_mock_%'
  AND p.status = 'processing'
  AND t.status = 'completed'
ORDER BY p.updated_at DESC
LIMIT 10;
```

**Como executar (Render prod):**

- Se tens acesso directo a `psql` via URL da DB prod: `psql "<DATABASE_URL>"` → colar as queries.
- Se preferires via Render Dashboard: abrir o serviço Postgres → **Connect** → copiar a connection string para `psql`.
- Ou via pgAdmin / TablePlus se for esse o teu fluxo.

### C.2 — Output do diagnóstico (preencher)

**C.1.a (total pi_mock por status):**

```
(colar output aqui)
```

**C.1.b (cruzamento trip × payment):**

```
(colar output aqui)
```

**C.1.c (sample 10):**

```
(colar output aqui)
```

### C.3 — Decisão antes de qualquer UPDATE

Só avançar para C.4 se as contagens estiverem no intervalo esperado (~38× `pi_mock` + completed + processing conforme histórico recente no `TODOdoDIA.md`). Se aparecer número muito superior (ex.: centenas), **parar** e investigar antes — pode ser indicador de bug separado e não "limpeza".

Estado final proposto para estes payments: `failed`. Racional: Stripe nunca capturou nem vai capturar PaymentIntents mock; colocá-los em `succeeded` seria mentira financeira; `failed` reflecte a realidade (pagamento não concretizado) e é compatível com a regra de `complete_trip` (que não altera `payment.status` manualmente — isto é reconciliação manual, não fluxo normal).

**Alternativas se o teu modelo mental for outro — não avançar até confirmar:**

- `DELETE` do payment: mais limpo mas perde rasto histórico; não recomendado.
- Manter `processing` e marcar trip como `failed`: não bate com o facto de a viagem ter sido entregue com sucesso.
- Mover para `succeeded`: errado financeiramente.

### C.4 — UPDATE proposto (executar só após C.1–C.3 validados)

```sql
BEGIN;

-- Antes do UPDATE: guardar contagem inicial
SELECT COUNT(*) AS before_n
FROM payments p
JOIN trips t ON t.id = p.trip_id
WHERE p.stripe_payment_intent_id LIKE 'pi_mock_%'
  AND p.status = 'processing'
  AND t.status = 'completed';

-- UPDATE alvo
UPDATE payments AS p
SET status = 'failed',
    updated_at = NOW()
FROM trips AS t
WHERE p.trip_id = t.id
  AND p.stripe_payment_intent_id LIKE 'pi_mock_%'
  AND p.status = 'processing'
  AND t.status = 'completed';

-- Depois do UPDATE: reconferir
SELECT p.status, COUNT(*) AS after_n
FROM payments p
JOIN trips t ON t.id = p.trip_id
WHERE p.stripe_payment_intent_id LIKE 'pi_mock_%'
GROUP BY p.status
ORDER BY 1;

-- Se os números batem certos (ex.: before_n ≈ total que passou para failed):
COMMIT;
-- Se algo parece errado:
-- ROLLBACK;
```

### C.5 — Output pós-UPDATE (preencher)

**before_n:** `___`

**after_n por status:**

```
(colar output aqui)
```

**Decisão tomada:** `COMMIT` / `ROLLBACK`

**Notas/observações:**

```
(observações livres)
```

---

## Passo D — OPS-SMOKE-132 (botão «Alinhar pagamento» + «Actualizar saúde»)

**Objectivo:** confirmar em prod que o botão entregue em #132 (reconciliação por viagem) funciona em viagem cancelada e que a aba Saúde reflecte a mudança.

**Viagem alvo:** `2853939b-1e99-4dfe-9f69-71ca62b29936` (cancelada, documentada no TODOdoDIA.md como smoke pendente).

### D.1 — Pré-requisitos

- [ ] Passo C terminado com sucesso (ou explicitamente adiado).
- [ ] Utilizador admin `super_admin` válido em prod (o botão é gated a super_admin).
- [ ] Browser com sessão admin activa em `https://<frontend>/admin`.

### D.2 — Roteiro (passos numerados)

1. Abrir o frontend prod → login super_admin.
2. Ir à aba **Viagens**.
3. Filtrar/pesquisar pelo id `2853939b-1e99-4dfe-9f69-71ca62b29936` (ou navegar até ao detalhe directo).
4. Confirmar na linha / detalhe:
   - `trip.status = cancelled`
   - Existe payment associado com status `processing` e `stripe_payment_intent_id` (pode ser `pi_3…` real, conforme histórico).
   - Botão **«Alinhar pagamento (Stripe)»** visível.
5. Clicar em **«Alinhar pagamento (Stripe)»**.
6. No diálogo de confirmação (`SINGLE_TRIP_PAYMENT_RECONCILE_STATUSES = ['completed','cancelled','failed']` em `AdminDashboard.tsx:74`), confirmar.
7. Observar:
   - Resposta do backend (ok / erro).
   - Novo estado do payment (deve passar para `failed` se o PI Stripe estiver cancelled/failed terminal; viagem cancelled **mantém-se** cancelled — regra do lote).
8. Abrir aba **Saúde** → clicar **«Actualizar»**.
9. Registar contagens antes/depois: `stuck_payments`, `warnings`, `inconsistent_pi_mock` (se aplicável).

### D.3 — Resultado (preencher)

- **Estado trip antes:** `cancelled`
- **Estado payment antes:** `___`
- **Resposta do botão:** ok / erro (detalhe: \_\_\_)
- **Estado payment depois:** `___`
- **Saúde antes (stuck / warnings / inconsistent):** `___ / ___ / ___`
- **Saúde depois:** `___ / ___ / ___`
- **Passou o smoke?** sim / não

Se `não`, abrir issue com label `alpha-blocker` e não avançar para Onda 1 até fixar.

---

## Passo E — Contas para o piloto (1P + 1D + 2A + 2 reserva)

**Redesenho 2026-04-23 (noite):** plano inicial (5P + 3D + 1A = 9 contas) foi substituído pelo **piloto informal reduzido** — 1 casal amigo (pessoa A = passenger, pessoa B = driver) vindo de Cascais para Oeiras, com Frank + parceiro em Oeiras a acolher/monitorizar. **4 contas principais + 2 de reserva**, total 6. Handouts bilingues EN+PT em PDF enviados por WhatsApp (ver `docs/_local/pilot_handouts/`).

**Modelo de login em BETA:** user com `password_hash=NULL` usa `DEFAULT_PASSWORD` — ver `backend/app/db/models/user.py:83` (comentário "Optional bcrypt hash; if null, BETA login uses DEFAULT_PASSWORD"). Login por phone + password. **Zero SMS/OTP** (confirmado em `backend/app/api/routers/auth.py:70-71`: em prod sem `ENABLE_DEV_TOOLS` o código OTP não sai para lado nenhum; fluxo do piloto é phone + password).

### E.1 — Lista proposta (6 contas)

| Papel                | Nome display | Phone (placeholder)\* | Role      | Distribuído? | Notas                                                                       |
| -------------------- | ------------ | --------------------- | --------- | ------------ | --------------------------------------------------------------------------- |
| Passageiro principal | Alpha P1     | `+3519000000001`      | passenger | ✅ Handout   | Casal amigo — pessoa A. Pede a viagem Cascais→Oeiras.                       |
| Motorista principal  | Alpha D1     | `+3519000000011`      | driver    | ✅ Handout   | Casal amigo — pessoa B. Auto-aprovado em BETA via `_ensure_driver_profile`. |
| Admin piloto 1       | Alpha Admin1 | `+3519000000091`      | admin     | ❌ Frank     | **Frank** no PC — monitor Admin Viagens + Saúde durante o piloto.           |
| Admin piloto 2       | Alpha Admin2 | `+3519000000092`      | admin     | ✅ Handout   | **Parceiro** em Oeiras — observador com AdminDashboard no telemóvel.        |
| Reserva passenger    | Alpha P2     | `+3519000000002`      | passenger | ❌ Idle      | Backup se P1 falhar; credenciais comunicadas verbalmente no momento.        |
| Reserva driver       | Alpha D2     | `+3519000000012`      | driver    | ❌ Idle      | Backup se D1 falhar; idem.                                                  |

**\*Placeholders:** os phones da tabela são **memoráveis mas irreais**. Antes de correr §E.2 em produção, os 4 principais (P1, D1, Admin1, Admin2) têm de ser substituídos pelos **números reais** recolhidos (casal, Frank, parceiro). As 2 reservas (P2, D2) podem ficar com phones placeholder — nunca são distribuídas; se forem precisas, cria-se **um utilizador real adicional à mão** no momento (1 comando extra).

**Racional do piloto reduzido:**

- Evita risco de eclipse de sessões (Frank não loga em P1 nem D1 — as contas ficam exclusivas do casal).
- Reduz variáveis: 1 viagem real, 2 pessoas a testar, 2 pessoas a observar.
- Suficiente para validar o produto end-to-end e demonstrar a investidor.
- Pós-piloto, tudo é rinsed: `DELETE` das 6 contas + `ON DELETE CASCADE` limpa tudo. Criação dos primeiros users reais (Frank, esposa, família, amigos) arranca do zero com dados completos (email, morada, conformidade legal).

### E.2 — Criação em prod (script Python 6 contas)

Script para Render Shell (backend API service). Idempotente: reruns não duplicam (`ON CONFLICT (phone) DO NOTHING`).

**Antes de correr:** abrir `docs/_local/ALPHA_ACCOUNTS.md` e substituir os 4 phones placeholder (P1, D1, Admin1, Admin2) pelos reais recolhidos. Copiar o bloco `USERS` actualizado para o script abaixo.

```bash
# Cola no Render Shell (backend API service) depois de substituir phones reais.
python - <<'EOF'
import os, psycopg2
USERS = [
    # 4 principais (substituir phones placeholder pelos reais antes de correr)
    ("passenger", "Alpha P1",     "+3519000000001"),  # casal — pessoa A
    ("driver",    "Alpha D1",     "+3519000000011"),  # casal — pessoa B
    ("admin",     "Alpha Admin1", "+3519000000091"),  # Frank (monitor PC)
    ("admin",     "Alpha Admin2", "+3519000000092"),  # parceiro (observador)
    # 2 reserva (placeholders OK, nunca distribuídos)
    ("passenger", "Alpha P2",     "+3519000000002"),  # reserva idle
    ("driver",    "Alpha D2",     "+3519000000012"),  # reserva idle
]
conn = psycopg2.connect(os.environ["DATABASE_URL"])
conn.autocommit = True
cur = conn.cursor()
inserted, existed = 0, 0
for role, name, phone in USERS:
    cur.execute(
        """
        INSERT INTO users (id, role, name, phone, status, password_hash, created_at, updated_at)
        VALUES (gen_random_uuid(), %s, %s, %s, 'active', NULL, NOW(), NOW())
        ON CONFLICT (phone) DO NOTHING
        RETURNING id
        """,
        (role, name, phone),
    )
    row = cur.fetchone()
    if row:
        inserted += 1
        print(f"[NEW] {role:10s} {name:13s} {phone}  id={row[0]}")
    else:
        existed += 1
        cur.execute("SELECT id, role FROM users WHERE phone=%s", (phone,))
        exist = cur.fetchone()
        print(f"[SKIP] {role:10s} {name:13s} {phone}  já existe (id={exist[0]}, role={exist[1]})")
cur.execute("""
    SELECT role, COUNT(*) FROM users
    WHERE name LIKE 'Alpha %'
    GROUP BY role ORDER BY role
""")
print("\n-- Resumo (só Alpha %) --")
for r in cur.fetchall():
    print(f"  {r[0]:12s} {r[1]}")
print(f"\nTotal: {inserted} inseridos, {existed} já existentes.")
EOF
```

**Password de login em BETA:** `password_hash=NULL` → fluxo de login aceita `DEFAULT_PASSWORD` (env var do Render; ver `backend/app/api/routers/auth.py`). Os 4 principais recebem a password no handout PDF bilingue.

**Drivers:** o perfil de motorista (tabela `drivers`) é criado automaticamente em BETA no primeiro heartbeat de localização (`backend/app/services/driver_location.py :: _ensure_driver_profile`). Ou seja: depois de criar o user D1, basta o tester fazer login na Reno 12 real e a app envia um heartbeat; o driver profile aparece sozinho.

### E.3 — Confirmação de login (spot-check obrigatório — 4 principais)

Antes de fechar a Onda 0, fazer **1 login por cada principal** para confirmar que as contas estão funcionais.

**Plano 2026-04-23 (noite) — Sueca side track terminado, TVDE retomado:**

- [ ] **Alpha P1** em browser desktop (Firefox janela privada) → PassengerDashboard abre → deslogar. Serve só para confirmar credenciais; experiência mobile fica para o casal.
- [ ] **Alpha D1** em browser desktop (Vivaldi anónima) → DriverDashboard abre → deslogar. **Não ligar GPS** no desktop (criaria driver profile sem querer num contexto desktop) — profile aparecerá sozinho quando o casal logar no telemóvel real no sábado.
- [ ] **Alpha Admin1** em **PC** (conta de monitorização do Frank) → AdminDashboard abre, aba Viagens visível, aba Saúde funcional.
- [ ] **Alpha Admin2** em **telemóvel do parceiro** (ou browser desktop, quando for mais prático) → AdminDashboard responsive mobile OK.

**P2 / D2:** **não** spot-checked. Ficam idle na BD; se forem precisas no sábado, Frank fone verbalmente o phone + password e o utilizador reserva loga no momento.

### E.4 — Estado

- [x] Script de criação revisto 2026-04-23 (noite) — 6 contas (4 principais + 2 reserva), idempotente.
- [ ] Script executado em prod (data: \_\_\_\_)
- [ ] 1 passenger principal (P1) criado
- [ ] 1 driver principal (D1) criado
- [ ] 2 admin dedicados (Admin1 = Frank, Admin2 = parceiro) criados
- [ ] 2 reserva (P2, D2) criados
- [ ] Credenciais documentadas offline (`docs/_local/ALPHA_ACCOUNTS.md`)
- [ ] Handouts bilingue gerados (`docs/_local/pilot_handouts/*.pdf`)
- [ ] Handouts enviados por WhatsApp (P1, D1, Admin2)
- [ ] Spot-check dos 4 principais: passou / falhou (detalhes: \_\_\_)
- [ ] Dry-run D-1 (6ª à tarde): P1/D1/Admin2 confirmam "instalei PWA + login OK" — detalhes: \_\_\_

---

## Fecho da Onda 0

Quando todos os checklists acima (A–E) estiverem marcados:

1. Actualizar este ficheiro com outputs finais.
2. Actualizar `docs/meta/ALPHA_2026-04-25.md` §8 (preparação) marcando itens concluídos.
3. Actualizar `docs/meta/PROXIMA_SESSAO.md` com secção `Fecho Onda 0 — 2026-04-20 (tarde/noite)` e indicação para arrancar Onda 1 na terça 2026-04-21.
4. Commit + push + PR `ops(alpha): Onda 0 operacional concluída`.

**Critério de passagem para Onda 1 (revisto 2026-04-23 para piloto reduzido):**

- OPS-BD-PI sem `processing + pi_mock + trip.completed` residual (ou explicado).
- OPS-SMOKE-132 passou.
- `BETA_MODE=True` em prod confirmado.
- 4 principais (P1, D1, Admin1, Admin2) + 2 reserva (P2, D2) criados; spot-check login dos 4 principais passado.
- Handouts PDF bilingue distribuídos a P1, D1, Admin2 via WhatsApp; dry-run D-1 confirmado.

Se algum dos 3 primeiros falhar, **adiar Onda 1** até resolver. Se spot-check ou dry-run falhar parcialmente, triagem caso-a-caso.
