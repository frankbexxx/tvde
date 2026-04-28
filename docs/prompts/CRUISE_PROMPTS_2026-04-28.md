# Cruise prompts — ondas e super-prompts (2026-04-28)

Pack curto para executar rápido, com foco em lógica/fluxo e sem dispersar em cosmética.

---

## Regras fixas (colar em todas as sessões)

```text
Modo de execução: velocidade de cruzeiro.
Objetivo: fechar fluxo funcional com diffs pequenos e verificáveis.
Não fazer redesign visual nem refactor largo.
Se houver trade-off, priorizar comportamento correto e legibilidade mínima.
No fim: testes/validação rápida + lista de ficheiros alterados + próximo passo.
```

---

## Prompt 1 — Alinhamento e TODOs (pré-execução)

```text
Lê o estado atual do repositório e atualiza os TODOs ativos para refletirem apenas o trabalho em curso real.

Regras:
- manter lista curta (máximo 3 fios ativos)
- marcar como feito o que já está merged
- mover cosmética para "fora de foco"
- manter linguagem direta e operacional

Output:
1) ficheiros .md alterados
2) resumo do que ficou como prioridade
3) checklist de execução da sessão
```

---

## Prompt 2 — Passageiro, fecho funcional (sem cosmética)

```text
Fechar o fluxo do passageiro com foco funcional, sem redesign.

Objetivo:
- eliminar o último gap funcional reportado em teste manual
- manter o fluxo C+B estável (pré-visualização -> confirmação -> pedido)

Restrições:
- alterações mínimas, localizadas
- sem mexer em backend/contratos API
- copy apenas se necessário para remover ambiguidade funcional

Validação:
- executar build/testes relevantes
- descrever cenário manual de verificação ponta a ponta
```

---

## Prompt 3 — Driver, arranque controlado

```text
Abrir bloco driver após fecho do passageiro.

Objetivo:
- validar e ajustar apenas fluxo crítico:
  aceitar -> chegar -> iniciar -> terminar

Restrições:
- sem features novas fora do fluxo crítico
- sem polimento visual extra
- recolher somente gaps S1/S2

Validação:
- smoke curto em device ou simulação equivalente
- lista de riscos residuais e impacto operacional
```

---

## Prompt 4 — Super-prompt de execução por onda

```text
Executa esta sessão em 4 passos e para no fim de cada passo com evidência:

1) Contexto mínimo: estado atual + objetivo único da sessão
2) Implementação pequena: apenas o necessário para fechar esse objetivo
3) Verificação: build/testes/smoke relevante
4) Fecho: atualizar TODO, preparar commit/PR, indicar próximo passo

Critério de qualidade:
- cada sessão fecha uma unidade verificável
- sem abrir segundo fio antes de fechar o primeiro
```

---

## Prompt 5 — Fecho rápido de sessão

```text
Antes de encerrar:
- atualizar TODOs (em curso + fora de foco)
- confirmar o que ficou pendente e porquê
- propor próximo arranque em 3 bullets

Se houve código:
- validar estado git
- preparar mensagem de commit alinhada ao que mudou
- sugerir PR com resumo objetivo
```

---

## Ordem recomendada hoje

1. Prompt 1 (limpeza de TODOs)
2. Prompt 2 (fecho passageiro)
3. Prompt 5 (fecho)
4. Mais tarde: Prompt 3 (driver)

