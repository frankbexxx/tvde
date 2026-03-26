# Panorama visual da app (TVDE web-app) — só informativo

Documento de referência: **o que existe hoje** no `web-app` (temas, tokens, componentes, padrões de layout).  
Não é um guia de alteração de código; serve para localizar onde está cada coisa.

---

## 1. Tema principal activo

### Nome / modo

- **Temas disponíveis** (definidos em `src/hooks/useTheme.ts`): `portugal`, `portugal-dark`, `minimal`, `neon`.
- **Tema por defeito** (se não houver valor em `localStorage` ou valor inválido): **`portugal`**.
- **Persistência**: chave `tvde_theme` em `localStorage`; o tema aplica-se com **`document.documentElement.setAttribute("data-theme", theme)`**.
- **Arranque**: `initTheme()` em `src/main.tsx` antes de montar a app.

### Ficheiros principais de tema / cores

| Ficheiro                                     | Papel                                                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `tailwind.config.js`                         | `darkMode: ["class", '[data-theme*="dark"]']`; `theme.extend.colors` mapeadas para variáveis CSS `--color-*`                    |
| `src/index.css`                              | `@import` dos tokens e temas; `@tailwind base/components/utilities`; estilos globais do `body`, gradiente de fundo, ruído, blob |
| `src/design-system/tokens.css`               | `--radius-*`, `--shadow-card`, `--shadow-floating`, transições                                                                  |
| `src/design-system/themes/portugal.css`      | Variáveis HSL para **portugal** (ex.: `--color-primary`, `--color-background`, …)                                               |
| `src/design-system/themes/portugal-dark.css` | Variante escura                                                                                                                 |
| `src/design-system/themes/minimal.css`       | Tema minimal                                                                                                                    |
| `src/design-system/themes/neon.css`          | Tema neon                                                                                                                       |

### Cores principais (exemplo: tema `portugal`)

Definidas em `:root` / `:root[data-theme="portugal"]` como **HSL sem `hsl()`** (só números), consumidas pelo Tailwind como `hsl(var(--color-primary))`:

```css
/* Excerto real — portugal.css */
--color-primary: 120 45% 38%;
--color-primary-foreground: 0 0% 100%;
--color-accent: 45 75% 58%;
--color-background: 45 25% 97%;
--color-foreground / --color-text: 222 40% 15%;
--color-muted: 45 30% 94%;
--color-muted-foreground: 222 25% 45%;
--color-destructive: 0 55% 50%;
--color-border: 45 20% 88%;
```

### Estratégia de dark mode

- **Atributo** `data-theme` no `<html>` (valores incluem `portugal-dark`, `neon` tratado no toaster como “escuro”).
- **Tailwind** `darkMode: ["class", '[data-theme*="dark"]']` — ou seja, **classe + selector em `data-theme`** que contenha `"dark"`.
- **Toasts** (`src/components/ui/sonner.tsx`): `getToastTheme()` devolve `"dark"` se `data-theme` contém `"dark"` ou é `"neon"`.

---

## 2. Sistema de componentes UI mais usados

### Botões

| Origem                             | Padrão                                                                                                                                                                                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shadcn-style**                   | `src/components/ui/button.tsx` — `cva` com variantes: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`; tamanhos `default`, `sm`, `lg`, `icon`. Classes base incluem `rounded-md`, `focus-visible:ring-ring`, `disabled:opacity-50`.           |
| **CTA fixo no fundo (passageiro)** | `src/components/layout/PrimaryActionButton.tsx` — **não** usa o `Button` genérico: `w-full`, `min-h-[52px]`, `rounded-full`, `font-bold`, `text-lg`, `shadow-floating`, gradiente `from-primary to-accent` (variante `primary`) ou `bg-destructive` (`danger`). |
| **Botões “inline”**                | Muitos `<button className="rounded-lg border …">` em dashboards e `routes/index.tsx` (ex.: “Tentar novamente”).                                                                                                                                                 |

**Exemplo de classes (Button default):**

```txt
bg-primary text-primary-foreground shadow hover:bg-primary/90
```

### Cards / containers

- **Tailwind**: `bg-card`, `border-border`, `rounded-2xl`, `shadow-card` (token em `tailwind.config.js` → `var(--shadow-card)`).
- **Mapa**: `MapView` — `rounded-2xl`, `shadow-card`, altura `45vh` / min-max em `src/maps/MapView.tsx`.
- **Planeamento passageiro**: `TripPlannerPanel` — `rounded-2xl`, `border`, `shadow-card`; estados `planning`/`confirming` com `bg-muted/50 dark:bg-zinc-950/50`.

### Alertas / feedback

- **Toasts**: `sonner` via `src/components/ui/sonner.tsx` + `<Toaster />` em `App.tsx`. Classes agrupadas com `bg-background`, `text-foreground`, `border-border`.
- **Erro global auth**: texto `text-destructive` em `routes/index.tsx` quando `loadError`.
- **Banners passageiro**: `StatusHeader` — bloco `rounded-2xl border px-4 py-4 text-center text-xl font-semibold` com cores por variante (`requested`, `assigned`, …).
- **Aviso geolocalização** (PassengerDashboard): `rounded-lg bg-warning/20 border border-warning/50`.

### Painéis laterais / overlays

- **Activity log**: `ActivityPanel` — `aside` com `bg-card/90 backdrop-blur-sm`, borda; em desktop `md:w-80`, `md:border-l`.
- **Definições / tema**: `SettingsButton` — **mobile**: `Dialog` (`DialogContent` ~`max-w-[280px] rounded-2xl`); **desktop**: `Sheet` `side="bottom"` com `rounded-t-2xl`.

### Formulários

- `src/components/ui/input.tsx` (stack shadcn).
- Login: `src/features/auth/LoginScreen.tsx` (inputs + botão de submit).

### Ícones

- **SVG inline** em vários sítios (ex.: ícone de definições em `SettingsButton.tsx`).
- **Sem** biblioteca tipo Lucide/Heroicons listada em dependências explícitas no excerto analisado (confirmar `package.json` se precisares de lista exacta).

### Loading

- `Spinner` (`src/components/ui/Spinner.tsx`): `animate-spin`, `border-muted border-t-primary`, tamanhos `sm|md|lg`.
- Splash auth: `Spinner size="lg"` + texto em `routes/index.tsx`.

---

## 3. Localização dos elementos mais importantes (estrutura)

| Elemento                              | Onde costuma estar                                                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Botão principal de acção (viagem)** | `PassengerDashboard` → `ScreenContainer` prop `bottomButton` → `PrimaryActionButton` (fixo em `ScreenContainer`: `fixed bottom-0`, `z-20`).      |
| **Cancelar / Pedir nova viagem**      | Mesmo `PrimaryActionButton` com `variant="danger"` quando label é Cancelar.                                                                      |
| **Header da app**                     | `AppRoutes` — `header` `sticky top-0`, `bg-background/80 backdrop-blur-md`, título “TVDE”, links Log / Sair / `SettingsButton` / `RoleSelector`. |
| **Estado da viagem (copy grande)**    | `PassengerDashboard` → `StatusHeader` (variante derivada de `passengerBanner.ts`).                                                               |
| **Painel planeamento (Uber-like)**    | `PassengerDashboard` → `TripPlannerPanel` (idle / planning / confirming / …).                                                                    |
| **Log de actividade**                 | `ActivityPanel` — coluna à direita em `md+`, abaixo em mobile; âncora `#activity-log-panel`.                                                     |
| **Loading inicial / erro rede**       | `AppRoutes` — primeiro `if (isLoading)` (spinner + `splashPrimary`), depois `if (loadError)` (erro + “Tentar novamente”).                        |
| **Login BETA**                        | `AppRoutes` — quando `betaMode && !isAuthenticated` → `LoginScreen`.                                                                             |

---

## 4. Como alterar visualmente (mapa mental — sem passos de código)

Esta secção indica **o que controla o quê** no desenho actual; não são instruções de patch.

- **Cor primária / fundo / texto**  
  → Variáveis em `src/design-system/themes/<tema>.css` (ex.: `--color-primary`, `--color-background`, `--color-text`). O Tailwind liga-as em `tailwind.config.js` (`primary`, `background`, `foreground`, …).

- **Raios e sombras dos cartões**  
  → `tokens.css` (`--radius-base`, `--radius-large`, `--shadow-card`) e uso de classes `rounded-2xl`, `shadow-card` nos componentes.

- **Gradiente e “atmosfera” do fundo**  
  → `index.css`: `body::before` (gradiente), `#bg-noise` (textura), `body::after` (blob radial com `--bg-atmo-shape` / `--color-primary`).

- **Botão grande no fundo (passageiro)**  
  → `PrimaryActionButton.tsx`: classes de tamanho (`min-h-[52px]`, `rounded-full`), gradiente `from-primary to-accent`, sombra `shadow-floating`.

- **Botões pequenos (UI genérica)**  
  → `components/ui/button.tsx` variantes/sizes.

- **Cabeçalho de estado colorido**  
  → `StatusHeader.tsx` mapa `VARIANT_STYLES` (liga `bg-primary`, `bg-accent`, `bg-muted`, `bg-destructive`, …).

- **Toasts**  
  → `sonner.tsx` (`toastOptions.classNames`) + tema claro/escuro derivado de `data-theme`.

- **Tema guardado**  
  → `localStorage` chave `tvde_theme`; selector de tema em `ThemeSelector` (importado em `SettingsButton`).

- **Dark “mais escuro”**  
  → Ficheiro `portugal-dark.css` (e/ou variáveis nesse tema), mais a regra Tailwind `darkMode` que escuta `data-theme` com `"dark"`.

---

## Snippets de referência (estado actual)

**Tailwind — ligação de cores (excerto):**

```js
// tailwind.config.js
colors: {
  primary: { DEFAULT: "hsl(var(--color-primary))", foreground: "hsl(var(--color-primary-foreground))" },
  background: "hsl(var(--color-background))",
  foreground: "hsl(var(--color-foreground))",
  // ...
}
```

**Lista de temas no código:**

```ts
// useTheme.ts
export type ThemeId = "portugal" | "portugal-dark" | "minimal" | "neon";
```

**Layout mobile com botão fixo:**

```tsx
// ScreenContainer.tsx — ideia estrutural
// área scroll + barra fixa bottom com border-t border-border shadow-card
```

---

_Última actualização: inventário baseado em `web-app/` (ficheiros listados acima). Para dependências exactas de ícones/fontes, ver `web-app/package.json` e `index.html`._
