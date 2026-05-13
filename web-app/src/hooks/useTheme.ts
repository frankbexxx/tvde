import { useCallback, useState } from "react"

const THEME_KEY = "tvde_theme"
const PREFERENCE_AUTO = "auto"

export type ThemeId =
  | "portugal"
  | "dev"
  | "minimal"
  | "neon"

/** Preferência persistida; `auto` segue o sistema operativo (claro = portugal, escuro = dev). */
export type ThemePreference = ThemeId | typeof PREFERENCE_AUTO

const THEMES: ThemeId[] = [
  "portugal",
  "dev",
  "minimal",
  "neon",
]

const LEGACY_THEME_MAP: Record<string, ThemeId> = {
  "portugal-dark": "dev",
}

function resolveEffectiveThemeId(pref: ThemePreference): ThemeId {
  if (pref !== PREFERENCE_AUTO) return pref
  if (typeof window === "undefined") return "portugal"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dev" : "portugal"
}

function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return PREFERENCE_AUTO
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === PREFERENCE_AUTO) return PREFERENCE_AUTO
  if (stored && stored in LEGACY_THEME_MAP) {
    const migrated = LEGACY_THEME_MAP[stored]!
    localStorage.setItem(THEME_KEY, migrated)
    return migrated
  }
  if (stored && (THEMES as string[]).includes(stored)) return stored as ThemeId
  return PREFERENCE_AUTO
}

/** Tema aplicado em `data-theme` (resolve `auto`). */
export function getTheme(): ThemeId {
  return resolveEffectiveThemeId(readStoredPreference())
}

export function getThemePreference(): ThemePreference {
  return readStoredPreference()
}

function applyPreference(pref: ThemePreference): void {
  if (pref === PREFERENCE_AUTO) {
    localStorage.setItem(THEME_KEY, PREFERENCE_AUTO)
  } else {
    localStorage.setItem(THEME_KEY, pref)
  }
  document.documentElement.setAttribute("data-theme", resolveEffectiveThemeId(pref))
}

export function setTheme(theme: ThemePreference): void {
  applyPreference(theme)
}

export function initTheme(): void {
  if (typeof window === "undefined") return
  const pref = readStoredPreference()
  document.documentElement.setAttribute("data-theme", resolveEffectiveThemeId(pref))

  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  mq.addEventListener("change", () => {
    const p = readStoredPreference()
    if (p !== PREFERENCE_AUTO) return
    document.documentElement.setAttribute("data-theme", resolveEffectiveThemeId(PREFERENCE_AUTO))
  })
}

export function useTheme(): [ThemePreference, (theme: ThemePreference) => void] {
  const [pref, setPrefState] = useState<ThemePreference>(() => readStoredPreference())

  const setPrefAndNotify = useCallback((p: ThemePreference) => {
    setPrefState(p)
    applyPreference(p)
  }, [])

  return [pref, setPrefAndNotify]
}

export { THEMES, PREFERENCE_AUTO as THEME_PREFERENCE_AUTO }
