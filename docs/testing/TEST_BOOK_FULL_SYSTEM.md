# TVDE — Teste do Sistema Completo

Este teste verifica o **pipeline completo** da plataforma.

---

## Actores

- **1 passageiro** — usa a app no browser
- **10 motoristas simulados** — via `scripts/driver_simulator.py`

---

## Sequência

### Passo 1

Inicia o PostgreSQL.

**Comando:**

```
.\scripts\1_start_db.ps1
```

**Resultado esperado**

Mensagem: `PostgreSQL pronto.`

---

### Passo 2

Inicia o backend.

**Comando:**

```
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Resultado esperado**

`Application startup complete.`

---

### Passo 3

Numa nova janela, inicia o frontend.

**Comando:**

```
cd web-app
npm run dev
```

**Resultado esperado**

`Local: http://localhost:5173/`

---

### Passo 4

Numa terceira janela, executa o reset da base de dados.

**Comando:**

```
.\scripts\2_reset_db.ps1
```

**Resultado esperado**

`Reset OK`

---

### Passo 5

Na mesma janela (ou nova), inicia o simulador de motoristas.

**Comando:**

```
python scripts/driver_simulator.py --drivers 10
```

**Resultado esperado**

Todos os 10 motoristas aparecem online. O simulador continua a correr.

---

### Passo 6

Abre o browser em http://localhost:5173.

**Resultado esperado**

A app carrega. Se BETA_MODE=true, faz login. Se não, vês o dashboard após "A carregar...".

---

### Passo 7

Como passageiro, clica em "Pedir viagem".

**Resultado esperado**

Uma viagem é criada. O estado mostra "À procura de motorista" ou "Motorista atribuído".

---

### Passo 8

Observa o terminal do simulador.

**Resultado esperado**

Aparece uma linha como `[driver_X] accepted trip <uuid>`.

---

### Passo 9

Observa a app no browser.

**Resultado esperado**

O estado da viagem avança: "Motorista a caminho", "Motorista a chegar", "Em viagem", "Viagem concluída".

---

### Passo 10

Observa o terminal do simulador novamente.

**Resultado esperado**

Aparecem linhas:

```
[driver_X] arriving trip <uuid>
[driver_X] started trip <uuid>
[driver_X] completed trip <uuid>
```

---

### Passo 11

Na app, verifica o histórico.

**Resultado esperado**

A viagem concluída aparece no histórico com estado "completed".

---

## Resultado Final Esperado

O ciclo de vida da viagem completa com sucesso:

1. Passageiro cria viagem
2. Motorista simulado aceita
3. Motorista marca "a chegar"
4. Motorista inicia viagem
5. Motorista conclui viagem
6. Viagem aparece como concluída no histórico

Se STRIPE_MOCK=true, o pagamento é simulado. Se não, o Stripe processa o pagamento (requer webhook configurado).
