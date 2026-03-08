import { useCallback, useState } from "react"

const THEME_KEY = "tvde_theme"

export type ThemeId =
  | "portugal"
  | "portugal-dark"
  | "minimal"
  | "neon"

const THEMES: ThemeId[] = [
  "portugal",
  "portugal-dark",
  "minimal",
  "neon",
]

export function getTheme(): ThemeId {
  if (typeof window === "undefined") return "portugal"
  const stored = localStorage.getItem(THEME_KEY) as ThemeId | null
  if (stored && THEMES.includes(stored)) return stored
  return "portugal"
}

function applyTheme(theme: ThemeId): void {
  document.documentElement.setAttribute("data-theme", theme)
  localStorage.setItem(THEME_KEY, theme)
}

export function setTheme(theme: ThemeId): void {
  applyTheme(theme)
}

export function initTheme(): void {
  const theme = getTheme()
  document.documentElement.setAttribute("data-theme", theme)
}

/** Hook para componentes que precisam re-renderizar ao mudar o tema */
export function useTheme(): [ThemeId, (theme: ThemeId) => void] {
  const [theme, setThemeState] = useState<ThemeId>(() => getTheme())

  const setThemeAndNotify = useCallback((t: ThemeId) => {
    setThemeState(t)
    applyTheme(t)
  }, [])

  return [theme, setThemeAndNotify]
}

export { THEMES }
