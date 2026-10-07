# Windows Terminal launchers (TVDE)

## Launchers

| Ficheiro | Uso |
|----------|-----|
| `Open-TVDE-Dev-WT.bat` | Dev normal — 5 abas; **Stripe TEST webhook** auto se `STRIPE_MOCK=false` + `sk_test_*` |
| `Open-TVDE-Stripe-WT.bat` | O-STRIPE-1 dedicado (legado/manual); preferir Dev normal |
| `Open-Cursor-Admin.bat` | Cursor **elevado** (separado; não usar para dev diário) |

Ambos os launchers Dev/Stripe:

- **Não** pedem UAC nem usam `-Verb RunAs`.
- Abrem Cursor **directamente no `.bat`** (`start "" Cursor.exe "%ROOT%"`) — sem `pwsh` intermédio, sem consola extra nem logs na shell.
- Se forem arrancados **já como Administrador**, relançam-se automaticamente **sem** elevacao.

## Prefixo `Administrator:` nas abas

Se as abas do Windows Terminal mostram `Administrator: Backend_Dev` (etc.), a causa **não** é elevação no script — é o **processo pai** elevado:

1. Fechar **todas** as janelas do Windows Terminal com título `Administrator: …`.
2. Abrir o `.bat` por **duplo-clique** normal no Explorador (não a partir de CMD/PowerShell elevado).
3. Atalho: Propriedades → **Compatibilidade** → desmarcar *Executar este programa como administrador*.
4. Não usar a versão antiga do launcher Dev (tinha UAC obrigatório); usar estes ficheiros actuais.

`Start-Cursor-Admin.ps1` / `Open-Cursor-Admin.bat` são **opcionais** e elevados de propósito — não misturar com os launchers WT.

## Stripe local

Com `STRIPE_MOCK=false` e `sk_test_*` em `backend/.env`, o launcher Dev:

1. Arranca um **supervisor** `stripe listen` na aba **Stripe_Webhook** (PID, `session_id`, heartbeat em `.dev-local/stripe-listen.json`).
2. Publica o `whsec` da sessão em `.dev-local/stripe-webhook-secret` (gitignored; **não** usa `backend/.env`).
3. A aba **Backend_Dev** espera **`stripe_e2e_ready=true`** (listener vivo + probe E2E na sessão actual).

Painel **Utils_Dev**: Postgres / Backend / Frontend / Stripe TEST listener / **Stripe E2E READY|NOT READY** + `reason`.

Ver `docs/ops/O_STRIPE_1_RUNBOOK.md`.
