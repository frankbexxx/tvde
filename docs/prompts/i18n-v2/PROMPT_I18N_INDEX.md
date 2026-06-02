# PROMPT_I18N_INDEX — pacote i18n v2

Baseline: `3988fcfed7116ebbab7ec0dea6c3cae4a9a0e121 (PR #353 merged)`

## Ordem de execução (série)

E0 → X1 → P1P2 → P3 → P4P5 → P6 → X2 → D7 → D1 → D2 → D3 → D4 → D5 → D6 → X0 → R1 → R2 → R3 → R4 → R5 → R6 → Z0

## Namespaces

| Namespace | Uso |
|-----------|-----|
| `common` | Voltar, Fechar, menu shell (X1) |
| `trip` | Estados viagem, pagamento |
| `auth` | Login, landing |
| `passenger` / `driver` / `partner` | Copy por shell |
| `settings` | Idioma, aspeto, activity log |
| `errors` | Só via `apiErrors.ts` |

## Índice

| ID | Ficheiro | Estado | Depende de | Notas |
|----|----------|--------|------------|-------|
| E0 | [PROMPT_I18N_00_LOGIN_LANDING_LOCALE.md](./PROMPT_I18N_00_LOGIN_LANDING_LOCALE.md) | Concluído | #353 | branch feat/i18n-pt-en |
| X1 | [PROMPT_I18N_01_APP_MENU_SHELL.md](./PROMPT_I18N_01_APP_MENU_SHELL.md) | Concluído | E0 | |
| P1P2 | [PROMPT_I18N_P1P2_PASSENGER_MAP_SHEETS.md](./PROMPT_I18N_P1P2_PASSENGER_MAP_SHEETS.md) | Concluído | X1 | |
| P3 | [PROMPT_I18N_P3_PASSENGER_CANCEL_RATING.md](./PROMPT_I18N_P3_PASSENGER_CANCEL_RATING.md) | Concluído | P1P2 | |
| P4P5 | [PROMPT_I18N_P4P5_PASSENGER_MENU.md](./PROMPT_I18N_P4P5_PASSENGER_MENU.md) | Concluído | X1,P1P2 | |
| P6 | [PROMPT_I18N_P6_PASSENGER_ACCOUNT.md](./PROMPT_I18N_P6_PASSENGER_ACCOUNT.md) | Concluído | P4P5 | |
| X2 | [PROMPT_I18N_02_SHARED_TRIP_CARDS.md](./PROMPT_I18N_02_SHARED_TRIP_CARDS.md) | Concluído | P1P2 | |
| D7 | [PROMPT_I18N_D7_DRIVER_MAP_AVAILABLE.md](./PROMPT_I18N_D7_DRIVER_MAP_AVAILABLE.md) | Concluído | X2 | |
| D1 | [PROMPT_I18N_D1_DRIVER_MENU_ROOT.md](./PROMPT_I18N_D1_DRIVER_MENU_ROOT.md) | Concluído | X1 | |
| D2 | [PROMPT_I18N_D2_DRIVER_TRIPS_INBOX.md](./PROMPT_I18N_D2_DRIVER_TRIPS_INBOX.md) | Concluído | D1 | legacy menu |
| D3 | [PROMPT_I18N_D3_DRIVER_NAV_CATEGORIES.md](./PROMPT_I18N_D3_DRIVER_NAV_CATEGORIES.md) | Concluído | D1 | legacy menu |
| D4 | [PROMPT_I18N_D4_DRIVER_ZONES.md](./PROMPT_I18N_D4_DRIVER_ZONES.md) | Concluído | D3 | legacy menu |
| D5 | [PROMPT_I18N_D5_DRIVER_DOCUMENTS.md](./PROMPT_I18N_D5_DRIVER_DOCUMENTS.md) | Concluído | D1 | legacy menu |
| D6 | [PROMPT_I18N_D6_DRIVER_PROFILE_EARNINGS.md](./PROMPT_I18N_D6_DRIVER_PROFILE_EARNINGS.md) | Concluído | D1 | legacy menu |
| X0 | [PROMPT_I18N_03_SETTINGS_SHELL.md](./PROMPT_I18N_03_SETTINGS_SHELL.md) | Concluído | P6,D6 | |
| R1 | [PROMPT_I18N_R1_PARTNER_MENU_ROOT.md](./PROMPT_I18N_R1_PARTNER_MENU_ROOT.md) | Concluído | X1,P4P5 | |
| R2 | [PROMPT_I18N_R2_PARTNER_FLEET.md](./PROMPT_I18N_R2_PARTNER_FLEET.md) | Concluído | R1 | |
| R3 | [PROMPT_I18N_R3_PARTNER_TRIPS.md](./PROMPT_I18N_R3_PARTNER_TRIPS.md) | Concluído | R1 | |
| R4 | [PROMPT_I18N_R4_PARTNER_OPS.md](./PROMPT_I18N_R4_PARTNER_OPS.md) | Concluído | R1 | |
| R5 | [PROMPT_I18N_R5_PARTNER_DETAIL.md](./PROMPT_I18N_R5_PARTNER_DETAIL.md) | Concluído | R2,R3 | |
| R6 | [PROMPT_I18N_R6_PARTNER_HOME.md](./PROMPT_I18N_R6_PARTNER_HOME.md) | Concluído | R1 | |
| Z0 | [PROMPT_I18N_Z0_REGRESSION_GATE.md](./PROMPT_I18N_Z0_REGRESSION_GATE.md) | Concluído | por lote | build/test/lint OK |
| X3 | [PROMPT_I18N_X3_LEGAL_POLICY.md](./PROMPT_I18N_X3_LEGAL_POLICY.md) | Bloqueado | decisão | 1 PR |

## Tracker (opcional)

Sincronizar com [EXTRA-2026-05-13-EXECUTION-TRACKER.md](../EXTRA-2026-05-13-EXECUTION-TRACKER.md) se existir.
