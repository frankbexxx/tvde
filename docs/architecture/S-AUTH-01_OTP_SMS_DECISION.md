# S-AUTH-01 — Decisão técnica OTP SMS (registo para implementação futura)

**Estado:** DECISÃO REGISTADA · **implementação não iniciada**  
**Data do registo:** 2026-10-07  
**Relacionado:** `S-AUTH-01` · L-SEC-12 (consume atómico CLOSED) · L-SEC-17 (OTP off em deployed CLOSED) · [`07_AUTH_OTP.md`](../diagrams/07_AUTH_OTP.md)

---

## Resumo executivo

- **OTP SMS real não será implementado nesta fase.** Este documento fixa arquitectura e regras para um go futuro.
- **DEV** continua com fluxo dev/mock controlado (comportamento actual do código até implementação).
- **STAG** e **PROD** continuam com OTP por telefone **desactivado** (`503 otp_auth_unavailable` / UI sem signup OTP) até critério de go (§13) e implementação.
- **Provider de referência provisório (MVP):** Bird (MessageBird) — **Messages API transaccional**, não Bird Verify.
- **OTP** gerado, armazenado (hash) e validado **sempre no backend**.
- **Limites multi-worker:** PostgreSQL (sem Redis no MVP).
- **Delivery webhook:** fase 2; MVP = accept síncrona + `provider_message_id`.

---

## A. Contexto e estado actual (baseline)

Auditoria read-only (2026-10-07). Pontos relevantes:

| Área | Estado actual |
|------|----------------|
| Endpoints | `POST /auth/otp/request`, `POST /auth/otp/verify`; recuperação password reutiliza `otp_codes` |
| Deployed gate | `_reject_otp_when_deployed()` → STAG/PROD (e labels desconhecidas) **503** antes de gerar/gravar JWT |
| Envio | **Sem SMS**; DEV: `print` opcional + código fixo `123456` com `ENABLE_DEV_TOOLS` |
| Persistência | `otp_codes`: `phone`, `code_hash`, `expires_at`, `consumed_at`, `created_at` |
| TTL | `OTP_EXPIRATION_MINUTES` (default 5) |
| Rate limit | In-memory por processo (12/min request IP+phone; 12/min verify por telefone) |
| Consume | Atómico (`claim_unconsumed_otp`) — L-SEC-12 |
| Provider | Nenhum integrado no código |

**Decisão de produto (mantida até go):**

- DEV: mock/controlado.
- STAG: OTP SMS real só quando quisermos testar onboarding/login por telefone em condições próximas de PROD.
- PROD: OTP por telefone só com canal SMS validado + smoke PASS.

---

## 1. Arquitectura final recomendada

```
┌─────────────────────────────────────────────────────────────┐
│  HTTP  /auth/otp/*  ·  /auth/password/forgot*               │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Auth router (thin) — validação HTTP, flags ambiente        │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  OtpService (domínio)                                         │
│  · request(phone, purpose) → OtpRecord + política resend      │
│  · verify(phone, code, purpose) → consume atómico + limits    │
│  · invalidate_previous(phone, purpose)                        │
│  · map errors → códigos API estáveis (sem Bird no domínio)    │
└───────┬─────────────────────────────┬─────────────────────────┘
        │                             │
        ▼                             ▼
┌───────────────┐             ┌───────────────────┐
│ PostgreSQL    │             │ SmsSender (port)  │
│ otp_codes +   │             │ send_otp(...)     │
│ rate buckets  │             └─────────┬─────────┘
└───────────────┘                       │
                          ┌─────────────┼─────────────┐
                          ▼             ▼             ▼
                 ConsoleSmsSender  BirdSmsSender  TwilioSmsSender
                 (DEV)            (STAG/PROD ref) (adapter futuro)
```

### Princípios

| Princípio | Implicação |
|-----------|------------|
| OTP é nosso | Geração, hash HMAC, TTL, verify, JWT — **não** Bird Verify como fonte de verdade |
| SMS é infra | `SmsSender` transporta texto; falha de transporte ≠ sucesso ao utilizador |
| Provider substituível | Bird referência MVP; Twilio = segunda implementação do mesmo port |
| Gate por ambiente | Substituir gate binário «deployed = off» por política explícita: `OTP_PHONE_ENABLED` + `SMS_MODE` + provider + (PROD) smoke PASS |
| STAG lazy | OTP SMS em STAG só quando houver teste intencional de onboarding/login por telefone |

### Pacotes sugeridos (implementação futura)

- `backend/app/services/otp/` — `OtpService`, políticas, erros de domínio
- `backend/app/services/sms/` — `SmsSender`, `SmsSendResult`, adapters
- `backend/app/integrations/bird/` — HTTP Bird → `SmsSendResult` (borda, fora do domínio Auth)

---

## 2. PostgreSQL vs Redis

**Recomendação: Opção A — PostgreSQL** para `attempt_count`, resend cooldown, invalidação de OTP anterior e rate limits partilhados **multi-worker**. **Não assumir Redis no MVP.**

| Critério | PostgreSQL | Redis |
|----------|------------|-------|
| MVP / volume baixo | BD já existe; zero novo serviço Render | Novo serviço, credenciais, ops |
| Multi-worker Render | `UPDATE … WHERE`, upsert, transacções | Idiomático para counters |
| Atomicidade consume OTP | Já implementado em PG | Duplicar ou sincronizar estado |
| Simplicidade ops | Uma BD, Alembic | Dois sistemas |
| Custo | Incluído | Linha extra |

**Reconsiderar Redis** apenas se: volume sustentado muito alto, filas/retry SMS assíncronas dedicadas, ou webhooks delivery em volume que justifique deduplicação TTL separada.

**Padrão PG (MVP):**

1. Estado do OTP activo → colunas em `otp_codes` (§3).
2. Rate limit partilhado → tabela `otp_rate_bucket` (`bucket_key`, `window_start`, `count`) com increment atómico, ou eventos com índice temporal (volume inicial aceitável).
3. Resend cooldown → `sent_at` / último envio por `(phone, purpose)` na linha activa ou consulta agregada.

Bucket keys sugeridas: tipo (`req`|`verify`) + `purpose` + telefone normalizado (sem segredo adicional necessário).

---

## 3. Modelo OTP futuro

**Actual:** `id`, `phone`, `code_hash`, `expires_at`, `consumed_at`, `created_at`.

### Campos propostos

| Campo | MVP | Opcional | Futuro | Notas |
|-------|-----|----------|--------|-------|
| `purpose` | Sim | — | — | `login` \| `password_reset` |
| `attempt_count` | Sim | — | — | Incremento atómico em verify falhado |
| `max_attempts` | Sim | — | — | Default config; coluna permite override |
| `expires_at` | Sim | — | — | Existente |
| `consumed_at` | Sim | — | — | Existente |
| `invalidated_at` | Sim | — | — | Novo OTP invalida anteriores do mesmo purpose |
| `sent_at` | Sim | — | — | Só após `SmsSendResult.accepted` |
| `provider` | Sim | — | — | `console` \| `bird` \| `twilio` |
| `provider_message_id` | Sim | — | — | Se accepted |
| `delivery_status` | — | Sim (enum simples) | Rich webhook | MVP: `pending` \| `accepted` \| `failed` \| `unknown` |
| `delivery_status_at` | — | Opcional | — | Fase 2 |
| `last_attempt_at` | — | Opcional | — | `attempt_count` basta MVP |
| `send_error_category` | Sim | — | — | `invalid_number` \| `provider` \| `timeout` \| `config` — sem payload Bird |
| `resend_of_id` | — | Opcional | — | Cadeia reenvios |
| `created_at` | Sim | — | — | Existente |

**Nunca persistir:** código em claro, corpo SMS completo com PII extra, JSON raw Bird.

**Invalidação (regra 1):** na mesma transacção do `request`:

```sql
UPDATE otp_codes SET invalidated_at = now()
WHERE phone = :phone AND purpose = :purpose
  AND consumed_at IS NULL AND invalidated_at IS NULL
  AND expires_at > now();
```

**Índice MVP:** `(phone, purpose, created_at DESC)`; manter `(phone, expires_at)`.

---

## 4. Contrato `SmsSender` (genérico)

Domínio Auth/OtpService importa **apenas** este contrato. Sem payloads Bird no domínio.

```python
# Conceptual — implementação futura

class SmsErrorCategory(str, Enum):
    ACCEPTED = "accepted"
    INVALID_DESTINATION = "invalid_destination"
    PROVIDER_REJECTED = "provider_rejected"
    PROVIDER_TIMEOUT = "provider_timeout"
    PROVIDER_UNAVAILABLE = "provider_unavailable"
    MISCONFIGURED = "misconfigured"
    UNKNOWN = "unknown"


@dataclass(frozen=True)
class SmsSendResult:
    accepted: bool
    provider: str                  # "bird", "console", "twilio"
    provider_message_id: str | None
    error_category: SmsErrorCategory | None
    retryable: bool                # hint retry futuro (fila)


class SmsSender(Protocol):
    def send_otp(
        self,
        destination: str,          # E.164 normalizado (+351...)
        body: str,                 # texto final; template no OtpService
        correlation_id: str,       # otp_codes.id (UUID)
    ) -> SmsSendResult: ...
```

### Orquestração OtpService

1. `INSERT` OTP com `delivery_status=pending`, sem `sent_at`.
2. Chamar `send_otp`.
3. Se `accepted`: gravar `sent_at`, `provider`, `provider_message_id`, `delivery_status=accepted`; **só então** HTTP 200 ao cliente.
4. Se falha: `failed` + `send_error_category`; HTTP **502/503** (`sms_send_failed` / `otp_delivery_unavailable`) — **nunca** falso «SMS enviado».
5. Adapter Bird em `integrations/bird/` mapeia HTTP → `SmsSendResult`.

**Template SMS (domínio):** ex. `V@mulá: o teu código é {code}. Válido {n} min. Não partilhes este código.`

---

## 5. Estratégia Bird (referência provisória MVP)

| Tema | Decisão |
|------|---------|
| Produto | Bird **Messages API** (SMS outbound transaccional) |
| Não usar | Bird Verify como lógica OTP |
| Geração/validação | Backend (`generate_otp_code`, HMAC, verify, consume) |
| STAG | Credenciais STAG; test credits / whitelist / envio restrito conforme conta |
| PROD | Credenciais PROD independentes |
| Twilio | Futuro `TwilioSmsSender`; seleção `SMS_PROVIDER=bird|twilio|console` |
| Webhooks Bird | Borda `integrations/bird/webhooks.py`; domínio só vê enums internos |

**Bloqueadores comerciais (externos):** sender PT, DPA, custo unitário — ver §12.

---

## 6. Delivery webhook: agora ou depois

**MVP (fase 1):** resposta síncrona **accepted** + persistir `provider_message_id`; `delivery_status` → `accepted` ou `failed`.

**Fase 2:** webhook `queued` / `sent` / `delivered` / `failed`; endpoint público; verificação assinatura; idempotência.

**Justificação:** login OTP exige não mentir sobre submissão ao provider; *delivered* é valioso para suporte e métricas mas não desbloqueia verify. Webhooks aumentam superfície ops no primeiro cut; colunas MVP preparam fase 2.

---

## 7. DEV / STAG / PROD

| | DEV | STAG | PROD |
|---|-----|------|------|
| **Até implementação** | Mock actual (código consola/fix) | OTP API **off** (503) | OTP API **off** (503) |
| **Pós-implementação — SMS** | `console` por defeito; sem SMS real | Bird test/whitelist/sandbox ou off até teste | Bird live |
| **OTP telefone API** | On (local/test) | On só quando equipa activar teste STAG | On só pós-smoke PASS + flag |
| **Código visível** | Mecanismo DEV dedicado (ex. `/dev/…` com gate) — **nunca** logs genéricos | Proibido | Proibido |
| **Código fixo 123456** | Só com flag explícita + non-deployed | Proibido | Proibido |
| **Credenciais Bird** | Ausentes | Render STAG | Render PROD (separadas) |
| **Segurança** | Relaxada só onde local e visível | **Igual PROD** | Máximo |

**Flags futuras (nomes indicativos):** `SMS_PROVIDER`, `SMS_MODE`, `OTP_PHONE_ENABLED`, `OTP_DEV_FIXED_CODE` (DEV only).

**`/config`:** expor `otp_phone_enabled` / `otp_signup_enabled` alinhado à política real (hoje: `otp_signup_enabled = not deployed`).

---

## 8. Segurança — regras obrigatórias da implementação

| # | Regra | Como cumprir |
|---|--------|--------------|
| 1 | Novo OTP invalida anteriores relevantes | `invalidated_at` + UPDATE em transacção no request |
| 2 | Limite tentativas por OTP | `attempt_count` / `max_attempts`; `401 otp_max_attempts` |
| 3 | Cooldown resend server-side | ex. 60s; `429 otp_resend_cooldown` + `Retry-After` |
| 4 | Rate limit partilhado entre workers | Tabela PG (§2), não memória |
| 5 | Consume atómico | Manter `claim_unconsumed_otp` |
| 6 | Replay impossível após consume | Consume antes de JWT; reset proof atado a `otp_id` |
| 7 | Código nunca em logs STAG/PROD | Logs: `correlation_id`, purpose; proibir `code=` |
| 8 | Erro provider ≠ «SMS enviado» | Persist → send → 200 só se accepted |
| 9 | Sem keys live em DEV | Factory por env; fail closed |
| 10 | STAG/PROD credenciais independentes | Render env groups |
| 11 | UX clara todos os estados | §9 |

---

## 9. UX futura («SE NÃO VEJO, NÃO EXISTE»)

Estados obrigatórios (login OTP + recuperação alinhados):

| Estado | Comportamento | API |
|--------|---------------|-----|
| Código enviado | «Código enviado para +351 *** *** 678» | `expires_at`; máscara client-side |
| Expiração | Countdown até `expires_at` | Timer + resync no reenvio |
| Reenviar | Botão + countdown cooldown | `429 otp_resend_cooldown` + `retry_after_seconds` |
| Código inválido | Mensagem dedicada | `401 invalid_otp` |
| Expirado | «Código expirado. Pede um novo.» | `401 otp_expired` (distinto de inválido) |
| Demasiadas tentativas | Por OTP | `401 otp_max_attempts` |
| Rate limit | Com tempo de espera | `429 rate_limit_*` |
| Falha envio | Sem falso sucesso | `502/503 sms_send_failed` |
| Serviço indisponível | Login por telefone off | `503 otp_phone_unavailable` |
| Sucesso | Redirect / passo seguinte | JWT / recovery |

Todos os `detail` estáveis em i18n (`errors.json`, `auth.json`). Login OTP não usar mensagem genérica `loginError` para estes códigos.

---

## 10. Migrações futuras (Alembic)

| Migration | Conteúdo |
|-----------|----------|
| **M1** | Colunas §3 em `otp_codes`; índice `(phone, purpose, created_at DESC)` |
| **M2** | `otp_rate_bucket` (ou equivalente) |
| **M3** (fase 2) | `delivery_status_at`; opcional `sms_delivery_events` |

Backfill: `purpose='login'` em linhas existentes (dados non-prod).

---

## 11. Fases de implementação (quando houver go)

| Fase | Entregável |
|------|------------|
| 0 | Conta Bird STAG + sender + este doc |
| 1 | `OtpService` + invalidação + attempts + cooldown (PG) |
| 2 | `SmsSender` + `ConsoleSmsSender` + política DEV |
| 3 | `BirdSmsSender` + env STAG + smoke whitelist |
| 4 | Gates ambiente + `/config` + erros API |
| 5 | UX §9 |
| 6 | PROD + smoke PASS + flag |
| 7 (opc.) | Webhooks delivery |

Evoluir testes: `test_l_sec_12`, `test_l_sec_17`, `test_password_recovery`, contract tests Bird (HTTP mock).

---

## 12. Bloqueadores externos

| ID | Item |
|----|------|
| B1 | Conta Bird + faturação empresa |
| B2 | Sender / origem PT (registo operador) |
| B3 | Modo test/whitelist STAG documentado |
| B4 | DPA / subprocessador (privacidade) |
| B5 | Números equipa para smoke STAG |
| B6 | Runbook smoke + rollback (`OTP_PHONE_ENABLED=false`) |
| B7 | Custo unitário SMS (modelo A1) |

---

## 13. Critério exacto para **começar** a implementar S-AUTH-01

Implementação de código **só** quando **todas** forem verdade:

1. **Go explícito** do responsável de produto («implementa S-AUTH-01»).
2. **Conta Bird STAG** activa com credenciais recebidas e **pelo menos um** número whitelist confirmado por envio manual (fora do repo ou script one-off aprovado).
3. **Sender STAG** definido (alfanumérico ou número), ainda que provisório.
4. **Plano Render STAG** para variáveis (`BIRD_*`, `SMS_PROVIDER`, `OTP_PHONE_ENABLED=false` inicial).
5. **Aceitação** de que MVP **não** inclui webhook delivery (§6).
6. **Janela de teste STAG** acordada para onboarding telefone (passageiro + motorista pending).

**Até lá:** não implementar S-AUTH-01; DEV mantém mock; STAG/PROD mantêm OTP off (comportamento actual).

---

## Registo de decisão (uma linha)

OTP no backend; SMS via port `SmsSender`; Bird Messages como provider de referência MVP; estado e limites em **PostgreSQL**; delivery webhook **fase 2**; activação PROD condicionada a smoke; documento de arquitectura — **sem implementação associada a este commit**.

---

## Referências

- [`TVDE_DECISOES_PENDENTES_M2_M3_2026-09-25.md`](../business/TVDE_DECISOES_PENDENTES_M2_M3_2026-09-25.md) — secção A2 S-AUTH-01
- [`ROADMAP_FINAL_ENTREGA_TVDE_2026.md`](../ROADMAP_FINAL_ENTREGA_TVDE_2026.md) — C1 OTP SMS real
- [`07_AUTH_OTP.md`](../diagrams/07_AUTH_OTP.md)
- Código actual: `backend/app/api/routers/auth.py`, `backend/app/auth/otp.py`, `backend/app/api/auth_rate_limit.py`
