# TVDE — Livro de Testes: Motorista

Cenários de teste para a aplicação motorista.

---

## Teste 1 — Login Motorista (BETA)

**Requisitos:** BETA_MODE=true, conta de motorista aprovada.

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

O ecrã de login aparece.

---

**Passo 3**

Introduz o telemóvel do motorista de teste.

**Resultado esperado**

O número aparece no campo.

---

**Passo 4**

Introduz a password:

```
123456
```

**Resultado esperado**

A password aparece no campo.

---

**Passo 5**

Clica no botão "Entrar".

**Resultado esperado**

O dashboard do motorista aparece. Vês "Viagens disponíveis" ou lista vazia.

---

## Teste 2 — Aceitar Viagem

**Requisitos:** Motorista autenticado. Pelo menos uma viagem em estado "assigned" (no pool de disponíveis).

**Passo 1**

Confirma que estás no dashboard do motorista.

**Resultado esperado**

Vês a secção de viagens disponíveis.

---

**Passo 2**

Espera até aparecer uma viagem na lista (ou cria uma como passageiro noutro dispositivo).

**Resultado esperado**

Uma viagem aparece com botão para aceitar.

---

**Passo 3**

Clica no botão para aceitar a viagem.

**Resultado esperado**

A viagem passa a "ativa". O estado mostra "Motorista a caminho" ou similar. A viagem desaparece da lista de disponíveis.

---

## Teste 3 — Ciclo de Vida da Viagem

**Requisitos:** Motorista com viagem aceite.

**Passo 1**

Aceita uma viagem (Teste 2).

**Resultado esperado**

A viagem está ativa.

---

**Passo 2**

Clica no botão "Cheguei".

**Resultado esperado**

O estado muda para "A chegar" ou "Motorista a chegar".

---

**Passo 3**

Clica no botão "Iniciar viagem".

**Resultado esperado**

O estado muda para "Em viagem".

---

**Passo 4**

Clica no botão "Concluir".

**Resultado esperado**

O estado muda para "Viagem concluída". A viagem aparece no histórico. O motorista fica disponível para novas viagens.

---

## Teste 4 — Ver Histórico do Motorista

**Requisitos:** Pelo menos uma viagem concluída pelo motorista.

**Passo 1**

Navega para o dashboard do motorista.

**Resultado esperado**

Vês a secção "Histórico".

---

**Passo 2**

Observa a lista de viagens.

**Resultado esperado**

As viagens concluídas aparecem com detalhes.
