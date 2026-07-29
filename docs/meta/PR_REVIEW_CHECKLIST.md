# Checklist de revisão manual de PRs — TVDE

Substitui Bugbot / Cloud Agents / automações automáticas. Revisão humana, curta, antes do merge.

**Não usar:** Bugbot, Cloud Agents, Security/Approval Agents, automações de PR, agents em background — salvo pedido explícito do Frank.

---

## 1. Escopo

- [ ] Título/descrição batem certo com o diff
- [ ] Diff só no que a PR promete (sem drive-by)
- [ ] Sem alterações em `.cursor/rules/` salvo pedido explícito
- [ ] Docs: só o necessário; `PROXIMA_SESSAO.md` só se for handoff desta sessão

## 2. Segurança / auth / RBAC / secrets

- [ ] Sem secrets no diff (tokens, `DATABASE_URL`, passwords, `.env`)
- [ ] Auth/OTP/login: sem bypass; rate-limits e identidade correctos
- [ ] RBAC: roles e permissões coerentes (admin / partner / driver / passenger)
- [ ] Contas privilegiadas **não** usam password demo partilhada
- [ ] Endpoints sensíveis exigem auth + role adequados

## 3. Dados / histórico / migrações / backfills

- [ ] Migrações reversíveis ou com plano claro; sem wipe acidental
- [ ] Histórico de viagens / pagamentos / audit preservado onde importa
- [ ] Backfills: dry-run primeiro; apply só com confirmação explícita
- [ ] Scripts destrutivos ou de prod **não** correm sem OK

## 4. Impacto por perfil

- [ ] **Passenger** — fluxo pedido/viagem/pagamento intacto (ou mudado de propósito)
- [ ] **Driver** — disponibilidade / oferta / viagem intactos
- [ ] **Partner** — frota / drivers / org intactos
- [ ] **Admin** — contratos de URL/tabs (`?tab=`, etc.) intactos se a PR não for Admin

## 5. Flags e decisões de produto

- [ ] **B2 next-trip:** não implementar sem OK do Manel
- [ ] **PF3D gates:** OFF em prod salvo decisão explícita de ligar
- [ ] Feature flags: default seguro; sem activar comportamento novo “por acaso”

## 6. Testes / CI

- [ ] CI verde (ou falhas explicadas e aceites)
- [ ] Testes unitários/API cobrem o comportamento novo ou o bugfixado
- [ ] Sem desligar testes para “passar CI”

## 7. E2E

- [ ] E2E alterado **só** se o comportamento esperado mudou
- [ ] Asserts alinhados com o contrato real (não mascarar regressão)
- [ ] Se E2E tocado: smoke manual mínimo no perfil afectado (quando fizer sentido)

## 8. Branch sync

- [ ] Branch actualizada com `main` (rebase/merge sem conflitos por resolver)
- [ ] Sem commits de WIP / debug / ficheiros locais irrelevantes

## 9. Merge / handoff

- [ ] Preferir squash + apagar branch
- [ ] Após merge: sync `main` local (`fetch` → `checkout main` → `pull --ff-only`)
- [ ] Handoff: o que mudou, o que falta, smokes se deploy relevante
- [ ] **Não mergear** sem confirmação explícita do Frank

---

## Uso rápido

1. Abrir o diff da PR no GitHub.
2. Percorrer os checkboxes (marcar mentalmente ou na descrição da review).
3. Bloquear merge se 2–5 ou 7 falharem sem justificação.
4. Merge só após OK do Frank.
