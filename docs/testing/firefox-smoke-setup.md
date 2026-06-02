# Firefox — setup antes de smokes manuais (Render)

Pré-requisito **nos dois tabs** (`/passenger` e `/driver`), **antes** de marcar smoke falhou.

## Site `tvde-app-j51f.onrender.com`

1. **Escudo** (barra de URL) → **Protecção melhorada desactivada** neste site (evita «Stripe bloqueado»).
2. **Permissões** → **Localização: Permitir**.
3. **Modo responsivo** (Ctrl+Shift+M): **360×796**, DPR **1**, **Sem limitações** (salvo teste de rede de propósito).
4. **F5** nos dois tabs.

## Se aparecer banner «Localização indisponível»

- Clica **Tentar outra vez** no banner, **ou**
- Consola (F12 → Consola):

```javascript
sessionStorage.removeItem('tvde_geolocation_failed')
```

Depois F5.

## Depuração rápida (consola)

```javascript
sessionStorage.getItem('tvde_geolocation_failed') // null = OK; "1" = falha GPS anterior nesta sessão
navigator.permissions.query({ name: 'geolocation' }).then((r) => console.log(r.state)) // granted / denied / prompt
```

Ethernet/rede rápida **não** substitui localização do browser.

## Modo inglês (EN) — smoke opcional

1. Completar checklist PT acima primeiro.
2. Menu → **Definições** → **English** (`data-testid="locale-en"`).
3. Repetir fluxos críticos (pedir viagem, aceitar/iniciar, parceiro lista→detalhe).
4. Para voltar a PT: **Português** (`locale-pt`) ou `localStorage.setItem('tvde_locale','pt')` + F5.

Ver [`docs/architecture/I18N.md`](../architecture/I18N.md).
