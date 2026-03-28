# TVDE — Livro de Testes: Passageiro

Cenários de teste para a aplicação passageiro.

## PRE-TEST REQUIREMENT

Verification checklist completed:

- VER-001 ✔
- VER-002 ✔
- VER-003 ✔
- VER-004 ✔
- VER-005 ✔

Se alguma não estiver marcada, executa `docs/testing/PRE_TEST_VERIFICATION.md` primeiro. PARA até concluíres.

**Em caso de falha:** Segue `docs/testing/TEST_FAILURE_PROTOCOL.md`. Para imediatamente. Regista Test ID, Passo, Esperado, Observado.

---

## TEST-P-001 — Login (BETA)

**Requisitos:** Verificação pré-teste aprovada. BETA_MODE=true.

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

O ecrã de login aparece. Confirma que os campos "Telemóvel" e "Password" estão visíveis.

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

O dashboard do passageiro aparece dentro de **10 segundos**. Confirma que o header mostra "TVDE" e que o botão "Pedir viagem" está visível. Se não aparecer em 10 segundos, marcar como **FAILED**.

---

## TEST-P-002 — Criar Viagem

**Requisitos:** Utilizador autenticado (passageiro). Pelo menos um motorista disponível (ou simulador a correr).

**Passo 1**

Confirma que estás no dashboard do passageiro.

Navega para:

```
http://localhost:5173/passenger
```

**Resultado esperado**

O botão "Pedir viagem" está visível. Se não estiver, marcar como **FAILED**.

---

**Passo 2**

Clica no botão "Pedir viagem".

**Resultado esperado**

O estado muda para "A pedir viagem..." e depois, dentro de **30 segundos**, para "À procura de motorista" ou "Motorista atribuído". O mapa mostra a viagem. Uma nova entrada aparece no Log. Se após 30 segundos o estado não mostrar "À procura de motorista" ou "Motorista atribuído", marcar como **FAILED**.

---

**Passo 3**

Espera até **30 segundos** para o estado mudar para "Motorista a caminho" ou "Motorista a chegar".

**Resultado esperado**

O estado atualiza para "Motorista a caminho" ou "Motorista a chegar". O mapa pode mostrar a localização do motorista. Se não mudar em 30 segundos, marcar como **FAILED**.

---

**Passo 4**

Espera até **30 segundos** para o estado mudar para "Viagem concluída".

**Resultado esperado**

O estado mostra "Viagem concluída". O botão muda para "Pedir nova viagem". A viagem aparece no histórico. Se não mudar em 30 segundos, marcar como **FAILED**.

---

## TEST-P-003 — Cancelar Viagem

**Requisitos:** Viagem ativa em estado requested, assigned, accepted ou arriving.

**Passo 1**

Cria uma viagem (TEST-P-002, Passos 1-2).

**Resultado esperado**

A viagem está ativa. O estado mostra "À procura de motorista", "Motorista atribuído", "Motorista a caminho" ou "Motorista a chegar". Se não, marcar como **FAILED**.

---

**Passo 2**

Antes do motorista concluir, clica no botão "Cancelar".

**Resultado esperado**

O estado muda para "A cancelar..." e depois, dentro de **15 segundos**, para "Pronto". A viagem desaparece como ativa. O histórico pode mostrar "Cancelada". Se não mudar em 15 segundos, marcar como **FAILED**.

---

## TEST-P-004 — Ver Histórico

**Requisitos:** Pelo menos uma viagem concluída ou cancelada.

**Passo 1**

Navega para o dashboard do passageiro:

```
http://localhost:5173/passenger
```

**Resultado esperado**

A seção "Histórico" ou painel com viagens passadas está visível.

---

**Passo 2**

Confirma que a lista de viagens mostra pelo menos uma entrada.

**Resultado esperado**

As viagens concluídas ou canceladas aparecem com estado, origem, destino e preço (se aplicável). Regista o número de viagens visíveis. Se a lista estiver vazia e sabes que existe pelo menos uma viagem concluída, marcar como **FAILED**.
