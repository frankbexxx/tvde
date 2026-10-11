# Auditoria UX humana — âmbito e regras

**Localização:** `docs/audits/ux/2026-10/` · **Tipo:** AUDIT (humano) · **Estado:** REVIEW — execução UX aberta (ver [`11_FINAL_EXECUTION_PLAN.md`](11_FINAL_EXECUTION_PLAN.md)).

Nesta fase original: observar, mapear e registar. Implementação segue plano final.

## Princípio central

Toda a aplicação existe para ser usada por pessoas reais.

## O que conta como existente

Uma funcionalidade só conta se:

- estiver reachable no fluxo real
- estiver visível no papel correcto
- puder ser descoberta sem conhecimento técnico
- puder ser usada sem instruções externas

## O que NÃO conta como prova suficiente

- componente isolado
- endpoint
- teste unitário
- documentação
- feature flag
- código morto
- render condicional nunca atingido

## Nesta auditoria

- não corrigir
- não optimizar
- não refactorizar
- não decidir prioridades
- não criar soluções ainda
- apenas observar, mapear e registar

## Método deste mapa (Prompt 1)

O inventário em `01_GLOBAL_MAP.md` foi lido a partir de rotas, shells, menus, i18n pt e condições de montagem no código em `main`.
Não é uma passagem visual nova em produção.
Onde o código monta o ecrã no shell do papel, fica marcado como reachable no fluxo.
Onde o componente existe e o shell não o mostra, fica em «UI presente, pessoa não chega».
