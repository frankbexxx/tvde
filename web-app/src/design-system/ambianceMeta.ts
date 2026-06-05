import type { CSSProperties } from 'react'
import type { ThemeId } from '@/hooks/useTheme'

export type AmbianceSwatch = {
  primary: string
  sheetBg: string
  sheetBorder: string
  menuGradient: string
}

export type AmbianceThemeMeta = {
  id: ThemeId
  swatch: AmbianceSwatch
}

/** Theme ids shown in Settings → Appearance (order preserved). */
export const AMBIANCE_THEME_OPTIONS: AmbianceThemeMeta[] = [
  {
    id: 'portugal',
    swatch: {
      primary: '150 55% 36%',
      sheetBg: '0 0% 100%',
      sheetBorder: '210 15% 80%',
      menuGradient: '150 45% 92%',
    },
  },
  {
    id: 'atlantico',
    swatch: {
      primary: '158 48% 34%',
      sheetBg: '0 0% 100%',
      sheetBorder: '205 22% 78%',
      menuGradient: '200 40% 88%',
    },
  },
  {
    id: 'dev',
    swatch: {
      primary: '150 55% 42%',
      sheetBg: '222 47% 12%',
      sheetBorder: '222 47% 22%',
      menuGradient: '150 55% 42%',
    },
  },
  {
    id: 'minimal',
    swatch: {
      primary: '220 14% 30%',
      sheetBg: '0 0% 100%',
      sheetBorder: '220 13% 84%',
      menuGradient: '220 14% 96%',
    },
  },
  {
    id: 'neon',
    swatch: {
      primary: '280 100% 60%',
      sheetBg: '240 10% 10%',
      sheetBorder: '280 50% 28%',
      menuGradient: '280 100% 60%',
    },
  },
]

/** @deprecated use AMBIANCE_THEME_OPTIONS */
export const AMBIANCE_OPTIONS = AMBIANCE_THEME_OPTIONS

export function ambianceSwatchStyle(swatch: AmbianceSwatch): CSSProperties {
  return {
    ['--swatch-primary' as string]: swatch.primary,
    ['--swatch-sheet-bg' as string]: swatch.sheetBg,
    ['--swatch-sheet-border' as string]: swatch.sheetBorder,
    ['--swatch-menu-gradient' as string]: swatch.menuGradient,
  }
}

export function themeUsesFlagAccent(themeId: ThemeId): boolean {
  return themeId === 'portugal' || themeId === 'atlantico'
}
