# A019 — QA EXECUÇÃO RÍGIDA

## 🎯 OBJETIVO

Executar QA sem ambiguidade, com decisões binárias (SIM / NÃO).

REGRAS:

- NÃO interpretar
- NÃO assumir
- NÃO saltar passos
- responder SEMPRE com SIM / NÃO + detalhe

---

## ⚙️ 0. ESTADO DO SISTEMA (OBRIGATÓRIO)

Preencher antes de começar:

### Infra

- Docker Desktop ligado → NÃO
- PostgreSQL local ligado → NÃO
- Backend local ligado → NÃO
- Backend Render → SIM

### Frontend

- Vite dev server → SIM
- Build produção → NÃO

### Env

- VITE_API_URL → Render → SIM
- VITE_MAPTILER_KEY → definida → SIM

### Sessão

- Login feito → SIM
- Token válido → SIM

### Estado inicial

- Existe viagem ativa → NÃO
- Console limpa → SIM

SE ALGUM "NÃO" FOR INESPERADO → PARAR

---

## 🧪 TESTE 1 — ENTRADA

### Ação

- abrir app
- esperar 5 segundos
- NÃO interagir

### Perguntas (responder SIM/NÃO)

- UI compreensível sem ação? →
- Existe call-to-action claro? →
- Utilizador sabe o que fazer? →

### Problemas (se houver)

-

---

## 🧪 TESTE 2 — PICKUP

### Ação

- clicar 1x no mapa

### Medição

- contar tempo até morada aparecer

### Perguntas

- Estado mudou para planning? →
- Morada apareceu? →
- Morada correta? →
- Tempo < 2s? →

### Problemas

-

---

## 🧪 TESTE 3 — DROPOFF

### Ação

- clicar segundo ponto

### Perguntas

- Estado mudou para confirming? →
- Origem visível? →
- Destino visível? →
- Distância visível? →
- Tempo visível? →

### Problemas

-

---

## 🧪 TESTE 4 — CONFIRMAR

### Ação

- abrir DevTools → Network
- clicar "Confirmar viagem"

### Perguntas

- createTrip chamado APENAS agora? →
- Estado mudou para searching? →
- Existe loading visível? →

### Problemas

-

---

## 🧪 TESTE 5 — MATCH

### Ação

- esperar driver aceitar

### Perguntas

- Transição direta para in_trip? →
- Estados duplicados visíveis? →
- Flicker visível? →

### Problemas

-

---

## 🧪 TESTE 6 — VIAGEM EM CURSO

### Ação

- observar 10 segundos

### Perguntas

- Apenas 1 bloco "Viagem em curso"? →
- UI limpa (sem duplicação)? →

### Problemas

-

---

## 🧪 TESTE 7 — INTERAÇÃO BLOQUEADA

### Ação

- clicar no mapa durante viagem

### Perguntas

- Interação bloqueada? →
- Comportamento consistente? →

### Problemas

-

---

## 🧪 TESTE 8 — CONCLUSÃO

### Ação

- esperar fim da viagem

### Perguntas

- Mensagem coerente? →
- Moradas corretas (não só cidade)? →
- UI consistente? →

### Problemas

-

---

## 🧪 TESTE 9 — RESET

### Ação

- clicar "Repor" OU nova viagem

### Perguntas

- Markers limpos? →
- Rota limpa? →
- Moradas limpas? →
- Estado = idle? →

### Problemas

-

---

## 🧪 TESTE 10 — GEOCODING STRESS

### Ação

- clicar 5 pontos rapidamente

### Perguntas

- Morada final correta? →
- Sem trocas? →

### Problemas

-

---

## 🧪 TESTE 11 — NETWORK

### Ação

- abrir Console + Network

### Perguntas

- Erros constantes (>5)? →
- Impactam UX? →

### Problemas

-

---

## 🧠 AVALIAÇÃO FINAL

Responder direto:

- Parece app real (0–10):
- Confuso? (SIM/NÃO):
- Irritante? (SIM/NÃO):
- Controlo? (SIM/NÃO):

---

## 🔚 NOTAS LIVRES

-
-
-
