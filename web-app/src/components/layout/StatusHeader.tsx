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
  completed: 'bg-muted text-muted-foreground border-border',
  idle: 'bg-muted text-muted-foreground border-border',
  error: 'bg-destructive text-destructive-foreground border-border',
}

interface StatusHeaderProps {
  label: string
  variant?: StatusVariant
}

export function StatusHeader({ label, variant = 'idle' }: StatusHeaderProps) {
  return (
    <div
      key={label}
      className={`rounded-2xl border px-4 py-4 text-center text-xl font-semibold mb-6 transition-all duration-500 ease-out motion-reduce:transition-none animate-in fade-in duration-500 ${VARIANT_STYLES[variant]}`}
      role="status"
      aria-live="polite"
    >
      {label}
    </div>
  )
}
