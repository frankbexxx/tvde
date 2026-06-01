# Ambiance O-1–O-6 — build plan (onda 2)

**North star:** presença contida — chrome reage ao tema; mapa e semântica operacional intactos. Ver [`../ux/ambiance-chrome-contract.md`](../ux/ambiance-chrome-contract.md).

**Pré-requisito:** onda 1 (F0–F4 + F3b) merged em `main`.

**Branch:** `feat/amb-o1-o6-shell-themes` — **1 PR único**.

**Fora de scope:** O-7 (E2E Aspeto), O-8 (Admin), mapa tiles, árvore menu v2.

---

## Artefactos

| Ficheiro | Conteúdo |
|----------|----------|
| [`AMBIANCE_O1_O6_BUILD.md`](AMBIANCE_O1_O6_BUILD.md) | Este ficheiro |
| [`../prompts/ambiance/PROMPT_AMB_O1_O6_SHELL_MENUS.md`](../prompts/ambiance/PROMPT_AMB_O1_O6_SHELL_MENUS.md) | O-1 + O-2 + O-3 |
| [`../prompts/ambiance/PROMPT_AMB_O4_O6_THEMES_FLAGS.md`](../prompts/ambiance/PROMPT_AMB_O4_O6_THEMES_FLAGS.md) | O-4 + O-5 + O-6 |

---

## Mapa de fases

| ID | Nome | Ficheiros principais |
|----|------|----------------------|
| **O-1** | AppMenuShell | `web-app/src/components/layout/AppMenuShell.tsx` |
| **O-2** | Paridade menus | `DriverSideMenu`, `PassengerSideMenu`, `PartnerSideMenu` |
| **O-3** | Wayfinding | `*MenuNav.ts`, dashboards, `AppMenuRow active` |
| **O-4** | Labels UI | `ambianceMeta.ts`, `ThemeSelector.tsx` |
| **O-5** | Tema Atlântico | `atlantico.css`, `useTheme.ts`, `index.css` |
| **O-6** | Temperos bandeira | `--color-flag-*`, touchpoints lista fechada |

---

## Gates / validação

```bash
cd web-app && npm run build
```

### Smoke checklist

| Role | Verificar |
|------|-----------|
| Partner | Raiz identidade + secções; wayfinding Frota/Caixa; hubs inalterados |
| Driver | Secções Operação/Conta/Config; highlight Rendimentos/Caixa |
| Passageiro | Secções + badge Passageiro; highlight Histórico/Conta |
| Aspeto | 5 temas + Auto; labels Nocturno + Atlântico |
| Mapa | Tiles inalterados |

---

## Estado

| ID | Estado |
|----|--------|
| O-1 | Concluído |
| O-2 | Concluído |
| O-3 | Concluído |
| O-4 | Concluído |
| O-5 | Concluído |
| O-6 | Concluído |
