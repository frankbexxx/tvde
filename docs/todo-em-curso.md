# Em curso — velocidade de cruzeiro

Lista curta do que está **ativo agora**. Tudo o que não estiver aqui vai para backlog e não disputa foco.

---

## Estado atual (2026-04-28)

- **Passageiro:** quase fechado; faltam apenas ajustes funcionais residuais (cosmética em pausa).
- **Driver:** próximo bloco principal (abrir mais tarde hoje).
- **Estratégia:** executar por ondas curtas com super-prompts, 1 entrega verificável por vez.

---

## Fio ativo A — Passageiro (fecho funcional)

- [x] Consolidar copy repetida no planeamento unificado (`PassengerDashboard` + `TripPlannerPanel`).
- [ ] Fechar o último gap funcional reportado em teste manual (não bloqueador).
- [ ] Revalidar fluxo completo C+B com mapa: pré-visualização, confirmar, limpar, confirmar viagem.
- [ ] Correr smoke curto mobile no fluxo passageiro após o ajuste final.

**Critério de fecho:** passageiro passa de ponta a ponta sem regressões e sem bloqueadores de operação.

---

## Fio ativo B — Driver (arranque após A)

- [x] Abrir sessão dedicada de driver com super-prompt focada (sem redesign visual).
- [x] Evitar estado confuso sem detalhe polled: mostrar "A sincronizar estado…" em vez de CTA bloqueada.
- [ ] Validar percurso aceite → chegada → iniciar → terminar no device.
- [ ] Capturar apenas gaps S1/S2 de operação; resto entra em backlog.

**Critério de fecho:** driver operacional para piloto sem bloqueio no fluxo crítico.

---

## Fio ativo C — Prompts operacionais

- [x] Criar pack de prompts de execução rápida para ondas/super-prompts.
- [ ] Aplicar prompts por ordem curta: alinhamento -> execução -> verificação -> commit/PR.
- [ ] Atualizar TODOs no fim de cada sessão com estado real (sem texto histórico longo).

Documento base: [`prompts/CRUISE_PROMPTS_2026-04-28.md`](prompts/CRUISE_PROMPTS_2026-04-28.md).

---

## Fora de foco (por agora)

- Theming, branding fino, ícones e outros polishes não bloqueadores.
- Refactors largos sem impacto direto no fluxo crítico.
- Iniciativas novas fora de passageiro/driver/smoke operacional.

---

_Última revisão: 2026-04-28_
