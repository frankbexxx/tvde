# PROMPT P2 — QR estável + shell passageiro (menu + histórico)

**Backlog:** itens 7 e 10.

## Objectivo

- **QR / download:** rotas **`/dl`** e **`/app`** na SPA (`AppDownloadRedirect`): com **`VITE_APP_DOWNLOAD_URL`** → redireccionamento externo; sem env → **`/download`** (landing no mesmo deploy, CTA para **`/passenger`**) — **#289**.
- **Passageiro:** menu lateral tipo driver; **histórico** só dentro do menu — ecrã principal mais limpo (lista completa no drawer, um toque para abrir histórico no menu).

## Critérios de aceitação

- `GET /#/…` ou path dedicado (ex. `/dl`) leva ao destino de download sem login.
- Passageiro autenticado: histórico **não** aparece como secção grande no dashboard principal; está acessível pelo menu (completo ou scroll dentro do sheet).

## Fora de âmbito

- QR por tenant, universal links por loja, decisão final de domínio de produção (config via env).
