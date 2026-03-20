A008_LOGS_OPERACIONAIS_E_TEST_FLOW

OBJETIVO:
Transformar o sistema de logs atual (já funcional) num sistema OPERACIONAL,
orientado para testes reais por um utilizador humano (não omnipresente).

Foco:
- leitura rápida
- direção clara
- zero esforço mental extra

---

CONTEXTO:

Logs já existem e estão bem distribuídos (log_event, debug, buffer, endpoint).
Mas:

- estão dispersos
- exigem filtering manual
- não dão visão direta do fluxo
- não ajudam o utilizador a “seguir uma trip”

(Ver doc de referência) :contentReference[oaicite:0]{index=0}

---

O QUE IMPLEMENTAR:

1) HEADER VISUAL POR TRIP (CRÍTICO)

Sempre que uma trip começa:

PRINT:

==============================
🚗 NEW TRIP STARTED
trip_id=XXXX
==============================

E quando termina:

==============================
✅ TRIP COMPLETED
trip_id=XXXX
==============================

---

2) LOGS EM FORMATO DE TIMELINE (MUITO IMPORTANTE)

Adicionar timestamp curto (HH:MM:SS) a TODOS os logs:

Exemplo:

[12:01:03] [TRIP] trip_created | trip_id=123
[12:01:05] [DISPATCH] offer_sent | driver_id=456
[12:01:08] [DRIVER] offer_accepted | driver_id=456
[12:01:09] [TRIP] state_changed | assigned → accepted

---

3) RESUMO AUTOMÁTICO NO FINAL DA TRIP (GAME CHANGER)

Quando estado = completed:

PRINT:

----- TRIP SUMMARY -----
trip_id=123
time_to_assign: 2s
time_to_accept: 3s
time_to_start: 10s
total_duration: XXs
offers_sent: N
------------------------

Calcular usando timestamps já existentes (não criar sistema complexo).

---

4) COMANDO SIMPLES PARA VER LOGS (IMPORTANTE PARA TI)

Criar script:

scripts/run_backend_with_logs.ps1

Conteúdo:

- ativa venv
- arranca uvicorn
- garante logs visíveis

Objetivo:
👉 1 comando → backend + logs visíveis

---

5) ENDPOINT SIMPLIFICADO PARA TESTE MANUAL

Criar endpoint:

GET /debug/trip/{trip_id}/summary

Retorna:

{
  trip_id,
  time_to_assign,
  time_to_accept,
  time_to_start,
  events_count
}

---

6) MELHORAR LOGS DE LOCALIZAÇÃO (RUÍDO)

Atualmente:

driver_location_update gera ruído

ALTERAR:

- só logar se:
  - primeira vez
  - mudou significativamente (> X metros)
  - ou tem trip ativa

---

7) INSTRUÇÕES DE TESTE (PRINT NO CONSOLE)

Quando backend arranca, imprimir:

=== TEST MODE READY ===

1. Criar trip (frontend)
2. Aceitar como driver
3. Seguir logs no terminal
4. No final ver SUMMARY

Opcional:
GET /debug/trip/{trip_id}/logs

=======================

---

O QUE NÃO FAZER:

❌ NÃO alterar lógica de negócio
❌ NÃO mexer em dispatch
❌ NÃO refatorar arquitetura
❌ NÃO introduzir dependências novas
❌ NÃO complicar cálculos

---

CRITÉRIO DE SUCESSO:

Um utilizador consegue:

✔ olhar para o terminal e perceber o que está a acontecer  
✔ seguir uma trip do início ao fim  
✔ saber quanto tempo demorou cada fase  
✔ fazer testes sem precisar de filtrar logs manualmente  

---

NOTAS:

- isto NÃO é logging técnico
- isto é logging operacional
- prioridade = clareza humana

- se houver dúvida:
  → escolher sempre a opção mais simples
