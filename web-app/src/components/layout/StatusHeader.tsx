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
  requested: 'bg-amber-50 text-amber-900 border-amber-200',
  assigned: 'bg-blue-50 text-blue-900 border-blue-200',
  accepted: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  arriving: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  ongoing: 'bg-violet-50 text-violet-900 border-violet-200',
  completed: 'bg-slate-100 text-slate-800 border-slate-300',
  idle: 'bg-slate-50 text-slate-600 border-slate-200',
  error: 'bg-red-50 text-red-900 border-red-200',
}

interface StatusHeaderProps {
  label: string
  variant?: StatusVariant
}

export function StatusHeader({ label, variant = 'idle' }: StatusHeaderProps) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 text-center text-xl font-semibold mb-6 transition-colors duration-300 ${VARIANT_STYLES[variant]}`}
      role="status"
    >
      {label}
    </div>
  )
}
