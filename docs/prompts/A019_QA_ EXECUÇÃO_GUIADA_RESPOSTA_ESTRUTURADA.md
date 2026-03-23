# A019 — QA EXECUÇÃO GUIADA (RESPOSTA ESTRUTURADA)

## 🎯 OBJETIVO

Executar testes de forma determinística e reportar resultados sem ambiguidade.

IMPORTANTE:

- NÃO saltar passos
- NÃO assumir comportamento
- OBSERVAR e REGISTAR
- copiar exatamente este formato na resposta

---

## ⚙️ 0. CONTEXTO INICIAL (PREENCHER)

Ambiente:

- Frontend: (ex: Vite local / build / produção)
- Backend: (Render / local)
- Dispositivo: (PC / mobile)
- Browser: (Chrome / etc)
- Login feito: (SIM / NÃO)

Estado inicial:

- Já existe viagem ativa? (SIM / NÃO)
- Console limpa? (SIM / NÃO)

---

## 🧪 TESTE 1 — ENTRADA

### Ação 1

- abrir aplicação
- não clicar em nada durante 5 segundos

### Observação obrigatória 1

- o que aparece no ecrã?
- há instruções claras?
- há pressão para ação imediata?

### Resposta (preencher)

✔ OK:

-  

❌ Problemas:

-  

🤨 Dúvidas:

-  

---

## 🧪 TESTE 2 — PICKUP

### Ação 2

- clicar 1 vez no mapa

### Observação obrigatória 2

- estado muda?
- aparece morada?
- quanto tempo demora?

### Medição (aproximada) 2

- tempo até morada: ___ segundos

### Resposta

✔ OK:

-  

❌ Problemas:

-  

🤨 Dúvidas:

-  

---

## 🧪 TESTE 3 — DROPOFF

### Ação 3

- clicar num segundo ponto diferente

### Observação obrigatória 3

- UI muda para confirmação?
- aparecem:
  - origem
  - destino
  - distância
  - tempo

### Resposta 3

✔ OK:

-  

❌ Problemas:

-  

🤨 Dúvidas:

-  

---

## 🧪 TESTE 4 — CONFIRMAR VIAGEM

### Ação 4

- clicar "Confirmar viagem"

### Observação obrigatória 4

- o que acontece IMEDIATAMENTE após clique?
- há loading?
- há mudança de estado?

### Console (IMPORTANTE) 4

- abrir DevTools → Network
- verificar chamada createTrip

### Resposta 4

✔ OK:

- createTrip só aqui? (SIM / NÃO)
- estado mudou para searching? (SIM / NÃO)

❌ Problemas:

-  

🤨 Dúvidas:

-  

---

## 🧪 TESTE 5 — MATCH / TRANSIÇÃO

### Ação 5

- aguardar driver aceitar

### Observação obrigatória 5

- há flicker?
- aparecem estados duplicados?
- há mensagens conflitantes?

### Resposta 5

✔ OK:

-  

❌ Problemas:

-  

🤨 Dúvidas:

-  

---

## 🧪 TESTE 6 — VIAGEM EM CURSO

### Ação 6

- observar durante 5–10 segundos

### Observação obrigatória 6

- quantos blocos "Viagem em curso" existem?
- UI limpa ou duplicada?

### Resposta 6

✔ OK:

- nº de blocos: ___

❌ Problemas:

-  

🤨 Dúvidas:

-  

---

## 🧪 TESTE 7 — INTERAÇÃO DURANTE VIAGEM

### Ação 7

- tentar clicar no mapa

### Observação obrigatória 7

- permite interação?
- comportamento correto?

### Resposta 7

✔ OK:

-  

❌ Problemas:

-  

🤨 Dúvidas:

-  

---

## 🧪 TESTE 8 — CONCLUSÃO

### Ação 8

- esperar fim da viagem

### Observação obrigatória 8

- o que aparece?
- texto faz sentido?
- informação consistente?

### Resposta 8

✔ OK:

-  

❌ Problemas:

-  

🤨 Dúvidas:

-  

---

## 🧪 TESTE 9 — RESET

### Ação 9

- clicar "Repor" (se disponível)
OU
- iniciar nova viagem

### Observação obrigatória 9

- tudo foi limpo?

Checklist:

- markers → limpos? (SIM / NÃO)
- rota → limpa? (SIM / NÃO)
- moradas → limpas? (SIM / NÃO)
- estado → idle? (SIM / NÃO)

### Resposta 9

✔ OK:

-  

❌ Problemas:

-  

🤨 Dúvidas:

-  

---

## 🧪 TESTE 10 — GEOCODING STRESS

### Ação 10

- clicar rapidamente 3–5 pontos diferentes

### Observação obrigatória 10

- moradas ficam corretas?
- há trocas?

### Resposta 10

✔ OK:

-  

❌ Problemas:

-  

🤨 Dúvidas:

-  

---

## 🧪 TESTE 11 — NETWORK / CONSOLE

### Ação 11

- abrir DevTools → Console + Network

### Observação obrigatória 11

- erros 404?
- erros 409?
- frequência?

### Resposta 11

✔ OK:

-  

❌ Problemas:

-  

🤨 Dúvidas:

-  

---

## 🧠 AVALIAÇÃO FINAL (OBRIGATÓRIO)

Responder sem pensar demasiado:

1. Isto parece uma app real (0–10)?
2. Alguma parte te confundiu?
3. Alguma parte te irritou?
4. Sentiste controlo ou caos?

---

## 🔚 NOTAS LIVRES

Qualquer coisa que não encaixou nos testes:

-
-
-
