# TODO código — TVDE (versão final ajustada)

Checklist **top-down** para fecho técnico até operação com confiança. Complementa o anexo A023–A035 em `docs/architecture/TVDE_ENGINEERING_ROADMAP.md` e a **Seção F** de `PROXIMA_SESSAO.md` (ex-`OPERATION_CHECKLIST.md`).

---

## 1. PROD_VALIDATION (blocker real)

```text
PROD_VALIDATION
├── stripe_webhook
│   ├── validar endpoint em produção
│   ├── validar signature real
│   └── confirmar update via webhook (não manual)
│
├── cron_jobs
│   ├── configurar agendador externo
│   ├── validar CRON_SECRET
│   └── verificar efeitos reais (timeouts/expiry)
│
├── env_validation
│   ├── DATABASE_URL correto
│   ├── STRIPE keys (live vs test)
│   └── ausência de defaults perigosos
│
└── e2e_flow_real
    ├── trip completa (2 devices)
    ├── payment capturado
    └── estado consistente DB + Stripe
```

---

## 2. STAGING (A027) — obrigatório

```text
STAGING
├── infra
│   ├── serviços separados (api + db)
│   └── env isoladas
│
├── stripe_test
│   ├── keys test
│   └── webhook test funcional
│
└── smoke_validation
    ├── webhook funciona
    ├── cron funciona
    └── e2e básico passa
```

---

## 3. BACKUPS (A028) — antes de escala

```text
BACKUPS
├── backup_setup
│   ├── pg_dump automático (mínimo)
│   └── storage seguro
│
└── restore_validation
    └── testar recuperação completa
```

---

## 4. MIGRAÇÕES e dados (novo — crítico)

```text
MIGRATIONS
├── apply_sql
│   ├── garantir A025 aplicado em todas DBs
│   └── consistência schema (dev/staging/prod)
│
├── data_integrity
│   ├── 0 duplicados payment_intent
│   ├── trips consistentes
│   └── checks pós-deploy
│
└── strategy
    └── definir caminho (alembic vs sql manual)
```

---

## 5. HARDENING (validação final, não rebuild)

```text
HARDENING
├── production_security
│   ├── CORS restrito (validar env real)
│   ├── dev endpoints OFF
│   └── auth flows testados
│
├── secrets
│   ├── validar envs produção
│   └── remover defaults/debug
│
└── input_validation
    └── endpoints críticos protegidos
```

---

## 6. OBSERVABILIDADE (obrigatório para operar)

```text
OBSERVABILITY
├── logging
│   ├── trip_id em logs
│   └── payment_intent_id em logs
│
├── health
│   ├── validar /admin/system-health
│   └── stuck_payments = 0
│
└── alerting_min
    ├── webhook falha
    ├── pagamento stuck
    └── erro crítico
```

---

## 7. TESTES (foco, não expansão)

```text
TESTS
├── webhook
│   └── simular eventos stripe
│
├── critical_flows
│   ├── trip lifecycle
│   └── payment lifecycle
│
└── concurrency
    └── aceitar viagem simultânea
```

---

## 8. Dependências e supply chain (novo)

```text
DEPENDENCIES
├── pip_audit
│   ├── monitorizar vulnerabilidades
│   └── (ex.: pygments) atualizar quando seguro
│
└── versioning
    └── pins controlados (evitar breaks)
```

---

## 9. Integrações externas (novo)

```text
INTEGRATIONS
├── stripe
│   ├── retries seguros
│   └── idempotência validada
│
├── maps/osrm
│   ├── fallback em erro
│   └── quotas controladas
│
└── rate_limit
    └── evitar abuso básico
```

---

## 10. Cleanup final

```text
CLEANUP
├── remover código morto
├── remover logs debug
├── alinhar configs
└── consistência envs
```

---

## Ordem final (ajustada)

1. PROD_VALIDATION
2. STAGING
3. BACKUPS (mínimo antes de tráfego real)
4. MIGRATIONS
5. HARDENING (validação final)
6. OBSERVABILITY
7. TESTS (focados)
8. DEPENDENCIES
9. INTEGRATIONS
10. CLEANUP

---

## Diferença crítica (antes vs agora)

| Antes              | Agora                                 |
| ------------------ | ------------------------------------- |
| Implementar coisas | Provar que funcionam em ambiente real |

---

## Regra final (reforçada)

**Nada entra em PROD** sem passar **pelo menos uma vez** por **STAGING** com:

- webhook
- cron
- e2e

---

## Conclusão

O núcleo de código do projeto está em grande parte **feito**; o trabalho que resta é sobretudo **validação**, **operação** e **robustez** em ambientes reais — alinhado com a realidade do repositório e do roadmap (A027, A028, observabilidade, etc.).

---

## Piloto comercial — superfícies (planeamento de prompts)

Checklist **produto/entrega** em fila nomeada: [`prompts/pilot-commercial/README.md`](prompts/pilot-commercial/README.md). **Fase 0:** A001–A003 já redigidas (superfícies, RBAC alvo, multi-tenant alvo); resto da fila em placeholder. Complementa este ficheiro (foco técnico ops/staging) com **implementação** de parceiro + RBAC + critérios de piloto.

---

**Ver também:** [visao_cursor.md](visao_cursor.md) (comercialização e checklist alargado), [architecture/TVDE_ENGINEERING_ROADMAP.md](architecture/TVDE_ENGINEERING_ROADMAP.md) (anexo pré-produção A023–A035).
