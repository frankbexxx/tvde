# TVDE — Protocolo de Falha de Teste

Este documento define **o que o testador deve fazer quando um passo falha**.

---

## Regra Fundamental

Se o resultado esperado **não ocorrer**, o testador deve:

1. **Parar o teste imediatamente.**
2. **Não executar os passos restantes.**
3. **Registar a falha conforme abaixo.**

---

## Procedimento de Registo de Falha

Quando um passo falha, o testador deve registar:

| Campo | Descrição |
|-------|-----------|
| **Test ID** | Identificador único do teste (ex: TEST-P-001, TEST-D-003) |
| **Step number** | Número do passo que falhou |
| **Expected** | O que deveria ter acontecido |
| **Observed** | O que realmente aconteceu |

---

## Formato do Relatório de Falha

```
Test ID:     TEST-D-003
Step:        2
Expected:    state "arriving"
Observed:    state remained "accepted"
```

---

## Exemplos de Relatórios

### Exemplo 1 — Timeout

```
Test ID:     TEST-P-002
Step:        3
Expected:    state changes to "Motorista atribuído" within 30 seconds
Observed:    state remained "À procura de motorista" after 30 seconds
```

### Exemplo 2 — Elemento ausente

```
Test ID:     TEST-D-002
Step:        2
Expected:    trip appears in available list within 30 seconds
Observed:    list remained empty after 30 seconds
```

### Exemplo 3 — Comportamento incorreto

```
Test ID:     TEST-F-001
Step:        8
Expected:    [driver_X] accepted trip <uuid> in simulator terminal
Observed:    no acceptance message after 60 seconds
```

---

## Ações Proibidas Após Falha

O testador **não deve**:

- Continuar para o passo seguinte.
- Tentar "corrigir" o sistema e repetir sem registar.
- Ignorar a falha e marcar o teste como passou.
- Modificar código ou reiniciar serviços sem registar a falha primeiro.

---

## Marcar o Teste como FAILED

Quando uma falha é registada, o teste é considerado **FAILED**.

O testador deve:

1. Parar a execução.
2. Preencher o relatório de falha.
3. Entregar o relatório ao responsável pelo projeto.

---

## Referência

Este protocolo aplica-se a todos os testes definidos em:

- TEST_BOOK_PASSENGER.md
- TEST_BOOK_DRIVER.md
- TEST_BOOK_SIMULATOR.md
- TEST_BOOK_FULL_SYSTEM.md
