import type { CSSProperties } from 'react'
import type { ThemeId } from '@/hooks/useTheme'

export type AmbianceOption = {
  id: ThemeId
  label: string
  description: string
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
    id: 'atlantico',
    label: 'Atlântico',
    description: 'Costa atlântica — brisa, cinza-mar e verde suave.',
    swatch: {
      primary: '158 48% 34%',
      sheetBg: '0 0% 100%',
      sheetBorder: '205 22% 78%',
      menuGradient: '200 40% 88%',
    },
  },
  {
    id: 'dev',
    label: 'Nocturno',
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
    label: 'Neon (sandbox)',
    description: 'Experimental — alto contraste, só testes.',
    swatch: {
      primary: '280 100% 60%',
      sheetBg: '240 10% 10%',
      sheetBorder: '280 50% 28%',
      menuGradient: '280 100% 60%',
    },
  },
]

export const AUTO_AMBIANCE_HINT = 'Segue claro/escuro do telemóvel → Portugal (claro) ou Nocturno (escuro).'

export function ambianceSwatchStyle(swatch: AmbianceOption['swatch']): CSSProperties {
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
