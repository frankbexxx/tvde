# Comparação Swagger (OpenAPI) vs Web-App

**Objetivo:** Mapear igualdades e diferenças entre a API documentada no Swagger (FastAPI/OpenAPI) e o que a web-app usa, e explicar o porquê.

---

## 1. ENDPOINTS USADOS PELA WEB-APP (IGUALDADES)

| Endpoint | Método | Web-App | Swagger | Observação |
|----------|--------|---------|---------|------------|
| `/config` | GET | ✅ auth.ts | ✅ | Config BETA mode |
| `/auth/login` | POST | ✅ auth.ts | ✅ | Login BETA |
| `/auth/otp/request` | POST | ✅ auth.ts | ✅ | Não usado em BETA |
| `/auth/otp/verify` | POST | ✅ auth.ts | ✅ | Não usado em BETA |
| `/dev/tokens` | POST | ✅ auth.ts | ✅ | Dev mode (não BETA) |
| `/dev/seed` | POST | ✅ DevTools | ✅ | Seed DB |
| `/dev/auto-trip` | POST | ✅ DevTools | ✅ | Criar viagem automática |
| `/trips` | POST | ✅ trips.ts | ✅ | Criar viagem |
| `/trips/history` | GET | ✅ trips.ts | ✅ | Histórico passageiro |
| `/trips/{trip_id}` | GET | ✅ trips.ts | ✅ | Detalhe viagem |
| `/trips/{trip_id}/cancel` | POST | ✅ trips.ts | ✅ | Cancelar viagem |
| `/trips/{trip_id}/driver-location` | GET | ✅ trackingService | ✅ | Localização motorista |
| `/driver/status/online` | POST | ✅ trips.ts | ✅ | Motorista online |
| `/driver/status/offline` | POST | ✅ trips.ts | ✅ | Motorista offline |
| `/driver/trips/available` | GET | ✅ trips.ts | ✅ | Viagens disponíveis |
| `/driver/trips/history` | GET | ✅ trips.ts | ✅ | Histórico motorista |
| `/driver/trips/{trip_id}` | GET | ✅ trips.ts | ✅ | Detalhe viagem motorista |
| `/driver/trips/{trip_id}/accept` | POST | ✅ trips.ts | ✅ | Aceitar viagem |
| `/driver/trips/{trip_id}/arriving` | POST | ✅ trips.ts | ✅ | Cheguei |
| `/driver/trips/{trip_id}/start` | POST | ✅ trips.ts | ✅ | Iniciar viagem |
| `/driver/trips/{trip_id}/complete` | POST | ✅ trips.ts | ✅ | Concluir viagem |
| `/driver/trips/{trip_id}/cancel` | POST | ✅ trips.ts | ✅ | Cancelar (motorista) |
| `/drivers/location` | POST | ✅ locationService | ✅ | Enviar localização |
| `/admin/pending-users` | GET | ✅ AdminDashboard | ✅ | Utilizadores pendentes |
| `/admin/users` | GET | ✅ AdminDashboard | ✅ | Lista utilizadores |
| `/admin/approve-user` | POST | ✅ AdminDashboard | ✅ | Aprovar utilizador |
| `/admin/users/{user_id}/promote-driver` | POST | ✅ AdminDashboard | ✅ | Promover a motorista |
| `/admin/users/{user_id}/demote-driver` | POST | ✅ AdminDashboard | ✅ | Despromover motorista |
| `/admin/users/{user_id}` | PATCH, DELETE | ✅ AdminDashboard | ✅ | Editar/apagar user |
| `/admin/trips/active` | GET | ✅ admin.ts | ✅ | Viagens ativas |
| `/admin/trips/{trip_id}` | GET | ✅ admin.ts | ✅ | Detalhe viagem admin |
| `/admin/trip-debug/{trip_id}` | GET | ✅ admin.ts | ✅ | Debug viagem |
| `/admin/trips/{trip_id}/assign` | POST | ✅ trips.ts, admin.ts | ✅ | Atribuir viagem |
| `/admin/cancel-trip/{trip_id}` | POST | ✅ admin.ts | ✅ | Cancelar viagem |
| `/admin/system-health` | GET | ✅ admin.ts | ✅ | Saúde do sistema |
| `/admin/metrics` | GET | ✅ admin.ts | ✅ | Métricas |
| `/admin/run-timeouts` | POST | ✅ trips.ts, admin.ts | ✅ | Executar timeouts |
| `/admin/run-offer-expiry` | POST | ✅ admin.ts | ✅ | Expirar ofertas |
| `/admin/recover-driver/{driver_id}` | POST | ✅ admin.ts | ✅ | Recuperar motorista |
| `/admin/export-logs` | GET | ✅ admin.ts | ✅ | Exportar logs CSV |
| `/debug/trip-matching/{trip_id}` | GET | ✅ DevTools | ✅ | Diagnóstico viagem |
| `/debug/driver-eligibility` | GET | ✅ DevTools | ✅ | Diagnóstico motorista |
| `/logs/lifecycle` | POST | ✅ logs.ts | ✅ | Log lifecycle (AppLifecycleLogger) |

---

## 2. ENDPOINTS NO SWAGGER NÃO USADOS PELA WEB-APP (DIFERENÇAS)

| Endpoint | Método | Porquê não usado |
|----------|--------|------------------|
| `/` | GET | Health root — usado por load balancers, não pelo frontend |
| `/health` | GET | Health check — usado por infra, não pela app |
| `/driver/offers` | GET | **Multi-offer dispatch:** lista ofertas pendentes. A web-app usa `/driver/trips/available` que agrega viagens com ofertas. O fluxo atual é "viagens disponíveis" (trip-centric), não "ofertas" (offer-centric). |
| `/driver/offers/{offer_id}/accept` | POST | **Alternativa ao accept por trip_id.** O backend tem dois fluxos: (1) accept por `trip_id` via `/driver/trips/{trip_id}/accept`, (2) accept por `offer_id` via `/driver/offers/{offer_id}/accept`. A web-app usa apenas (1). O (2) é mais preciso (aceita oferta específica) mas exige que o frontend mostre ofertas, não viagens. |
| `/driver/offers/{offer_id}/reject` | POST | Rejeitar oferta. A web-app não mostra ofertas individuais; o motorista vê viagens e aceita uma. Rejeição não está na UI. |
| `/matching/find-driver` | POST | **Legado/simulador.** Endpoint de matching direto. O fluxo atual usa multi-offer dispatch (create_trip → create_offers_for_trip). Não usado pela web-app. |
| `/cron/jobs` | GET | Cron interno (cron-job.org). Não é chamado pelo frontend. |
| `/admin/drivers/{driver_id}/approve` | POST | Aprovar perfil de motorista. A web-app usa `/admin/approve-user` e `/admin/users/{user_id}/promote-driver` para aprovação de utilizadores. Este endpoint é para aprovar o perfil Driver (documents, etc.), não o user. |
| `/admin/drivers/{driver_id}/reject` | POST | Rejeitar perfil de motorista. Não exposto na UI admin. |
| `/dev/reset` | POST | Reset DB (truncate). DevTools não expõe. |
| `/dev/seed-simulator` | POST | Seed para simulador (muitos users). Não usado na web-app. |
| `/dev/promote-to-driver` | POST | Promover user a motorista (dev). Alternativa a admin promote. |
| `/dev/trips` | GET | Listar viagens (dev). Não usado na web-app. |
| `/debug/driver-locations` | GET | Lista todas as localizações de motoristas. DevTools usa trip-matching e driver-eligibility, não este. |
| `/trips/{trip_id}/rate` | POST | **Passageiro avalia motorista.** Backend implementado; web-app não tem UI de rating pós-viagem. |
| `/driver/trips/{trip_id}/rate` | POST | **Motorista avalia passageiro.** Backend implementado; web-app não tem UI de rating. |
| `/webhooks/stripe` | POST | Chamado pelo Stripe, não pelo frontend. |

---

## 3. RESUMO POR CATEGORIA

### 3.1 Fluxo de motorista: duas vias no backend

O backend expõe **dois modelos** para o motorista aceitar viagens:

1. **Trip-centric** (usado pela web-app):
   - `GET /driver/trips/available` → lista viagens com ofertas para o motorista
   - `POST /driver/trips/{trip_id}/accept` → aceita a viagem (o serviço resolve qual oferta usar)

2. **Offer-centric** (não usado):
   - `GET /driver/offers` → lista ofertas pendentes
   - `POST /driver/offers/{offer_id}/accept` → aceita oferta específica
   - `POST /driver/offers/{offer_id}/reject` → rejeita oferta

**Porquê:** O fluxo trip-centric é mais simples para a UI: "viagens disponíveis" em vez de "ofertas". O backend suporta ambos; a web-app escolheu o primeiro.

### 3.2 Rating (avaliação)

- **Backend:** `POST /trips/{trip_id}/rate` e `POST /driver/trips/{trip_id}/rate` existem.
- **Web-app:** Não há ecrã de rating após viagem concluída.

**Porquê:** Feature de rating ainda não integrada na UX.

### 3.3 Admin: approve-user vs drivers/approve

- `/admin/approve-user` — aprova user pendente (status → active)
- `/admin/users/{user_id}/promote-driver` — promove user a motorista (role → driver)
- `/admin/drivers/{driver_id}/approve` — aprova perfil Driver (documents, etc.)

**Porquê:** A web-app trata aprovação de users e promoção a motorista. O approve de perfil Driver é um passo separado (documentos) que a UI admin não expõe.

### 3.4 Dev/Debug

A web-app usa apenas um subconjunto dos endpoints de dev e debug. Os restantes servem para testes manuais, scripts ou ferramentas externas.

---

## 4. CONCLUSÃO

| Métrica | Valor |
|---------|-------|
| Endpoints no Swagger | ~50 |
| Endpoints usados pela web-app | ~38 |
| Endpoints não usados | ~12 |

**Principais diferenças:**

1. **Offer flow** — Backend tem fluxo por ofertas; web-app usa fluxo por viagens.
2. **Rating** — Backend pronto; frontend sem UI.
3. **Admin drivers** — Endpoints de aprovação de perfil Driver não usados.
4. **Dev/Debug** — Subconjunto usado; resto para ferramentas.
5. **Infra** — `/`, `/health`, `/cron`, `/webhooks` não são para o frontend.

A API está **bem alinhada** para o fluxo principal (passageiro, motorista, admin). As diferenças refletem escolhas de UX (trip vs offer) e features ainda não implementadas no frontend (rating).
