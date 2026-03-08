import type { ReactNode } from 'react'

interface PrimaryActionButtonProps {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'danger'
}

/**
 * Fixed-bottom style primary action.
 * Full width, min 48px height, rounded-xl, light shadow, large text.
 */
export function PrimaryActionButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
}: PrimaryActionButtonProps) {
  const base =
    'w-full min-h-[48px] rounded-2xl font-semibold text-lg shadow-card hover:shadow-floating active:scale-[0.98] transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100'
  const styles =
    variant === 'danger'
      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
      : 'bg-primary text-primary-foreground hover:bg-primary/90'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${styles} ${loading ? 'opacity-80' : ''}`}
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          A processar...
        </span>
      ) : (
        children
      )}
    </button>
  )
}
