import type { ReactNode } from 'react'

type ErrorBannerProps = {
  message: string
  testId?: string
  className?: string
  role?: 'alert' | 'status'
  /** Optional retry / dismiss control — presentational only. */
  action?: ReactNode
}

/** Inline error feedback — presentational only; pass already-translated strings. */
export function ErrorBanner({
  message,
  testId,
  className,
  role = 'alert',
  action,
}: ErrorBannerProps) {
  const rootClass = [
    'text-sm text-destructive bg-destructive/10 border border-destructive/25 border-l-4 border-l-destructive px-3 py-2 rounded-xl',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootClass} data-testid={testId} role={role}>
      <p>{message}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
