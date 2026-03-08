# Design System — Instalação Completa

Tudo foi instalado e configurado. Se precisares de refazer ou verificar:

---

## Dependências instaladas

```bash
cd web-app
npm install tailwindcss-animate class-variance-authority clsx tailwind-merge
npm install lucide-react sonner
# Radix (adicionados pelo shadcn):
# @radix-ui/react-alert-dialog, @radix-ui/react-avatar, @radix-ui/react-dialog,
# @radix-ui/react-progress, @radix-ui/react-slot, @radix-ui/react-tabs
```

---

## shadcn/ui (se precisares de adicionar mais componentes)

```bash
cd web-app
npx shadcn@latest add <componente> --yes
```

Exemplo: `npx shadcn@latest add dropdown-menu --yes`

---

## Verificação

```bash
cd web-app
npm run build
npm run dev
```

Abre http://localhost:5173 — clica no ícone de engrenagem no header para mudar o tema.

---

## O que foi feito

- shadcn/ui: button, card, dialog, sheet, input, avatar, tabs, alert-dialog, progress, sonner, badge
- Design tokens e 4 temas (Portugal, Portugal Dark, Minimal, Neon)
- useTheme hook + SettingsButton + ThemeSelector
- Componentes exemplo: RideRequestCard, DriverPanelCard, TripStatusCard
- Micro-animações em botões e cards
- Integração no header, RoleSelector, LoginScreen, PrimaryActionButton
