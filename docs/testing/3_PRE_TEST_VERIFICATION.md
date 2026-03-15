# TVDE — Verificação Pré-Teste (Obrigatória)

**Nenhum teste pode começar sem esta verificação estar concluída.**

**Antes de começar:** Confirma que completaste os passos 1-3 de `TEST_ENVIRONMENT_SETUP.md` (Sequência completa): arranque, reset (opcional), seed/simulator.

Se qualquer passo falhar: **PARA**. Não prossigas para os livros de teste. Corrige o problema e repete a verificação.

---

## Princípio

O protocolo de testes exige que **tudo esteja online e a comunicar** antes de qualquer teste. Caso contrário, os resultados são imprevisíveis e não confiáveis.

---

## VER-001 — Backend health

Abre no browser:

```
http://localhost:8000/health
```

**Resultado esperado**

A página mostra `{"status":"ok"}` ou similar (JSON com status).

**Se falhar:** O backend não está a correr ou não responde. Inicia o backend (`TEST_ENVIRONMENT_SETUP.md`, Passo 3) ou usa `.\scripts\start_test_env.ps1`. Aguarda até **30 segundos** após iniciar. Se não responder, **PARA** e reporta.

---

## VER-002 — API Docs

Abre no browser:

```
http://localhost:8000/docs
```

**Resultado esperado**

A interface Swagger (OpenAPI) aparece.

**Se falhar:** O backend não está a servir corretamente. **PARA** e reporta.

---

## VER-003 — Frontend load

Abre no browser:

```
http://localhost:5173
```

**Resultado esperado**

A app TVDE carrega. Vês o ecrã de login (BETA) ou "A carregar..." seguido do dashboard (dev).

**Se falhar:** O frontend não está a correr ou não responde. Inicia o frontend (`TEST_ENVIRONMENT_SETUP.md`, Passo 4). Aguarda até **15 segundos**. Se não carregar, **PARA** e reporta.

---

## VER-004 — API communication

Com o frontend aberto (VER-003), se tiveres login:

- Introduz credenciais e faz login.
- Se o login falhar com erro de rede ou timeout: **PARA**. O frontend não está a comunicar com o backend. Verifica CORS, URL da API no frontend, etc.

Se estiveres em modo dev (sem login):

- A app deve carregar e mostrar o dashboard. Se aparecer erro de rede ou "Failed to fetch": **PARA**. O frontend não está a comunicar com o backend.

---

## VER-005 — System state

Confirma que o estado do sistema cumpre os requisitos em `TEST_STATE_DEFINITION.md`:

- Pelo menos um motorista disponível (ou simulador a correr para testes que o exigem)
- Pelo menos um passageiro (ou seed para criar)
- Nenhuma viagem ativa em estado bloqueante

**Se falhar:** Executa reset ou seed conforme `TEST_STATE_DEFINITION.md`. **PARA** até o estado estar correto.

---

## Resumo

| ID | Verificação | Condição de sucesso |
|----|-------------|---------------------|
| VER-001 | Backend health | `http://localhost:8000/health` retorna 200 |
| VER-002 | API Docs | Swagger visível em `http://localhost:8000/docs` |
| VER-003 | Frontend load | App carrega em `http://localhost:5173` |
| VER-004 | API communication | Login/API sem erros de rede |
| VER-005 | System state | Requisitos de TEST_STATE_DEFINITION cumpridos |

**Só quando todas as verificações passarem:** podes avançar para os livros de teste (TEST_BOOK_PASSENGER.md, etc.).

---

## Resultado final da verificação

Se todas as verificações passaram:

**STATUS: SYSTEM READY FOR TESTING**

Podes avançar para os livros de teste.

---

Se alguma verificação falhou:

**STATUS: TESTING BLOCKED**

Corrige o problema. Repete a verificação. Não prossigas para os testes.

---

## Referência

Este documento é a **porta de entrada** do protocolo. Sem verificação prévia aprovada, os testes não são válidos.
