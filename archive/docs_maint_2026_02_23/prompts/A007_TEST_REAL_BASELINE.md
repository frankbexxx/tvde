# A007_TEST_REAL_BASELINE.md 

OBJETIVO:
Preparar o sistema para testes reais com visibilidade mínima mas suficiente.
Não alterar comportamento existente. Apenas observar e medir.

---

CONTEXTO:
Sistema TVDE já funcional, auditado e consistente.
Agora o foco é validação com utilizadores reais (driver + passenger).

---

O QUE IMPLEMENTAR:

1) LOGS ESTRUTURADOS (SEM ALTERAR LÓGICA)

Garantir logs claros nos seguintes eventos:

- trip_created
- offer_sent
- offer_accepted
- driver_location_updated (apenas quando relevante)
- trip_state_changed (com estado anterior → novo)

Formato esperado (exemplo):

{
  "event": "trip_state_changed",
  "trip_id": "...",
  "from": "accepted",
  "to": "arriving",
  "timestamp": "..."
}

REGRAS:
- NÃO alterar fluxo existente
- NÃO introduzir lógica nova
- Apenas adicionar logs

---

2) TEMPOS CRÍTICOS (MEDIÇÃO SIMPLES)

Registar timestamps para permitir calcular:

- tempo até assignment
- tempo até driver aceitar
- tempo até início da viagem

Pode ser via logs (não precisa métricas complexas).

---

3) VALIDAÇÃO DE STALENESS (OBSERVAÇÃO)

Adicionar log quando:

- localização de driver é ignorada por ser stale

Exemplo:
"event": "stale_location_filtered"

---

4) DEBUG CONTROLADO

Adicionar flag de config:

DEBUG_RUNTIME_LOGS = True

Se False:
- logs continuam mínimos
Se True:
- logs detalhados acima ativos

---

O QUE NÃO FAZER:

❌ NÃO refatorar código
❌ NÃO alterar dispatch
❌ NÃO mexer em WebSockets
❌ NÃO alterar polling
❌ NÃO otimizar nada
❌ NÃO mudar estrutura de dados

---

CRITÉRIO DE SUCESSO:

- sistema comporta-se exatamente igual
- logs permitem reconstruir fluxo completo de uma trip
- é possível medir tempos manualmente via logs
- zero impacto em testes existentes (pytest continua a passar)

---

NOTAS:

- preferir simplicidade absoluta
- evitar abstrações
- logs > métricas complexas
- objetivo é OBSERVAR, não melhorar
