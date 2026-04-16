# SP-D — Anti-stuck (viagem + pagamento)

## Intenção

**Nenhum** caso comum fica sem **próximo passo** visível (mesmo que seja “escalar admin” ou “correr cron”).

## Critérios de aceite

- Para cada classe de anomalia já detetada na **Saúde**: texto **humano** (“o que é”, “o que fazer em 3 passos”).
- Ligar a ferramentas existentes (cron manual, deep links, recuperação de motorista) onde já houver API.
- Flags de erro **visíveis** na UI admin (não só logs silenciosos).

## Dependências

- **SP-B** para intervenções manuais auditáveis.
- **SP-A** para matriz de transições se houver “override” de estado.

## Exclusões

- “Botão mágico” sem auditoria ou sem validação de transição.
