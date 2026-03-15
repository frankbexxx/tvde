# TVDE — Regras de Teste

Todas as instruções de teste devem seguir estas regras.

---

## Regras Obrigatórias

1. **Cada teste deve ser numerado.**

2. **Cada passo deve conter uma única ação.**
   - Um passo = uma ação.
   - Não combinar múltiplas ações no mesmo passo.

3. **Cada passo deve definir o resultado esperado.**
   - Após cada ação, indicar o que o testador deve observar.

4. **Nenhum passo pode conter múltiplas ações.**

5. **Nenhum passo pode conter comportamento opcional.**
   - Todas as instruções são obrigatórias e sequenciais.

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

Uma nova viagem aparece no mapa. O estado mostra "À procura de motorista" ou "Motorista atribuído".

---

## Linguagem

Usar sempre:

- "Deves fazer X."
- "Deves clicar em X."
- "Deves abrir X."

Não usar:

- "Podes fazer X."
- "Podes tentar X."
- "Poderias fazer X."

Todas as ações são **obrigatórias e sequenciais**.
