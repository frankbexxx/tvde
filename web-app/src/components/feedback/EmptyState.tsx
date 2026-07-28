import type { ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  description?: string
  action?: ReactNode
  testId?: string
  className?: string
}

/** Empty list / filter feedback — presentational only; pass already-translated strings. */
export function EmptyState({ title, description, action, testId, className }: EmptyStateProps) {
  const rootClass = ['text-sm text-muted-foreground', className].filter(Boolean).join(' ')

  return (
    <div className={rootClass} data-testid={testId}>
      <p>{title}</p>
      {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
