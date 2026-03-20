A014_UX_POLISH

OBJETIVO:
Melhorar a perceção do sistema pelo utilizador,
sem alterar lógica de negócio.

Foco: clareza de estados, feedback visual e fluidez.

---

CONTEXTO:

Backend está funcional.
Frontend já trata corretamente 404/409.
Problema atual: UX não comunica bem o estado real da trip.

---

PARTE 1 — ESTADOS VISUAIS CLAROS

Mapear explicitamente estados da trip:

requested → "À procura de motorista"
assigned → "Motorista atribuído"
accepted → "Motorista a caminho"
arriving → "A chegar"
ongoing → "Viagem em curso"
completed → "Viagem concluída"

---

IMPLEMENTAR:

1) Banner/label visível no topo
2) Cor + texto distintos por estado
3) NUNCA depender só de logs internos

---

PARTE 2 — LOADING VS WAITING

PROBLEMA:
Sistema parece "parado" quando está a funcionar.

---

IMPLEMENTAR:

- loading (spinner curto) → pedido inicial
- waiting (estado estável) → "À procura de motorista"

---

NÃO misturar os dois

---

PARTE 3 — DRIVER INFO PROGRESSIVO

Quando houver driver:

Mostrar progressivamente:

1) assigned:
   - "Motorista encontrado"
   - (sem localização ainda)

2) accepted:
   - nome driver
   - veículo

3) arriving/ongoing:
   - mapa + posição

---

PARTE 4 — MAPA INTELIGENTE

PROBLEMA:
Mapa aparece cedo demais ou sem contexto

---

REGRAS:

- NÃO mostrar mapa em requested
- mostrar placeholder: "A procurar motorista"
- só mostrar mapa quando houver driver + localização

---

PARTE 5 — TRANSIÇÕES SUAVES

Adicionar:

- fade entre estados
- evitar mudanças bruscas de UI

---

PARTE 6 — ERROS (AJUSTE FINAL)

Garantir:

- 404/409 → nunca erro visual
- 500/network → mensagem clara

---

PARTE 7 — MICROCOPY (IMPORTANTE)

Substituir mensagens vagas por claras:

❌ "Erro"
✔ "Ainda à procura de motorista"
✔ "Motorista atribuído"

---

RESTRIÇÕES:

❌ NÃO alterar backend
❌ NÃO alterar contratos
❌ NÃO adicionar complexidade desnecessária
❌ NÃO refatorar componentes grandes

---

CRITÉRIO DE SUCESSO:

- utilizador percebe sempre o estado
- zero momentos de confusão
- UI consistente com logs/backend
- fluxo parece "vivo", não "bloqueado"

---

JUSTIFICAÇÃO (OBRIGATÓRIO):

Explicar:

1) quais eram os pontos de confusão UX
2) como cada alteração melhora percepção
3) porque não altera comportamento do sistema

---

## Implementado (resumo)

1. **Pontos de confusão:** `assigned` sem GPS caía em “à procura”; o pedido inicial partilhava cópia com o estado de espera; o mapa aparecia em `requested` com rota; mensagens de erro genéricas.
2. **Alterações:** banner unificado (`passengerBanner.ts`) com labels A014; `MapView` com `showMap` / placeholder; cartão com envio (spinner curto) vs espera (sem spinner); microcopy por `requested`/`assigned`/`accepted`/…; `TripCard` com blocos Motorista / Veículo TVDE (texto fixo — API ainda não expõe nome/matrícula).
3. **Negócio:** sem mudanças em backend, contratos ou fluxos; apenas derivados de UI e cópia a partir dos mesmos `TripStatus` e polling existentes.
