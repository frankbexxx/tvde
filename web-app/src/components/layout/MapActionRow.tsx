import type { ReactNode } from 'react'

interface MapActionRowProps {
  children: ReactNode
  className?: string
  testId?: string
}

/** Botões lado a lado dentro da caixa sobre o mapa (dia 23). */
export function MapActionRow({ children, className = '', testId }: MapActionRowProps) {
  return (
    <div
      className={`flex w-full flex-row items-stretch gap-2 ${className}`.trim()}
      data-testid={testId ?? 'map-action-row'}
    >
      {children}
    </div>
  )
}
