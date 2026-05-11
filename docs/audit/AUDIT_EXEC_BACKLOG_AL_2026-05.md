# Backlog executável pós-auditoria (A1–A4) — alinhado a login social (L)

**Fonte:** [`PROJECT_AUDIT_2026-05-02.md`](./PROJECT_AUDIT_2026-05-02.md)  
**Sequência acordada:** **A1 → A2 → L1 → A3 → L2 → L3 → A4** (A = auditoria / OPS-produto, L = login social).

**Estado (documental + código):** **A1**, **A2**, **L1** feitos. **A3** parcialmente fechado em código (**A2-01** rate-limit; **A2-03** URIs canónicas abaixo; **A2-02** staging = decisão OPS em aberto). **L2/L3** implementados (troca `code` + UI passageiro).

---

## A1 — Inventário de temas (lista bruta)

Agrupamento dos achados do audit; referência à secção original.

| # | Tema | Onde no audit |
|---|------|----------------|
| T1 | **Realtime / escala** — hubs WS in-process; matching Haversine em Python; polling 5s | §3.1, §6 Fase C |
| T2 | **Identidade** — OTP sem SMS real; default password BETA; JWT sem refresh; rate-limit ausente em login/OTP | §3.2, §8 item 1 |
| T3 | **Pagamentos** — Connect ausente; 3DS no front; refunds UI | §3.3 |
| T4 | **Ops** — sem staging; backups não formalizados; deploy só manual Render | §3.4, §8 items 4–6 |
| T5 | **Observabilidade** — Sentry opcional; sem APM/traces | §3.4, §8 item 6 |
| T6 | **Segurança CI** — Bandit não em CI; rotação de segredos não documentada | §3.2, §8 item 2 |
| T7 | **Qualidade / dívida** — monstros (DriverDashboard, admin router); bundle 1.67MB; E2E fino; mypy/cov CI | §3.5, §8 |
| T8 | **Legal / RGPD** — termos/privacidade advogado; registo tratamentos; KYC | §3.6, Fase A.11 |
| T9 | **Produto vs Uber** — nativo, push, SMS, Connect, etc. | §5–§7 |

---

## A2 — Priorização (impacto × urgência para a onda **A+L**)

Legenda: **P0** = antes ou junto da integração OAuth em aberto público; **P1** = logo após L2; **P2** = trimestre / dívida assumida.

| ID | Item executável | Tema | P |
|----|-----------------|------|---|
| **A2-01** | Rate-limit **`/auth/otp/request`** e **`/auth/login`** (IP + identificador) | T2 | **P0** |
| **A2-02** | Decisão **staging** (segundo serviço Render + BD test): *obrigatório* antes de OAuth redirect “a sério” | T4 | **P0** |
| **A2-03** | Inventariar **redirect URIs** por ambiente (local, staging, prod) e política de cookies/CORS para o fluxo OAuth | T2, T4 | **P0** |
| **A2-04** | **`SENTRY_DSN`** em produção (se ainda não) | T5 | **P0** |
| **A2-05** | Job CI: **`bandit`** + **`pip-audit`** (ou equivalente) | T6 | **P1** |
| **A2-06** | Backups Postgres: activar / plano Render + **restore documentado** | T4 | **P1** |
| **A2-07** | **Incident runbook** mínimo (rollback app, Stripe, comunicação) | T4 | **P1** |
| **A2-08** | **Auditoria segurança light (A034)** — pentest manual curto + revisão RBAC | T2, T6 | **P1** |
| **A2-09** | Gate **pytest-cov** ou limiar em `services/` + `api/routers/` | T7 | **P1** |
| **A2-10** | `render.yaml` / IaC mínimo | T4 | **P2** |
| **A2-11** | PostGIS + realtime distribuído (Redis/NATS) | T1 | **P2** |
| **A2-12** | Stripe Connect + SMS OTP real + 3DS — **Fase A** completa | T3, T2 | **P2** (auditor; não bloqueia L1) |

**Dívida explícita (não entra na onda L):** T7 monstros, T9 nativo/push — mantêm-se no [`PROJECT_AUDIT_2026-05-02.md`](./PROJECT_AUDIT_2026-05-02.md) §6–7.

---

## A2-03 — Redirect URIs (canónico)

| Ambiente | `redirect_uri` (SPA) | Registo Google Cloud Console |
|----------|----------------------|--------------------------------|
| Local | `http://localhost:5173/auth/google/callback` | Authorized redirect URIs |
| Staging | *a definir* (mesmo host que o *build* Vite) | Idem |
| Produção | `https://<domínio-app>/auth/google/callback` | Idem |

**Backend:** não expõe client secret; `POST /auth/google/exchange` recebe `code` + `redirect_uri` idêntico ao usado no redirect inicial.

---

## A3 — *Gate* antes de fechar L2 (integração técnica)

Checklist quando **L1** estiver fechado e **antes** de abrir Google a testers externos:

- [ ] **A2-02** decidido (staging existe ou data + responsável).
- [x] **A2-03** preenchido — tabela §A2-03 (produção/staging final = completar quando houver host).
- [x] **A2-01** implementado — `app/api/auth_rate_limit.py` + uso em `/auth/otp/request`, `/auth/login`, `/auth/google/exchange`.
- [x] Revisão: troca de `code` **só no backend**; `GOOGLE_OAUTH_CLIENT_SECRET` em env; fluxo v1 **só passageiro**.

---

## A4 — Fecho da onda auditoria (após L3)

- Reconciliar itens **P1/P2** não feitos com [`docs/todo-em-curso.md`](../todo-em-curso.md) e próximo trimestre.
- Actualizar este ficheiro com data de conclusão por item quando aplicável.

---

_Última actualização: **2026-05-12** — L2/L3 (Google BETA passageiro) + A2-01/A2-03; A2-02 staging em aberto._
