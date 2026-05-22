import type { HTMLAttributes, ReactNode } from 'react'
import { MAP_BOTTOM_SHEET } from './infoBoxTemplate'

export interface MapBottomSheetProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  testId?: string
}

/** Caixa encostada ao fundo do mapa — mapa full-bleed por trás (dia 22). */
export function MapBottomSheet({
  children,
  className = '',
  testId,
  ...rest
}: MapBottomSheetProps) {
  return (
    <div
      className={`${MAP_BOTTOM_SHEET} ${className}`.trim()}
      data-testid={testId ?? 'map-bottom-sheet'}
      {...rest}
    >
      {children}
    </div>
  )
}
