# A019 — UX REAL (Uber-like) — FRONTEND ONLY

## 🎯 OBJETIVO

Transformar o sistema atual (funcional) numa UX utilizável e intuitiva.

IMPORTANTE:
- NÃO mexer no backend
- NÃO alterar contratos de API
- NÃO reimplementar lógica existente
- Trabalhar APENAS na camada de UX / estado frontend

---

## 🧠 CONTEXTO

Já temos:

✔ seleção de pickup/dropoff no mapa  
✔ routing (OSRM)  
✔ criação real de viagem  
✔ tracking funcional  
✔ estados base (idle / planning / active)

Problema:
👉 UX ainda é "técnica", não natural para utilizador real

---

## 🔴 OBJETIVO PRINCIPAL

Introduzir UX semelhante à Uber:

- utilizador abre app → NÃO é forçado a clicar logo no mapa
- vê uma interface clara
- pode escolher destino primeiro (opcional)
- confirma antes de pedir viagem
- vê moradas (não só coordenadas)

---

## 🧩 FEATURES A IMPLEMENTAR

---

### 1. 📍 REVERSE GEOCODING (MapTiler)

Objetivo:
Converter coordenadas → morada legível

#### Requisitos:

Criar função:

    async function reverseGeocode(lng: number, lat: number): Promise<string>

Usar API MapTiler Geocoding:

    https://api.maptiler.com/geocoding/{lng},{lat}.json?key=API_KEY

Retornar:
- features[0].place_name (com fallback seguro)

Tratar erros:
- fallback: "Local selecionado"

#### Uso:

- Quando pickup definido → mostrar morada
- Quando dropoff definido → mostrar morada

---

### 2. 🧭 NOVO FLUXO DE ESTADOS UX

Substituir/organizar estados:

    type UIState =
      | "idle"
      | "planning"
      | "confirming"
      | "searching"
      | "in_trip"

#### Regras:

idle:
- app aberta
- sem ação obrigatória

planning:
- utilizador já escolheu pickup ou começou interação

confirming:
- pickup + dropoff definidos
- antes de chamar createTrip

searching:
- após createTrip
- à espera de driver

in_trip:
- driver aceitou

---

### 3. 🎛️ PAINEL INFERIOR (BOTTOM PANEL)

Criar componente novo:

    <TripPlannerPanel />

Conteúdo dinâmico por estado:

#### Estado: idle

- input visual:
  - "Para onde vais?"
- botão opcional:
  - "Escolher no mapa"

---

#### Estado: planning

- mostrar:
  - pickup address
  - dropoff address (se existir)

- botões:
  - "Definir destino" (se ainda não houver)
  - "Repor"

---

#### Estado: confirming

- mostrar:
  - pickup address
  - dropoff address
  - distância / ETA (via OSRM)

- botão principal:
  - "Confirmar viagem"

---

#### Estado: searching

- loading UI:
  - "À procura de motorista..."

---

#### Estado: in_trip

- info da viagem (já existente)

---

### 4. ⚠️ CONFIRMAÇÃO ANTES DE CRIAR VIAGEM

ALTERAÇÃO CRÍTICA:

createTrip() NÃO deve ser chamado automaticamente

Novo fluxo:

1. user define pickup
2. user define dropoff
3. UI muda para "confirming"
4. user clica "Confirmar viagem"
5. só aí chamar createTrip()

---

### 5. 🧼 LIMPEZA DE INTERAÇÕES

Clique no mapa:

- se não há pickup → define pickup
- se há pickup e não há dropoff → define dropoff
- se já há ambos → atualizar dropoff

Botão "Repor":

- limpa:
  - pickup
  - dropoff
  - route
- estado → idle

---

### 6. 🧱 ORGANIZAÇÃO

MapView:
- só renderiza
- NÃO decide estado

PassengerDashboard:
- controla estado global
- chama APIs
- gere fluxo

---

### 7. 🚫 NÃO FAZER

- não alterar endpoints
- não mexer em pricing
- não mexer em driver logic
- não adicionar libs pesadas
- não complicar estado

---

## ✅ DEFINIÇÃO DE SUCESSO

- app abre sem obrigar clique no mapa
- utilizador percebe o que fazer
- moradas visíveis (não coords)
- confirmação antes de pedir
- fluxo claro e previsível

---

## 🧪 TESTES MANUAIS

1. abrir app → ver UI clara
2. selecionar pickup
3. selecionar destino
4. ver moradas
5. clicar "Confirmar viagem"
6. driver flow continua igual

---

## ⚡ NOTAS FINAIS

- manter código simples
- preferir clareza a abstração
- evitar estados implícitos
- cada estado deve ser explícito

Se houver dúvida:
→ escolher a solução mais simples e previsível
