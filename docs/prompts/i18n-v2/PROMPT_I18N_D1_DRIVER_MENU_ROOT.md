# D1 — i18n driver-menu-root

**ID:** `D1` · **Branch:** `feat/i18n-d1-driver-menu-root` · **Depende de:** X1

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
git checkout -b feat/i18n-d1-driver-menu-root
```

## Objectivo

Menu motorista root + identity. Checklist X1 no topo.

## Ficheiros (âmbito)

- [`features/driver/DriverSideMenu.tsx`](../../web-app/src/features/driver/DriverSideMenu.tsx)



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
rg "[À-ú]" web-app/src/features/driver/DriverSideMenu.tsx
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
- i18n EN: driver-menu-root

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
feat(i18n): driver-menu-root
```
