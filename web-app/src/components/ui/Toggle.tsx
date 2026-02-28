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
    <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-slate-800">{label}</p>
          <p className="text-sm text-slate-600">{checked ? onLabel : offLabel}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative h-12 w-20 shrink-0 rounded-full transition-colors ${
            checked ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
        >
          <span
            className={`absolute top-1 h-10 w-10 rounded-full bg-white shadow-md transition-transform ${
              checked ? 'left-9' : 'left-1'
            }`}
          />
        </button>
      </div>
    </div>
  )
}
