# TVDE — Livro de Testes: Simulador de Motoristas

Este documento explica como executar o **simulador de motoristas**.

---

## Requisitos

- Backend a correr (local ou Render)
- `ENABLE_DEV_TOOLS=true` ou `ENV=dev` no backend
- Python com `httpx` instalado: `pip install httpx`

---

## Teste 1 — Simulador Local (10 motoristas)

**Passo 1**

Abre um terminal (PowerShell ou CMD).

**Resultado esperado**

O terminal está aberto.

---

**Passo 2**

Navega para a raiz do projeto.

**Comando (PowerShell):**

```
cd C:\dev\APP
```

(Ajusta o caminho conforme a tua instalação.)

**Resultado esperado**

O diretório atual é a raiz do projeto.

---

**Passo 3**

Executa o comando:

```
python scripts/driver_simulator.py --drivers 10
```

**Resultado esperado**

A mensagem "Checking connectivity to http://localhost:8000 ..." aparece. Segue "OK — API reachable". Depois "Seeding 10 drivers...". Por fim, linhas como:

```
[driver_1] online
[driver_2] online
...
[driver_10] online
```

---

**Passo 4**

Deixa o simulador a correr. Cria uma viagem como passageiro na app (http://localhost:5173).

**Resultado esperado**

No terminal do simulador aparece algo como:

```
[driver_X] accepted trip <uuid>
[driver_X] arriving trip <uuid>
[driver_X] started trip <uuid>
[driver_X] completed trip <uuid>
```

---

**Passo 5**

Para parar o simulador, pressiona `Ctrl+C`.

**Resultado esperado**

O simulador termina. O terminal volta ao prompt.

---

## Teste 2 — Simulador contra Render

**Passo 1**

Abre um terminal.

**Resultado esperado**

O terminal está aberto.

---

**Passo 2**

Navega para a raiz do projeto.

**Resultado esperado**

Estás na raiz do projeto.

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

A mensagem "Checking connectivity to https://tvde-api-fd2z.onrender.com ..." aparece. O primeiro pedido pode demorar até 60 segundos (cold start do Render). Depois "OK — API reachable". Os motoristas aparecem online.

---

**Passo 5**

Cria uma viagem na app em produção (ou no frontend que usa a mesma API).

**Resultado esperado**

Um motorista simulado aceita a viagem e completa o ciclo no terminal.
