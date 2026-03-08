interface ToggleProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  /** Optional sublabel when on */
  onLabel?: string
  /** Optional sublabel when off */
  offLabel?: string
}

/**
 * Large toggle for driver availability.
 */
export function Toggle({
  label,
  checked,
  onChange,
  onLabel = 'Disponível',
  offLabel = 'Offline',
}: ToggleProps) {
  return (
    <div className="rounded-2xl border border-border bg-muted/50 p-4 shadow-card">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">{checked ? onLabel : offLabel}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative h-12 w-20 shrink-0 rounded-full transition-all duration-200 ${
            checked ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`absolute top-1 h-10 w-10 rounded-full bg-white shadow-card transition-transform duration-200 ${
              checked ? 'left-9' : 'left-1'
            }`}
          />
        </button>
      </div>
    </div>
  )
}
