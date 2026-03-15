# TVDE — Regras de Teste

Todas as instruções de teste devem seguir estas regras.

---

## Regras Obrigatórias

0. **Nenhum teste pode começar sem verificação prévia aprovada.** Executa `docs/testing/PRE_TEST_VERIFICATION.md` antes de qualquer livro de teste. Se qualquer verificação falhar, PARA. Não prossigas.

1. **Todos os testes devem incluir um ID único.**
   - Passageiro: TEST-P-001, TEST-P-002, ...
   - Motorista: TEST-D-001, TEST-D-002, ...
   - Simulador: TEST-S-001, TEST-S-002, ...
   - Sistema completo: TEST-F-001, ...

2. **Cada teste deve ser numerado.**

3. **Cada passo deve conter uma única ação.**
   - Um passo = uma ação.
   - Não combinar múltiplas ações no mesmo passo.

4. **Cada passo deve definir o resultado esperado.**
   - Após cada ação, indicar o que o testador deve confirmar.

5. **Todos os passos de espera devem incluir um tempo máximo.**
   - Exemplo: "Espera até **30 segundos** para o estado mudar."
   - Se não mudar dentro do tempo: marcar o teste como **FAILED** e seguir TEST_FAILURE_PROTOCOL.

6. **Todas as falhas devem seguir o TEST_FAILURE_PROTOCOL.**
   - Parar imediatamente.
   - Registar Test ID, Passo, Esperado, Observado.
   - Não continuar os passos restantes.

7. **Nenhum passo pode conter múltiplas ações.**

8. **Nenhum passo pode conter comportamento opcional.**
   - Todas as instruções são obrigatórias e sequenciais.

---

## Limites de Tempo para Ações do Sistema

| Ação | Tempo máximo |
|------|--------------|
| Atribuição de motorista | 30 segundos |
| Transições do ciclo de vida da viagem | 30 segundos |
| Conexão do simulador | 60 segundos |

Se a ação não ocorrer dentro do tempo definido, o teste deve ser marcado como **FAILED**.

---

## Linguagem Determinística

Usar sempre:

- "Confirma que X aparece."
- "Verifica que Y está visível."
- "Espera até **30 segundos** para Z."
- "Regista o resultado."

Não usar:

- "Observa a lista."
- "Olha para o ecrã."
- "Espera até X acontecer."
- "Verifica se Y."

---

## Formato Obrigatório de Cada Passo

Cada passo deve seguir o formato:

**Passo N**

[Ação]

**Resultado esperado**

[O que o testador deve confirmar. Se envolver espera, incluir tempo máximo e condição de falha.]

---

## Exemplo de Instrução Inválida

> Abre a app e cria uma viagem.

**Problema:** Duas ações num único passo.

---

## Exemplo de Instrução Correta

**Passo 1**

Abre o browser.

**Resultado esperado**

O browser está aberto.

---

**Passo 2**

Navega para:

```
http://localhost:5173
```

**Resultado esperado**

A página da app TVDE aparece.

---

**Passo 3**

Clica no botão com o texto:

```
Pedir viagem
```

**Resultado esperado**

Uma nova viagem aparece no mapa. O estado mostra "À procura de motorista" ou "Motorista atribuído" dentro de **30 segundos**. Se não mudar em 30 segundos, marcar como **FAILED**.

---

## Linguagem Imperativa

Usar sempre:

- "Deves fazer X."
- "Deves clicar em X."
- "Deves abrir X."

Não usar:

- "Podes fazer X."
- "Podes tentar X."
- "Poderias fazer X."

Todas as ações são **obrigatórias e sequenciais**.
