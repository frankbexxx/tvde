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
- [ ] **B.** `BETA_MODE=True` confirmado na env do Render (prod backend).
- [ ] **C.** OPS-BD-PI: `pi_mock` + pagamento `processing` em viagens `completed` reconciliados.
- [ ] **D.** OPS-SMOKE-132: smoke do botão «Alinhar pagamento (Stripe)» na viagem `2853939b-1e99-4dfe-9f69-71ca62b29936` + «Actualizar saúde» ok.
- [ ] **E.** 5 passageiros + 2–3 motoristas + 1 admin criados em prod com login confirmado manualmente 1× por tipo.

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

### A.X — Estado (preencher)

- [ ] Texto final adaptado: sim / não
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
- **Resposta do botão:** ok / erro (detalhe: ___)
- **Estado payment depois:** `___`
- **Saúde antes (stuck / warnings / inconsistent):** `___ / ___ / ___`
- **Saúde depois:** `___ / ___ / ___`
- **Passou o smoke?** sim / não

Se `não`, abrir issue com label `alpha-blocker` e não avançar para Onda 1 até fixar.

---

## Passo E — Contas para o piloto (5P + 3D + 1A)

**Modelo de login em BETA:** user com `password_hash=NULL` usa `DEFAULT_PASSWORD` — ver `backend/app/db/models/user.py:83` (comentário "Optional bcrypt hash; if null, BETA login uses DEFAULT_PASSWORD"). Login por phone + password.

### E.1 — Lista proposta

| Papel | Nome display | Phone (sugestão) | Role | Notas |
|---|---|---|---|---|
| Passageiro 1 | Alpha P1 | `+3519000000001` | passenger | Tester 1 |
| Passageiro 2 | Alpha P2 | `+3519000000002` | passenger | Tester 2 |
| Passageiro 3 | Alpha P3 | `+3519000000003` | passenger | Tester 3 |
| Passageiro 4 | Alpha P4 | `+3519000000004` | passenger | Tester 4 |
| Passageiro 5 | Alpha P5 | `+3519000000005` | passenger | Tester 5 |
| Motorista 1 | Alpha D1 | `+3519000000011` | driver | Auto-aprovado em BETA via `_ensure_driver_profile` |
| Motorista 2 | Alpha D2 | `+3519000000012` | driver | Idem |
| Motorista 3 | Alpha D3 | `+3519000000013` | driver | Reserva |
| Admin piloto | Alpha Admin | `+3519000000099` | admin | Dedicado para o sábado (não misturar com super_admin pessoal) |

**Nota:** os phones são sugestões — se a tua prod tem validação E.164 estrita ou se já usaste alguns destes, ajusta. O importante é serem **memorizáveis** e **segregados** do resto dos users reais.

### E.2 — Criação em prod

Depende do fluxo existente. Opções:

1. **Via AdminDashboard UI** (preferido se exposto): aba Utilizadores → Criar utilizador → preencher nome/phone/role → Submit. Repetir 9×.
2. **Via API `POST /auth/register` ou equivalente**: se existe endpoint. Verificar `backend/app/api/routers/auth.py`.
3. **Via SQL directo** (último recurso, só se UI não permite admin/super_admin pelo register normal):

```sql
-- EXEMPLO para Passageiro 1 — adaptar para cada linha da tabela E.1
INSERT INTO users (id, role, name, phone, status, password_hash, created_at, updated_at)
VALUES (gen_random_uuid(), 'passenger', 'Alpha P1', '+3519000000001', 'active', NULL, NOW(), NOW());
```

Se fores por SQL, repetir para cada role. Para `admin`, pode ser preciso um passo extra (ver `backend/app/api/routers/admin.py` para regras de elevação).

### E.3 — Confirmação de login (spot-check obrigatório)

Antes de fechar a Onda 0, fazer **pelo menos 1 login por role** para confirmar que as contas estão funcionais:

- [ ] Login Alpha P1 em dispositivo real → PassengerDashboard abre.
- [ ] Login Alpha D1 em dispositivo real → DriverDashboard abre; motorista pode ficar online.
- [ ] Login Alpha Admin em PC → AdminDashboard abre e aba Viagens é visível.

### E.4 — Estado (preencher)

- [ ] 5 passageiros criados
- [ ] 3 motoristas criados
- [ ] 1 admin dedicado criado
- [ ] Credenciais documentadas offline (ficheiro local não comitado)
- [ ] Spot-check P1/D1/Admin: passou / falhou (detalhes: ___)

---

## Fecho da Onda 0

Quando todos os checklists acima (A–E) estiverem marcados:

1. Actualizar este ficheiro com outputs finais.
2. Actualizar `docs/meta/ALPHA_2026-04-25.md` §8 (preparação) marcando itens concluídos.
3. Actualizar `docs/meta/PROXIMA_SESSAO.md` com secção `Fecho Onda 0 — 2026-04-20 (tarde/noite)` e indicação para arrancar Onda 1 na terça 2026-04-21.
4. Commit + push + PR `ops(alpha): Onda 0 operacional concluída`.

**Critério de passagem para Onda 1:**
- OPS-BD-PI sem `processing + pi_mock + trip.completed` residual (ou explicado).
- OPS-SMOKE-132 passou.
- `BETA_MODE=True` em prod confirmado.
- Mínimo 5P + 1D + 1 admin com login testado (os restantes podem ficar para terça de manhã).
- Convocatória enviada a pelo menos 7 contactos para ter margem de 5 confirmados.

Se algum dos 3 primeiros falhar, **adiar Onda 1** até resolver. Se só E falhar parcialmente, arrancar Onda 1 na mesma e fechar E na terça.
