# Linha rotacional v2 — alertas meteo, Prociv, trânsito

Documento de produto para evoluir o *marquee* do `AppHeaderBar` sem inventar fontes não acordadas.

## Estado actual (2026-05)

| Camada | Comportamento |
|--------|----------------|
| **v1** | Copy estática em `web-app/src/components/layout/headerRotatingHints.ts`. |
| **v2 — infra** | `GET /rotacional/messages` (público): lista vinda de **`ROTACIONAL_FEED_JSON`** no backend (curadoria manual ou geração futura server-side). A app junta estas frases às estáticas e renova o feed ~10 min. |
| **v3 — cache HTTP** | Opcional: `ROTACIONAL_V3_FETCH_URL` — o batch `GET /cron/jobs` faz fetch de um JSON array compatível, valida e persiste em **`rotacional_external_cache`**; o endpoint público faz merge (**env primeiro**, depois linhas externas sem duplicar texto). |

## Tipos de conteúdo desejados (roadmap)

1. **Meteo (IPMA)** — avisos meteorológicos (cores, distritos). *Integração futura:* job/cron que consome API oficial IPMA (ToS, caching, rate limits).
2. **Prociv / emergência** — fogos, inundações, avisos onde houver API ou feed estável; **nunca** *scraping* agressivo sem base legal.
3. **Trânsito / acidentes** — mensagens genéricas ou dados de fontes com licença clara (a definir).
4. **Interno TVDE** — dicas de produto (lista v1).

## Princípios

- **Veracidade:** alertas em tempo real só com cadeia de dados validada; até lá, curadoria via `ROTACIONAL_FEED_JSON` ou copy genérica.
- **Privacidade:** endpoint público sem PII nem geo exacta de utilizadores.
- **Curto:** até ~280 caracteres por item (`backend` valida).
- **Fonte:** campo `source` (`meteo`, `prociv`, `transito`, `interno`, …).

## Próximas fases técnicas

- Worker que agrega IPMA / feeds acordados e preenche cache (Redis/DB).
- Filtro por região do motorista quando houver base geo confiável.

_Relacionado:_ `docs/env/ENV_SINGLE_REALITY.md` (`ROTACIONAL_FEED_JSON`).
