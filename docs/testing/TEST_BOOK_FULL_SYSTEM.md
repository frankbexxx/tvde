# TVDE — Teste do Sistema Completo

Este teste verifica o **pipeline completo** da plataforma.

**Test ID:** TEST-F-001

**Pré-requisito:** Este teste inclui arranque completo. Após os Passos 1-6, executa `docs/testing/PRE_TEST_VERIFICATION.md` antes do Passo 7. Se qualquer verificação falhar, PARA.

**Em caso de falha:** Segue `docs/testing/TEST_FAILURE_PROTOCOL.md`. Para imediatamente. Regista Test ID, Passo, Esperado, Observado.

---

## Actores

- **1 passageiro** — usa a app no browser
- **10 motoristas simulados** — via `scripts/driver_simulator.py`

---

## Sequência

### Passo 1

Navega para o diretório raiz do projeto.

**Comando:**

```
cd <PROJECT_ROOT>
```

**Resultado esperado**

O diretório atual é a raiz do projeto.

---

### Passo 2

Inicia o PostgreSQL.

**Comando (PowerShell):**

```
.\scripts\1_start_db.ps1
```

**Resultado esperado**

Mensagem: `PostgreSQL pronto.` Se não aparecer, marcar como **FAILED**.

---

### Passo 3

Inicia o backend.

**Comando (a partir de PROJECT_ROOT):**

```
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Resultado esperado**

`Application startup complete.` aparece na consola. Se não aparecer em 30 segundos, marcar como **FAILED**.

---

### Passo 4

Numa nova janela de terminal, navega para PROJECT_ROOT e inicia o frontend.

**Comando:**

```
cd <PROJECT_ROOT>
cd web-app
npm run dev
```

**Resultado esperado**

`Local: http://localhost:5173/` aparece na consola. Se não aparecer em 30 segundos, marcar como **FAILED**.

---

### Passo 5

Numa terceira janela de terminal, navega para PROJECT_ROOT e executa o reset da base de dados.

**Comando:**

```
cd <PROJECT_ROOT>
.\scripts\2_reset_db.ps1
```

**Resultado esperado**

`Reset OK` aparece. Se não aparecer, marcar como **FAILED**.

---

### Passo 6

Na mesma janela (ou nova), navega para PROJECT_ROOT e inicia o simulador de motoristas.

**Comando:**

```
cd <PROJECT_ROOT>
python scripts/driver_simulator.py --drivers 10
```

**Resultado esperado**

Todos os 10 motoristas aparecem online dentro de **60 segundos**. O simulador continua a correr. Se não aparecerem em 60 segundos, marcar como **FAILED**.

---

### Passo 7

Abre o browser em:

```
http://localhost:5173
```

**Resultado esperado**

A app carrega dentro de **15 segundos**. Se BETA_MODE=true, confirma que o ecrã de login aparece. Se não, confirma que vês o dashboard após "A carregar...". Se não carregar em 15 segundos, marcar como **FAILED**.

---

### Passo 8

Como passageiro, clica em "Pedir viagem".

**Resultado esperado**

Uma viagem é criada. O estado mostra "À procura de motorista" ou "Motorista atribuído" dentro de **10 segundos**. Se não mudar em 10 segundos, marcar como **FAILED**.

---

### Passo 9

Confirma no terminal do simulador que aparece uma linha de aceitação.

**Resultado esperado**

Espera até **30 segundos**. Aparece uma linha como `[driver_X] accepted trip <uuid>` no terminal do simulador. Se não aparecer em 30 segundos, marcar como **FAILED**.

---

### Passo 10

Confirma na app no browser que o estado da viagem avança.

**Resultado esperado**

Espera até **60 segundos** (tempo total para o ciclo completo). O estado da viagem avança: "Motorista a caminho", "Motorista a chegar", "Em viagem", "Viagem concluída". Se não chegar a "Viagem concluída" em 60 segundos, marcar como **FAILED**.

---

### Passo 11

Confirma no terminal do simulador que o ciclo completo foi registado.

**Resultado esperado**

Aparecem linhas:

```
[driver_X] arriving trip <uuid>
[driver_X] started trip <uuid>
[driver_X] completed trip <uuid>
```

Se não aparecerem todas dentro do tempo do Passo 10, marcar como **FAILED**.

---

### Passo 12

Na app, confirma que o histórico mostra a viagem concluída.

**Resultado esperado**

A viagem concluída aparece no histórico com estado "completed" ou "Viagem concluída". Se não aparecer, marcar como **FAILED**.

---

## Resultado Final Esperado

O ciclo de vida da viagem completa com sucesso:

1. Passageiro cria viagem
2. Motorista simulado aceita (dentro de 30 segundos)
3. Motorista marca "a chegar"
4. Motorista inicia viagem
5. Motorista conclui viagem
6. Viagem aparece como concluída no histórico

Se STRIPE_MOCK=true, o pagamento é simulado. Se não, o Stripe processa o pagamento (requer webhook configurado).
