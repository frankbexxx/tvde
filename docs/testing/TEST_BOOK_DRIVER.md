# TVDE — Livro de Testes: Motorista

Cenários de teste para a aplicação motorista.

**Pré-requisito obrigatório:** Verificação concluída em `docs/testing/PRE_TEST_VERIFICATION.md`. Se não concluíste, PARA e executa primeiro.

**Em caso de falha:** Segue `docs/testing/TEST_FAILURE_PROTOCOL.md`. Para imediatamente. Regista Test ID, Passo, Esperado, Observado.

---

## TEST-D-001 — Login Motorista (BETA)

**Requisitos:** Verificação pré-teste aprovada. BETA_MODE=true. Conta de motorista aprovada.

**Passo 1**

Abre o browser.

**Resultado esperado**

O browser está aberto.

---

**Passo 2**

Navega para:

```
http://localhost:5173/driver
```

**Resultado esperado**

O ecrã de login aparece. Confirma que os campos "Telemóvel" e "Password" estão visíveis.

---

**Passo 3**

Introduz o telemóvel do motorista de teste no campo Telemóvel.

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

O dashboard do motorista aparece dentro de **10 segundos**. Confirma que vês "Viagens disponíveis" ou lista vazia. Se não aparecer em 10 segundos, marcar como **FAILED**.

---

## TEST-D-002 — Aceitar Viagem

**Requisitos:** Motorista autenticado. Pelo menos uma viagem em estado "assigned" (no pool de disponíveis).

**Passo 1**

Confirma que estás no dashboard do motorista:

```
http://localhost:5173/driver
```

**Resultado esperado**

A secção de viagens disponíveis está visível.

---

**Passo 2**

Espera até **30 segundos** para aparecer uma viagem na lista.

(Cria uma viagem como passageiro noutro dispositivo ou browser se necessário.)

**Resultado esperado**

Uma viagem aparece com botão para aceitar. Se não aparecer em 30 segundos, marcar como **FAILED**.

---

**Passo 3**

Clica no botão para aceitar a viagem.

**Resultado esperado**

A viagem passa a "ativa" dentro de **10 segundos**. O estado mostra "Motorista a caminho" ou similar. A viagem desaparece da lista de disponíveis. Se não mudar em 10 segundos, marcar como **FAILED**.

---

## TEST-D-003 — Ciclo de Vida da Viagem

**Requisitos:** Motorista com viagem aceite.

**Passo 1**

Aceita uma viagem (TEST-D-002).

**Resultado esperado**

A viagem está ativa. O estado mostra "Motorista a caminho" ou "A caminho".

---

**Passo 2**

Clica no botão "Cheguei".

**Resultado esperado**

O estado muda para "A chegar" ou "Motorista a chegar" dentro de **10 segundos**. Se não mudar em 10 segundos, marcar como **FAILED**.

---

**Passo 3**

Clica no botão "Iniciar viagem".

**Resultado esperado**

O estado muda para "Em viagem" dentro de **10 segundos**. Se não mudar em 10 segundos, marcar como **FAILED**.

---

**Passo 4**

Clica no botão "Concluir viagem".

**Resultado esperado**

O estado muda para "Viagem concluída" dentro de **10 segundos**. A viagem aparece no histórico. O motorista fica disponível para novas viagens. Se não mudar em 10 segundos, marcar como **FAILED**.

---

## TEST-D-004 — Ver Histórico do Motorista

**Requisitos:** Pelo menos uma viagem concluída pelo motorista.

**Passo 1**

Navega para o dashboard do motorista:

```
http://localhost:5173/driver
```

**Resultado esperado**

A secção "Histórico" está visível.

---

**Passo 2**

Confirma que a lista de viagens mostra pelo menos uma entrada concluída.

**Resultado esperado**

As viagens concluídas aparecem com detalhes (estado, origem, destino, etc.). Regista o número de viagens visíveis. Se a lista estiver vazia e sabes que existe pelo menos uma viagem concluída, marcar como **FAILED**.
