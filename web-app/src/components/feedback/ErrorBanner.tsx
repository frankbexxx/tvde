type ErrorBannerProps = {
  message: string
  testId?: string
  className?: string
  role?: 'alert' | 'status'
}

/** Inline error feedback — presentational only; pass already-translated strings. */
export function ErrorBanner({
  message,
  testId,
  className,
  role = 'alert',
}: ErrorBannerProps) {
  const rootClass = [
    'text-sm text-destructive bg-destructive/10 border border-destructive/25 border-l-4 border-l-destructive px-3 py-2 rounded-xl',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <p className={rootClass} data-testid={testId} role={role}>
      {message}
    </p>
  )
}
