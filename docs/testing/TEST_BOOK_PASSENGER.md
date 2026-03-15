# TVDE — Livro de Testes: Passageiro

Cenários de teste para a aplicação passageiro.

---

## Teste 1 — Login (BETA)

**Requisitos:** BETA_MODE=true, backend e frontend a correr.

**Passo 1**

Abre o browser.

**Resultado esperado**

O browser está aberto.

---

**Passo 2**

Navega para:

```
http://localhost:5173/passenger
```

**Resultado esperado**

O ecrã de login aparece. Vês os campos "Telemóvel" e "Password".

---

**Passo 3**

Introduz no campo Telemóvel um número de teste (ex: +351912345678).

**Resultado esperado**

O número aparece no campo.

---

**Passo 4**

Introduz no campo Password:

```
123456
```

**Resultado esperado**

A password aparece no campo (pode estar mascarada).

---

**Passo 5**

Clica no botão "Entrar".

**Resultado esperado**

O dashboard do passageiro aparece. O header mostra "TVDE". Vês o botão "Pedir viagem".

---

## Teste 2 — Criar Viagem

**Requisitos:** Utilizador autenticado (passageiro). Pelo menos um motorista disponível (ou simulador a correr).

**Passo 1**

Confirma que estás no dashboard do passageiro (http://localhost:5173/passenger).

**Resultado esperado**

Vês o botão "Pedir viagem".

---

**Passo 2**

Clica no botão "Pedir viagem".

**Resultado esperado**

O estado muda para "A pedir viagem..." e depois para "À procura de motorista" ou "Motorista atribuído". O mapa mostra a viagem. Uma nova entrada aparece no Log.

---

**Passo 3**

Espera até o estado mudar para "Motorista a caminho" ou "Motorista a chegar".

**Resultado esperado**

O estado atualiza. O mapa pode mostrar a localização do motorista.

---

**Passo 4**

Espera até o estado mudar para "Viagem concluída".

**Resultado esperado**

O estado mostra "Viagem concluída". O botão muda para "Pedir nova viagem". A viagem aparece no histórico.

---

## Teste 3 — Cancelar Viagem

**Requisitos:** Viagem ativa em estado requested, assigned, accepted ou arriving.

**Passo 1**

Cria uma viagem (Teste 2, Passos 1-2).

**Resultado esperado**

A viagem está ativa.

---

**Passo 2**

Antes do motorista concluir, clica no botão "Cancelar".

**Resultado esperado**

O estado muda para "A cancelar..." e depois para "Pronto". A viagem desaparece como ativa. O histórico pode mostrar "Cancelada".

---

## Teste 4 — Ver Histórico

**Requisitos:** Pelo menos uma viagem concluída ou cancelada.

**Passo 1**

Navega para o dashboard do passageiro.

**Resultado esperado**

Vês a secção "Histórico" ou painel com viagens passadas.

---

**Passo 2**

Observa a lista de viagens.

**Resultado esperado**

As viagens concluídas ou canceladas aparecem com estado, origem, destino e preço (se aplicável).
