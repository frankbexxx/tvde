# Windows Terminal launchers (TVDE)

## Launchers

| Ficheiro | Uso |
|----------|-----|
| `Open-TVDE-Dev-WT.bat` | Dev normal — 4 abas, sem Stripe |
| `Open-TVDE-Stripe-WT.bat` | O-STRIPE-1 local — 5 abas, webhook test mode |
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

Ver `docs/ops/O_STRIPE_1_RUNBOOK.md`.
