# i18n — nichos EN (workflow)

Pacote i18n v2 **concluído** (PRs #353, #354). Prompts de execução arquivados (auditoria Lote 2).

## Como corrigir PT residual

1. Mudar app para **EN** (login ou Definições → Idioma).
2. Capturar **screenshot** do ecrã com texto PT.
3. Anotar: shell (passageiro/motorista/parceiro), rota, string visível.
4. Adicionar chave em `web-app/src/i18n/locales/en/*.json` (e `pt` se faltar).
5. Substituir literal no componente por `t('namespace.key')`.
6. `npm run test` em `web-app` + smoke visual no ecrã.

## Prioridade típica

| Área | Notas |
|------|-------|
| Motorista legacy menu | Sub-painéis antigos podem ter PT |
| Legal / política | Opção B — `LegalLocaleNotice`; páginas completas PT quando existirem |
| Admin | Fora do âmbito v1 (PT-only) |

## Referências

- Arquitectura: [`I18N.md`](./I18N.md)
- Índice resumido: [`PROMPT_I18N_INDEX.md`](../prompts/i18n-v2/PROMPT_I18N_INDEX.md)
- Arquivo prompts: `C:\dev\_archives\APP\docs-2026-06\lote-2\docs\prompts\i18n-v2\`
