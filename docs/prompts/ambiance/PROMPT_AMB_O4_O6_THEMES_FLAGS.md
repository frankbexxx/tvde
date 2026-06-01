# PROMPT AMB O-4–O-6 — Labels, Atlântico, temperos bandeira

**Estado:** executável  
**Pré-requisito:** O-1–O-3 ou paralelo após F1  
**Branch:** `feat/amb-o1-o6-shell-themes`

---

```
Fase AMB O-4–O-6 — Renomear labels UI, tema atlantico, temperos PT discretos

O-4 — Labels (UI only, ThemeId inalterado)
dev → Nocturno
neon → Neon (sandbox)
AUTO_AMBIANCE_HINT em ThemeSelector

O-5 — Tema atlantico
ThemeId: atlantico (5.º manual)
atlantico.css — costa PT, derivado portugal
useTheme THEMES[], index.css @import
ambianceMeta + ThemeSelector card
auto inalterado: claro→portugal, escuro→dev

O-6 — Temperos bandeira (4–6 touchpoints)
--color-flag-* em minimal/neon (fallbacks neutros)
AppMenuIdentity flagAccent (portugal/atlantico)
PartnerHomeDashboard KPI border-l flag-green (1 tile)
PrimaryActionButton focus-visible flag-blue
BrandStripe / InfoPanel — validar existentes
Proibido: mudar success/warning/destructive/info por tema; pintar mapa

Validação: npm run build + smoke 5 temas × 3 roles.
```
