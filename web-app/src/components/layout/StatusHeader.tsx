/**
 * Status header - top of screen, large colored badge, clear non-technical text.
 * requested→amber, assigned→blue, accepted/arriving→emerald, ongoing→violet,
 * completed→slate, cancelled→gray, failed→red.
 */
export type StatusVariant =
  | 'requested'
  | 'assigned'
  | 'accepted'
  | 'arriving'
  | 'ongoing'
  | 'completed'
  | 'idle'
  | 'error'

const VARIANT_STYLES: Record<StatusVariant, string> = {
  requested: 'bg-accent text-accent-foreground border-border',
  assigned: 'bg-primary text-primary-foreground border-border',
  accepted: 'bg-primary text-primary-foreground border-border',
  arriving: 'bg-primary text-primary-foreground border-border',
  ongoing: 'bg-secondary text-secondary-foreground border-border',
  completed: 'bg-muted text-foreground/90 border-border',
  idle: 'bg-muted text-foreground/85 border-border',
  error: 'bg-destructive text-destructive-foreground border-border',
}

/** A021: um único foco por estado — subdued quando outro bloco (painel/mapa) é o herói */
export type StatusHeaderEmphasis = 'primary' | 'subdued'

interface StatusHeaderProps {
  label: string
  /** Linha secundária (ex.: próximos passos após erro de pagamento). */
  subLabel?: string
  variant?: StatusVariant
  emphasis?: StatusHeaderEmphasis
  /** Badge pequeno dentro de um bloco unificado (ecrã passageiro). */
  compact?: boolean
}

export function StatusHeader({
  label,
  subLabel,
  variant = 'idle',
  emphasis = 'primary',
  compact = false,
}: StatusHeaderProps) {
  const isSubdued = emphasis === 'subdued'
  if (compact) {
    const pill = VARIANT_STYLES[variant] ?? VARIANT_STYLES.idle
    return (
      <div
        key={label}
        className={`inline-flex max-w-full flex-col items-start gap-1 rounded-xl border px-3 py-2 text-left text-sm font-medium shadow-none ${pill} transition-opacity duration-200 motion-reduce:transition-none`}
        role="status"
        aria-label={label}
        aria-live="polite"
      >
        <span>{label}</span>
        {subLabel ? (
          <span className="text-xs font-normal leading-snug opacity-90">{subLabel}</span>
        ) : null}
      </div>
    )
  }
  const surface = isSubdued
    ? 'rounded-2xl border border-border bg-card px-4 py-3 text-center text-base font-medium text-foreground/90 mb-4 shadow-none opacity-90'
    : `rounded-2xl border px-4 py-4 text-center text-xl font-semibold mb-6 shadow-sm ${VARIANT_STYLES[variant]}`
  return (
    <div
      key={label}
      className={`${surface} transition-[opacity,transform,box-shadow] duration-200 ease-out motion-reduce:transition-none animate-in fade-in duration-300`}
      role="status"
      aria-label={label}
      aria-live="polite"
    >
      <span className="block">{label}</span>
      {subLabel ? (
        <p className="mt-2 text-sm font-normal leading-snug opacity-90 max-w-md mx-auto">{subLabel}</p>
      ) : null}
    </div>
  )
}
