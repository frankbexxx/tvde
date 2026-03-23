# A021 — VISUAL SYSTEM (REFINAMENTO UX)

## 🎯 OBJETIVO

Transformar o sistema visual atual (funcional) num sistema consistente, previsível e com hierarquia clara.

IMPORTANTE:

- NÃO alterar lógica de negócio
- NÃO alterar backend
- NÃO introduzir novas libs
- NÃO fazer redesign completo
- APENAS ajustar hierarquia, contraste e comportamento visual

---

## 🔴 PROBLEMAS IDENTIFICADOS

1. Foco visual inconsistente entre estados
2. Competição entre StatusHeader e TripPlannerPanel
3. Baixa legibilidade (text-muted + bg-muted/50)
4. Excesso de informação no planning
5. Papel do mapa dominante sem ser intencional
6. Transições de estado sem continuidade visual

---

## ✅ PRINCÍPIOS (OBRIGATÓRIO SEGUIR)

1. Um único foco por estado
2. Informação crítica sempre visível sem esforço
3. Contraste > estética
4. Continuidade entre estados (sem saltos bruscos)
5. Mapa = suporte, não foco principal

---

## 🧩 1. FOCO VISUAL POR ESTADO

### Definir foco único por estado:

idle:

- foco → TripPlannerPanel

planning:

- foco → MapView (input de ação)

confirming:

- foco → TripPlannerPanel

searching:

- foco → StatusHeader

in_trip:

- foco → StatusHeader

### Implementação:

- reduzir destaque de elementos não focais:
  - opacity (ex: opacity-80)
  - remover sombras fortes
- aumentar destaque do foco:
  - contraste
  - peso de fonte
  - sombra leve

---

## 🧭 2. REDUZIR COMPETIÇÃO VISUAL

Problema:

- StatusHeader e TripPlannerPanel competem

### Solução:

Quando TripPlannerPanel é foco:

- StatusHeader:
  - reduzir peso visual
  - usar variante mais neutra (muted)

Quando StatusHeader é foco:

- TripPlannerPanel:
  - reduzir contraste
  - menos destaque

---

## 🎨 3. CORREÇÃO DE CONTRASTE

Problema:

- text-muted-foreground em bg-muted/50 é pouco legível

### Regras:

- substituir:
  text-muted-foreground
  por:
  text-foreground/80 (ou equivalente mais visível)

- evitar:
  bg-muted/50 com texto fraco

- garantir:
  texto crítico = contraste alto

---

## 🧱 4. LIMPEZA DO TRIPPLANNER (PLANNING)

Problema:

- excesso de labels / ruído

### Solução:

- reduzir texto redundante
- agrupar informação:

ANTES:
"Pickup"
"Rua X"
"Dropoff"
"Rua Y"

DEPOIS:
Rua X → Rua Y

- manter apenas informação essencial visível

---

## 🗺️ 5. PAPEL DO MAPA

Problema:

- mapa domina sem intenção

### Regras:

- planning:
  mapa ativo (normal)

- confirming / searching / in_trip:
  reduzir impacto visual:
  - ligeira redução de contraste (ex: overlay leve)
  - não alterar funcionalidade

---

## 📐 6. DENSIDADE E ESPAÇAMENTO

### Regras:

- padding consistente:
  usar padrão (ex: px-4 py-4)

- evitar:
  mais de 3 linhas por bloco principal

- garantir:
  leitura rápida sem scroll

---

## 🔤 7. TIPOGRAFIA FUNCIONAL

Definir:

- informação principal:
  font-medium / font-semibold

- meta (km/min):
  text-sm + contraste médio

- labels:
  minimizar ou remover

---

## 🔄 8. TRANSIÇÕES ENTRE ESTADOS

Problema:

- mudanças bruscas

### Solução:

- aplicar transições leves:
  - opacity
  - background

- evitar:
  mudanças instantâneas de destaque

---

## 🎯 9. CONSISTÊNCIA DE COMPONENTES

### Regras:

- usar sempre:
  rounded-2xl para cards principais

- evitar mistura de:
  rounded-md / lg / 2xl sem critério

- sombras:
  shadow-card → padrão
  shadow-floating → apenas CTA

---

## 📱 10. MOBILE FIRST

### Regras:

- evitar texto pequeno com baixo contraste
- garantir:
  leitura sem zoom

---

## 🚫 NÃO FAZER

- não redesenhar layout completo
- não mudar estrutura de componentes
- não adicionar novas dependências
- não mexer em lógica de estados

---

## 🧪 TESTES APÓS IMPLEMENTAÇÃO

1. cada estado tem 1 foco claro
2. leitura sem esforço
3. sem competição visual
4. sem necessidade de zoom
5. transições suaves

---

## ✅ DEFINIÇÃO DE SUCESSO

- utilizador percebe imediatamente o que fazer
- UI não “luta consigo própria”
- informação crítica é evidente
- experiência consistente entre estados
