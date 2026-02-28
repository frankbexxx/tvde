/**
 * Status header - top of screen, large colored badge, clear non-technical text.
 * States: requested (yellow), assigned (blue), accepted (dark blue), arriving (purple),
 * ongoing (green), completed (dark gray).
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
  requested: 'bg-amber-100 text-amber-900 border-amber-300',
  assigned: 'bg-blue-100 text-blue-900 border-blue-300',
  accepted: 'bg-blue-200 text-blue-950 border-blue-400',
  arriving: 'bg-violet-100 text-violet-900 border-violet-300',
  ongoing: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  completed: 'bg-slate-200 text-slate-800 border-slate-400',
  idle: 'bg-slate-100 text-slate-700 border-slate-300',
  error: 'bg-red-100 text-red-900 border-red-300',
}

interface StatusHeaderProps {
  label: string
  variant?: StatusVariant
}

export function StatusHeader({ label, variant = 'idle' }: StatusHeaderProps) {
  return (
    <div
      className={`rounded-xl border-2 px-4 py-4 text-center text-xl font-semibold mb-6 ${VARIANT_STYLES[variant]}`}
      role="status"
    >
      {label}
    </div>
  )
}
