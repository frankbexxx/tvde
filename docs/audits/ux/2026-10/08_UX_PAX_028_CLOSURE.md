# Fecho de UX-PAX-028

Sem viagem criada. Sem código alterado. Relatórios `00` a `07` intactos.

## 1. Cenários disponíveis

| Sítio | O que há | Serve para ver a folha |
|---|---|---|
| Produção | Conta de teste do passageiro já aberta na auditoria. Histórico: «Ainda não há viagens nesta conta.» Home sem folha de viagem. | Não |
| Staging | `https://tvde-staging-app.onrender.com` responde. Não há conta conhecida com viagem activa. Não se entrou. | Não |
| Local | Vite em `127.0.0.1:5173` e API em `127.0.0.1:8000` estão desligados. | Não |
| E2E | `web-app/e2e/driver-passenger-flow.spec.ts` cria uma viagem na API local (`127.0.0.1:8000`) e percorre o fluxo. Não está a correr. Arrancá-lo criaria uma viagem. | Não usado |
| Fixtures | Não há Storybook nem modo de pré-visualização que mostre a folha de viagem activa sem uma viagem. Os testes de componente não são o ecrã. | Não |

Não se criou viagem, não se chamou motorista e não se mudou estado de viagem.

## 2. Passageiro

Resultado: NOT_TESTABLE_SAFELY

Evidência: na produção, a conta de teste não tem viagens. Não há outro cenário já aberto.

## 3. Motorista

Resultado: NOT_TESTABLE_SAFELY

Evidência: a mesma ausência. O fluxo E2E local que mostraria o motorista não está a correr e criaria uma viagem.

## 4. Resultado final UX-PAX-028

NOT_TESTABLE_SAFELY

UX-PAX-028 não pode ser validado nesta auditoria sem criar ou manipular uma viagem. Fica pendente para o próximo teste E2E/terreno com viagem activa.

Mantém-se pendente para validação durante o próximo teste com viagem activa. Inclui o antigo UX-DRV-009.

## 5. Estado final da auditoria

- UX-PAX-009: removido como problema confirmado
- UX-PAX-011: removido como problema confirmado
- UX-PAX-028: NOT_TESTABLE_SAFELY

Existem mais buscas/validações UX necessárias antes de fechar documentalmente esta auditoria: NÃO

NÃO — fica registado como pendência de validação futura em cenário de viagem activa.

## Controlo

- Nenhum código alterado.
- Nenhuma viagem criada.
- Nenhum estado de produção manipulado.
- Relatórios `00` a `07` intactos.
- Repo alterado: NÃO.
