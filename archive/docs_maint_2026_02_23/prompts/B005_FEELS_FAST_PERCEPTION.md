# B005 — Camada de Percepção de Velocidade (FEELS FAST)

Aplicar camada de "percepção de velocidade" sem alterar lógica backend.

## 1. Feedback imediato (optimistic UI)
- Pedir viagem / Aceitar / Concluir → atualizar UI imediatamente
- Botão loading instantâneo, mostrar SEARCHING sem esperar API

## 2. Botões — loading visual
- Spinner dentro do botão quando loading
- Disabled durante request
- Texto "A processar..."

## 3. SEARCHING — progresso
- Texto dinâmico rotativo (2–3s): "A procurar motoristas próximos...", "A verificar disponibilidade...", "A contactar motoristas..."

## 4. Transição de estados
- Fade suave (opacity)
- Nunca trocar conteúdo instantaneamente

## 5. Mapa — micro-movimento
- SEARCHING: zoom inicial
- ASSIGNED: pan suave para driver (easeTo 600–800ms)

## 6. Anti-flicker
- Estado mínimo visível: ~400ms

## 7. Empty states
- Sempre texto + contexto

## 8. Toast / feedback
- "Viagem aceite", "Viagem concluída" → toast rápido

## Critério de sucesso
- App parece rápida mesmo com polling
- Utilizador sente progresso contínuo
- Zero momentos "mortos"
