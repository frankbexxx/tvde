# TVDE — Verificação Pré-Teste (Obrigatória)

**Nenhum teste pode começar sem esta verificação estar concluída.**

Se qualquer passo falhar: **PARA**. Não prossigas para os livros de teste. Corrige o problema e repete a verificação.

---

## Princípio

O protocolo de testes exige que **tudo esteja online e a comunicar** antes de qualquer teste. Caso contrário, os resultados são imprevisíveis e não confiáveis.

---

## Verificação 1 — Backend

Abre no browser:

```
http://localhost:8000/health
```

**Resultado esperado**

A página mostra `{"status":"ok"}` ou similar (JSON com status).

**Se falhar:** O backend não está a correr ou não responde. Inicia o backend (`TEST_ENVIRONMENT_SETUP.md`, Passo 3) ou usa `.\scripts\start_test_env.ps1`. Aguarda até **30 segundos** após iniciar. Se não responder, **PARA** e reporta.

---

## Verificação 2 — API Docs

Abre no browser:

```
http://localhost:8000/docs
```

**Resultado esperado**

A interface Swagger (OpenAPI) aparece.

**Se falhar:** O backend não está a servir corretamente. **PARA** e reporta.

---

## Verificação 3 — Frontend

Abre no browser:

```
http://localhost:5173
```

**Resultado esperado**

A app TVDE carrega. Vês o ecrã de login (BETA) ou "A carregar..." seguido do dashboard (dev).

**Se falhar:** O frontend não está a correr ou não responde. Inicia o frontend (`TEST_ENVIRONMENT_SETUP.md`, Passo 4). Aguarda até **15 segundos**. Se não carregar, **PARA** e reporta.

---

## Verificação 4 — Comunicação Frontend ↔ Backend

Com o frontend aberto (Passo 3), se tiveres login:

- Introduz credenciais e faz login.
- Se o login falhar com erro de rede ou timeout: **PARA**. O frontend não está a comunicar com o backend. Verifica CORS, URL da API no frontend, etc.

Se estiveres em modo dev (sem login):

- A app deve carregar e mostrar o dashboard. Se aparecer erro de rede ou "Failed to fetch": **PARA**. O frontend não está a comunicar com o backend.

---

## Verificação 5 — Estado do Sistema

Confirma que o estado do sistema cumpre os requisitos em `TEST_STATE_DEFINITION.md`:

- Pelo menos um motorista disponível (ou simulador a correr para testes que o exigem)
- Pelo menos um passageiro (ou seed para criar)
- Nenhuma viagem ativa em estado bloqueante

**Se falhar:** Executa reset ou seed conforme `TEST_STATE_DEFINITION.md`. **PARA** até o estado estar correto.

---

## Resumo

| Verificação | Passo | Condição de sucesso |
|-------------|-------|---------------------|
| Backend health | 1 | `http://localhost:8000/health` retorna 200 |
| API Docs | 2 | Swagger visível em `http://localhost:8000/docs` |
| Frontend | 3 | App carrega em `http://localhost:5173` |
| Comunicação | 4 | Login/API sem erros de rede |
| Estado | 5 | Requisitos de TEST_STATE_DEFINITION cumpridos |

**Só quando todas as verificações passarem:** podes avançar para os livros de teste (TEST_BOOK_PASSENGER.md, etc.).

---

## Referência

Este documento é a **porta de entrada** do protocolo. Sem verificação prévia aprovada, os testes não são válidos.
