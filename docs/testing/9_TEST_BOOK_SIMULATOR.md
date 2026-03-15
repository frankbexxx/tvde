# TVDE — Livro de Testes: Simulador de Motoristas

Este documento explica como executar o **simulador de motoristas**.

## PRE-TEST REQUIREMENT

Verification checklist completed:

- VER-001 ✔
- VER-002 ✔
- VER-003 ✔ (opcional para simulador contra Render)
- VER-004 ✔ (opcional para simulador contra Render)
- VER-005 ✔ (motoristas via seed/simulator)

Para simulador local: VER-001 e VER-002 obrigatórios. Para simulador contra Render: VER-001 e VER-002 na API remota.

**Em caso de falha:** Segue `docs/testing/TEST_FAILURE_PROTOCOL.md`. Para imediatamente. Regista Test ID, Passo, Esperado, Observado.

---

## Requisitos

- Backend a correr (local ou Render)
- `ENABLE_DEV_TOOLS=true` ou `ENV=dev` no backend
- Python com `httpx` instalado: `pip install httpx`

---

## TEST-S-001 — Simulador Local (10 motoristas)

**Passo 1**

Abre um terminal (PowerShell ou CMD).

**Resultado esperado**

O terminal está aberto.

---

**Passo 2**

Navega para a raiz do projeto.

**Comando:**

```
cd <PROJECT_ROOT>
```

**Resultado esperado**

O diretório atual é a raiz do projeto (contém as pastas `backend`, `web-app`, `scripts`).

---

**Passo 3**

Executa o comando:

```
python scripts/driver_simulator.py --drivers 10
```

**Resultado esperado**

A mensagem "Checking connectivity to http://localhost:8000 ..." aparece. Segue "OK — API reachable" dentro de **60 segundos**. Depois "Seeding 10 drivers...". Por fim, linhas como:

```
[driver_1] online
[driver_2] online
...
[driver_10] online
```

Se "OK — API reachable" não aparecer em 60 segundos, marcar como **FAILED**.

---

**Passo 4**

Deixa o simulador a correr. Cria uma viagem como passageiro na app:

```
http://localhost:5173
```

**Resultado esperado**

Espera até **30 segundos**. No terminal do simulador aparece algo como:

```
[driver_X] accepted trip <uuid>
[driver_X] arriving trip <uuid>
[driver_X] started trip <uuid>
[driver_X] completed trip <uuid>
```

Se nenhuma linha "accepted" aparecer em 30 segundos após criar a viagem, marcar como **FAILED**.

---

**Passo 5**

Para parar o simulador, pressiona `Ctrl+C`.

**Resultado esperado**

O simulador termina. O terminal volta ao prompt.

---

## TEST-S-002 — Simulador contra Render

**Passo 1**

Abre um terminal.

**Resultado esperado**

O terminal está aberto.

---

**Passo 2**

Navega para a raiz do projeto.

**Comando:**

```
cd <PROJECT_ROOT>
```

**Resultado esperado**

O diretório atual é a raiz do projeto.

---

**Passo 3**

Define a variável de ambiente para a API do Render.

**Comando (PowerShell):**

```
$env:API_BASE="https://tvde-api-fd2z.onrender.com"
```

**Resultado esperado**

A variável está definida (sem mensagem de erro).

---

**Passo 4**

Executa o comando:

```
python scripts/driver_simulator.py --drivers 10
```

**Resultado esperado**

A mensagem "Checking connectivity to https://tvde-api-fd2z.onrender.com ..." aparece. O primeiro pedido pode demorar até **60 segundos** (cold start do Render). Depois "OK — API reachable". Os motoristas aparecem online. Se "OK — API reachable" não aparecer em 60 segundos, marcar como **FAILED**.

---

**Passo 5**

Cria uma viagem na app em produção (ou no frontend que usa a mesma API).

**Resultado esperado**

Espera até **60 segundos**. Um motorista simulado aceita a viagem e completa o ciclo no terminal. Se nenhuma linha "accepted" aparecer em 60 segundos, marcar como **FAILED**.
