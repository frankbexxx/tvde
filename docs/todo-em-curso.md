# Em curso — quadro operacional

Vista única para saber sempre o que está em execução, no mesmo formato em todas as sessões.

---

## Agora (foco único)

- [ ] Fechar o último gap funcional do **passageiro** identificado no teste manual (não bloqueador).
- [ ] Validar em device que o botão **ACEITAR** no driver fica visível sem fricção adicional.

---

## Hoje (até fechar a sessão)

- [ ] Revalidar fluxo passageiro C+B completo: pré-visualização -> confirmar -> pedir viagem.
- [ ] Revalidar fluxo crítico driver: aceitar -> iniciar -> terminar.
- [ ] Capturar apenas gaps **S1/S2**; tudo o resto vai para backlog.
- [ ] Fechar com commit/PR dos ajustes do dia e `main` alinhada.

---

## Amanhã (próxima sessão útil)

- [ ] Revisão rápida pós-smoke (10-15 min): confirmar que não há regressões visuais em mobile.
- [ ] Consolidar pequeno passe de densidade visual (light theme) sem redesign.
- [ ] Atualizar docs de estado (este ficheiro + `TODOdoDIA.md`) com o que ficar pendente real.
- [ ] Driver: desenhar/implementar UI explícita de **rejeitar oferta** (feature gap do checklist).
- [ ] Passenger: preparar fluxo UI de **rating pós-viagem** (API já disponível).

---

## Backlog (não bloquear agora)

- Theming/polish amplo de superfície e bordas no light theme.
- Refinos de iconografia/branding não críticos para o fluxo.
- Refactors estruturais sem impacto direto em operação.

---

_Última revisão: 2026-04-28_
