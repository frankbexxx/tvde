import { useCallback, useState } from "react"

const THEME_KEY = "tvde_theme"

export type ThemeId =
  | "portugal"
  | "dev"
  | "minimal"
  | "neon"

const THEMES: ThemeId[] = [
  "portugal",
  "dev",
  "minimal",
  "neon",
]

/**
 * Migração transparente: utilizadores com "portugal-dark" em localStorage
 * (antes do rename 2026-04-20) recebem "dev" no próximo load, sem flicker nem
 * erro. Não tentar migrar para "portugal" — perderia a escolha deliberada
 * de dark mode. "dev" agora é o slot onde o dark vive.
 */
const LEGACY_THEME_MAP: Record<string, ThemeId> = {
  "portugal-dark": "dev",
}

export function getTheme(): ThemeId {
  if (typeof window === "undefined") return "portugal"
  const stored = localStorage.getItem(THEME_KEY)
  if (stored && stored in LEGACY_THEME_MAP) {
    const migrated = LEGACY_THEME_MAP[stored]!
    localStorage.setItem(THEME_KEY, migrated)
    return migrated
  }
  if (stored && (THEMES as string[]).includes(stored)) return stored as ThemeId
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
