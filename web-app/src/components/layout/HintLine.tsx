import type { ReactNode } from 'react'

interface HintLineProps {
  children: ReactNode
  className?: string
  testId?: string
}

/** Linha de dica centrada (motorista: mapa, poll, passos da viagem). */
export function HintLine({ children, className = '', testId }: HintLineProps) {
  return (
    <p
      className={`text-center text-sm text-foreground/70 px-1 leading-snug ${className}`.trim()}
      aria-live="polite"
      data-testid={testId}
    >
      {children}
    </p>
  )
}
