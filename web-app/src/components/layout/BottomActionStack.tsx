import type { ReactNode } from 'react'

interface BottomActionStackProps {
  children: ReactNode
  className?: string
  testId?: string
  /** TW-04: motorista em viagem — Iniciar | Cancelar lado a lado. */
  direction?: 'column' | 'row'
}

/** Stack de CTAs fixos (motorista/passageiro — G13, G17, G18). */
export function BottomActionStack({
  children,
  className = '',
  testId,
  direction = 'column',
}: BottomActionStackProps) {
  const layout =
    direction === 'row' ? 'flex w-full flex-row items-stretch gap-2' : 'flex w-full flex-col gap-2'
  return (
    <div
      className={`${layout} ${className}`.trim()}
      data-testid={testId ?? 'bottom-action-stack'}
    >
      {children}
    </div>
  )
}
