import type { ReactNode } from 'react'
import { BTN_PRIMARY_RADIUS } from './infoBoxTemplate'

interface PrimaryActionButtonProps {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  /**
   * `danger` — cancelar / destrutivo (vermelho).
   * `confirm` — confirmar / avançar viagem (verde).
   * `available` — acção «disponível» / oferta (azul legível no tema).
   * `primary` — CTA de marca (gradiente primário → accent).
   */
  variant?: 'primary' | 'danger' | 'confirm' | 'available'
  /** `compact` — altura alinhada ao slide aceitar (~40px, TW-04). */
  size?: 'default' | 'compact'
  className?: string
}

/**
 * Fixed-bottom style primary action. Visual focal point.
 * Full width, min 52px height, rounded-full, shadow-floating (CTA), bold text.
 */
export function PrimaryActionButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'default',
  className = '',
}: PrimaryActionButtonProps) {
  const sizeClass =
    size === 'compact'
      ? 'min-h-9 h-9 min-w-[44px] text-sm font-semibold shadow-md'
      : 'min-h-[52px] min-w-[44px] text-lg font-bold shadow-floating'
  const base = `w-full ${BTN_PRIMARY_RADIUS} hover:scale-105 active:scale-95 transition-all duration-150 ease-out disabled:bg-none disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100 disabled:active:scale-100 touch-manipulation ${sizeClass}`
  const styles =
    variant === 'danger'
      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
      : variant === 'confirm'
        ? 'bg-success text-success-foreground hover:bg-success/90'
        : variant === 'available'
          ? 'bg-info text-info-foreground hover:bg-info/90'
          : 'bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-primary/95 hover:to-accent/95'

  const spinnerRing =
    variant === 'danger'
      ? 'border-destructive-foreground'
      : variant === 'confirm'
        ? 'border-success-foreground'
        : variant === 'available'
          ? 'border-info-foreground'
          : 'border-primary-foreground'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${styles} ${loading ? 'opacity-80' : ''} ${className}`.trim()}
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span
            className={`${size === 'compact' ? 'h-4 w-4' : 'h-5 w-5'} animate-spin rounded-full border-2 border-t-transparent ${spinnerRing}`}
            aria-hidden
          />
          A processar...
        </span>
      ) : (
        children
      )}
    </button>
  )
}
