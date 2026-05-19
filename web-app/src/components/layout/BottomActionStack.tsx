import type { ReactNode } from 'react'

interface BottomActionStackProps {
  children: ReactNode
  className?: string
  testId?: string
}

/** Stack de CTAs fixos (motorista/passageiro — G13, G17, G18). */
export function BottomActionStack({ children, className = '', testId }: BottomActionStackProps) {
  return (
    <div
      className={`flex w-full flex-col gap-2 ${className}`.trim()}
      data-testid={testId ?? 'bottom-action-stack'}
    >
      {children}
    </div>
  )
}
