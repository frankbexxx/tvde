# Verificação rápida — variáveis de ambiente

**Objectivo:** uma página para cruzar **local vs Render** sem abrir o código.  
**Regra:** actualizar **no fim** de qualquer sessão em que criem ou alterem variáveis.  
**Fonte de verdade do modelo backend:** `C:\dev\APP\backend\app\core\config.py`  
**Templates:** `C:\dev\APP\docs\env\templates\backend.env.example`, `C:\dev\APP\docs\env\templates\web-app.env.local.example`

**Segredos:** nunca colar valores reais neste ficheiro.

---

## Web — `C:\dev\APP\web-app\.env.local` vs Render **tvde-app**

| Variável | `.env.local` | tvde-app | Nota |
|----------|--------------|----------|------|
| `VITE_API_URL` | **SIM** (ou omitir → proxy `/api` em dev) | **SIM** | Render: URL da API **sem** `/` final. |
| `VITE_MAPTILER_KEY` | **SIM** se mapas | **SIM** se mapas | Não mostrar valor em chats. |
| `VITE_DRIVER_BOTTOM_NAV` | **SIM** (ou omitir) | **SIM** (ou omitir) | Alinhar para mesmo UX. |
| `VITE_DRIVER_HOME_TWO_STEP` | **SIM** (ou omitir) | Idem | Idem. |
| `VITE_SENTRY_DSN` | **SIM** (ou omitir) | Idem | Opcional. |
| `VITE_STRIPE_MOCK` | **SIM** | **SIM** | Deve existir explícito; mock = string `true`. |
| `VITE_STRIPE_PUBLISHABLE_KEY` | **SIM** se `VITE_STRIPE_MOCK=false` | Idem | |
| `VITE_APP_DOWNLOAD_URL` | Opcional | Opcional | |
| `VITE_E2E` | **Só** Playwright/CI | **NÃO** em produção | |

Mudar qualquer `VITE_*` no Render → **novo build** do static.

---

## API — `C:\dev\APP\backend\.env` vs Render **tvde-api**

| Variável | `.env` (local) | tvde-api | Nota |
|----------|----------------|----------|------|
| `DATABASE_URL` | **SIM** | **SIM** | Essencial. |
| `JWT_SECRET_KEY` | **SIM** | **SIM** | Essencial. |
| `JWT_ALGORITHM` | Opcional | Opcional | Default `HS256` no código. |
| `JWT_ACCESS_TOKEN_MINUTES` | Opcional | Opcional | Default no código. |
| `OTP_SECRET` | **SIM** | **SIM** | Essencial. |
| `OTP_EXPIRATION_MINUTES` | Opcional | Opcional | Default no código. |
| `STRIPE_MOCK` | **SIM** | **SIM** | Explícito; alinhar política mock vs real. |
| `STRIPE_SECRET_KEY` | **SIM** se mock `false` | Idem | |
| `STRIPE_WEBHOOK_SECRET` | **SIM** se mock `false` | Idem | |
| `ENV` | **SIM** | **SIM** | Ou usar `ENVIRONMENT`. |
| `ENVIRONMENT` | Opcional | Opcional | Sobrepõe etiqueta se definido. |
| `ENABLE_DEV_TOOLS` | **SIM** | **SIM** | Produção: normalmente `false`. |
| `BETA_MODE` | **SIM** | **SIM** | Compat legado; preferir flags explícitas abaixo antes do flip. |
| `ENABLE_DEBUG_ROUTES` | Opcional | Opcional | `None` herda BETA. Alvo piloto: prod `false`, staging `true`. |
| `ENABLE_BETA_MATCHING_FALLBACKS` | Opcional | Opcional | `None` herda BETA. Alvo piloto: `true` temporário. |
| `REQUIRE_PENDING_APPROVAL` | Opcional | Opcional | `None` herda BETA. OTP signup pending+approve. Google = sempre pending. |
| `ENFORCE_PT_PHONE` | Opcional | Opcional | `None` herda BETA. `+351` em OTP request / password login. |
| `ENABLE_DEMO_USERS` | Opcional | Opcional | `None` herda BETA. Login `is_test_account` + `TEST_ACCOUNT_PASSWORD`. |
| `CORS_ALLOWED_ORIGINS` | **SIM** se testar front sem proxy / espelhar prod | **SIM** em produção | Origens exactas; vírgulas; sem `*`. |
| `ADMIN_PHONE` | Opcional | Opcional | Owner phone: seed protection + admin mutation guards. **Does not** grant `super_admin` (or any role) at OTP/password login — roles come from the DB only (L-AUTH-01). |
| `MAX_BETA_USERS` | Opcional | Opcional | Default `30` no código. |
| `DEFAULT_PASSWORD` | Opcional | Opcional | Default no código `123456`. |
| `CRON_SECRET` | **SIM** se usar cron protegido | Idem | |
| `SENTRY_DSN` | Opcional | Opcional | Lido em `C:\dev\APP\backend\app\sentry.py`. |
| `SENTRY_ENVIRONMENT` | Opcional | Opcional | |
| `SENTRY_RELEASE` | Opcional | Opcional | Mesmo ficheiro `sentry.py`. |
| `GOOGLE_OAUTH_CLIENT_ID` | **SIM** para OAuth activo | **SIM** | Podem ficar vazios se OAuth desligado. |
| `GOOGLE_OAUTH_CLIENT_SECRET` | **SIM** para OAuth activo | **SIM** | **Nunca** no front. |
| `DEBUG_RUNTIME_LOGS` | Opcional | Opcional | Default `false`. |

### NÃO pertencem a `C:\dev\APP\backend\.env`

| Variável | Onde corre |
|----------|------------|
| `VITE_*` | **Só** `C:\dev\APP\web-app\.env.local` (e Build env Render **tvde-app**). |
| `TVDE_MAPTILER_API_KEY` | **Não usado** no repo — remover se existir no `.env` backend. |

---

_Data da última revisão desta página: alinhar ao commit em que a criaste; actualizar quando mudares env._
