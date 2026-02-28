interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error'
}

const VARIANTS: Record<string, string> = {
  default: 'bg-slate-200 text-slate-800',
  success: 'bg-emerald-200 text-emerald-900',
  warning: 'bg-amber-200 text-amber-900',
  error: 'bg-red-200 text-red-900',
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-lg text-sm font-medium ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  )
}
