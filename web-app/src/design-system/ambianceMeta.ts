import type { CSSProperties } from 'react'
import type { ThemeId } from '@/hooks/useTheme'

export type AmbianceOption = {
  id: ThemeId
  label: string
  description: string
  /** HSL components — espelham design-system/themes/*.css */
  swatch: {
    primary: string
    sheetBg: string
    sheetBorder: string
    menuGradient: string
  }
}

export const AMBIANCE_OPTIONS: AmbianceOption[] = [
  {
    id: 'portugal',
    label: 'Portugal',
    description: 'Claro, operacional — marca PT discreta.',
    swatch: {
      primary: '150 55% 36%',
      sheetBg: '0 0% 100%',
      sheetBorder: '210 15% 80%',
      menuGradient: '150 45% 92%',
    },
  },
  {
    id: 'dev',
    label: 'Dev (sandbox)',
    description: 'Escuro, menos glare — ideal à noite.',
    swatch: {
      primary: '150 55% 42%',
      sheetBg: '222 47% 12%',
      sheetBorder: '222 47% 22%',
      menuGradient: '150 55% 42%',
    },
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Neutro — dados e listas em primeiro.',
    swatch: {
      primary: '220 14% 30%',
      sheetBg: '0 0% 100%',
      sheetBorder: '220 13% 84%',
      menuGradient: '220 14% 96%',
    },
  },
  {
    id: 'neon',
    label: 'Neon',
    description: 'Experimental — alto contraste, sandbox.',
    swatch: {
      primary: '280 100% 60%',
      sheetBg: '240 10% 10%',
      sheetBorder: '280 50% 28%',
      menuGradient: '280 100% 60%',
    },
  },
]

export function ambianceSwatchStyle(swatch: AmbianceOption['swatch']): CSSProperties {
  return {
    ['--swatch-primary' as string]: swatch.primary,
    ['--swatch-sheet-bg' as string]: swatch.sheetBg,
    ['--swatch-sheet-border' as string]: swatch.sheetBorder,
    ['--swatch-menu-gradient' as string]: swatch.menuGradient,
  }
}
