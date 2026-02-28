# 🎯 Objetivo

Descrever claramente o que deve ser implementado.

Explicar o problema que estamos a resolver e o resultado esperado.

---

# 🧠 Contexto Atual do Sistema

- Backend: FastAPI
- ORM: SQLAlchemy 2
- DB: PostgreSQL
- Pagamentos: Stripe (manual capture)
- Webhook é fonte de verdade para payment.status
- Commit da trip completed ocorre apenas após capture OK
- Sem migrations (create_all + _dev_add_columns_if_missing)
- Sem Stripe Connect nesta fase

Fluxo financeiro atual:

ACCEPT:

- Cria PaymentIntent com confirm=False
- capture_method="manual"
- Status: requires_confirmation
- Cria Payment com status=processing

COMPLETE:

- Update amount
- Confirm PaymentIntent
- Capture PaymentIntent
- Só após capture OK:
  - trip.status = completed
  - Persist final_price e valores financeiros
- Webhook atualiza payment.status para succeeded

---

# 🔒 INVARIANTES OBRIGATÓRIAS (NÃO ALTERAR)

- Não alterar webhook como fonte de verdade para payment.status
- Não alterar commit após capture
- Não alterar state machine atual
- Não alterar enums existentes
- Não remover UniqueConstraint(trip_id)
- Não alterar fluxo de accept_trip
- Não alterar fluxo de complete_trip, exceto se explicitamente solicitado
- Não introduzir Stripe Connect
- Não introduzir migrations

---

# 📦 Escopo da Alteração

Descrever exatamente:

- O que deve ser criado
- O que pode ser modificado
- O que NÃO deve ser modificado
- Se deve ser backward compatible

---

# 🏗️ Implementação Esperada

- Ficheiros a criar
- Ficheiros a modificar
- Serviços envolvidos
- Endpoints envolvidos
- Schemas necessários
- Validações necessárias
- Logs estruturados (se aplicável)

---

# 🧪 Testes Esperados

- Fluxo feliz
- Idempotência
- Estados intermédios
- Edge cases relevantes

---

# 📊 Critérios de Aceitação

- Sistema continua a compilar
- Fluxos financeiros continuam intactos
- Sem regressões no accept_trip e complete_trip
- Sem alteração do comportamento do webhook
