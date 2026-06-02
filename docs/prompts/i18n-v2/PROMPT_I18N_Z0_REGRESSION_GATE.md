# Z0 — i18n regression-gate

**ID:** `Z0` · **Branch:** `feat/i18n-z0-regression-gate` · **Depende de:** lote anterior

## Referências

- [I18N.md](../../architecture/I18N.md)
- Baseline commit: `3988fcfed7116ebbab7ec0dea6c3cae4a9a0e121 (PR #353 merged)`
- [PROMPT_I18N_INDEX.md](./PROMPT_I18N_INDEX.md)

## Convenções

- Default **PT**; `localStorage` `tvde_locale`; admin `/admin` PT-only.
- Não alterar `value` de motivos de cancelamento na API.
- Erros API: [`apiErrors.ts`](../../web-app/src/i18n/apiErrors.ts). Datas: [`format.ts`](../../web-app/src/i18n/format.ts).
- Rebase frequente em `main`; evitar editar o mesmo JSON em PRs paralelos.

## Pré-voo

```bash
git checkout main && git pull --ff-only origin main
git checkout -b feat/i18n-z0-regression-gate
```

## Objectivo

Checklist após cada **lote** (ex. pós P4P5, pós R6): smokes PT, locale-en-smoke local, rg zero PT, actualizar tabela cobertura em I18N.md.

## Ficheiros (âmbito)

- [`i18n/`](../../web-app/src/i18n/)

## Checklist lote

| ID | Item | Estado | Notas |
|----|------|--------|-------|
| Z0-1 | Smokes PT / S-NAV | Por iniciar | CI obrigatório |
| Z0-2 | locale-en-smoke local | Por iniciar | Opcional |
| Z0-3 | rg zero PT no lote | Por iniciar | Paths do lote |
| Z0-4 | I18N.md cobertura | Por iniciar | Tabela shells |

## Implementação

1. Analisar ficheiros listados; identificar strings PT visíveis ao utilizador.
2. Adicionar chaves em `web-app/src/i18n/locales/{pt,en}/` (namespace indicado no índice).
3. Substituir literais por `useTranslation` + `t('…')`.
4. Manter `data-testid` estáveis; `aria-label` traduzidos.

## Fora de âmbito

- Admin UI (`/admin`) — PT-only.
- Auto-detect de idioma do browser.
- `Accept-Language` no backend.
- Texto legal completo (ver X3 bloqueado).

## Aceitação

- Com locale **EN**, superfície do prompt sem texto PT visível (exc. nomes próprios / dados utilizador).
- `npm run build && npm run test && npm run lint` verdes em `web-app/`.
- E2E CI em PT inalterados.

## Auditoria

```bash
rg "[À-ú]" web-app/src/i18n/
```

Excluir: comentários, `data-testid`, enums API, payloads de cancelamento.

## Gates

```bash
cd web-app && npm run build && npm run test && npm run lint
```

- CI: smokes PT obrigatórios.
- EN local (opcional): `npx playwright test e2e/locale-en-smoke.spec.ts`

## Template PR

### Summary
- i18n EN: regression-gate

### Auditoria
- [ ] `rg` sem PT visível nos paths do prompt

### Test plan
- [ ] PT default — smokes/E2E CI
- [ ] EN — toggle login ou Definições; superfície sem PT
- [ ] build / test / lint

### Docs
- [ ] Actualizar [I18N.md](../../architecture/I18N.md) se cobertura ou “onde mudar idioma” mudar

### Commit sugerido

```
feat(i18n): regression-gate
```
