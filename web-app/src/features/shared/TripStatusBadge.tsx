import type { TripStatus } from '../../api/trips'

const STATUS_COLORS: Record<TripStatus, string> = {
  requested: 'bg-slate-200 text-slate-800',
  assigned: 'bg-amber-200 text-amber-900',
  accepted: 'bg-blue-200 text-blue-900',
  arriving: 'bg-cyan-200 text-cyan-900',
  ongoing: 'bg-green-200 text-green-900',
  completed: 'bg-emerald-300 text-emerald-900',
  cancelled: 'bg-red-200 text-red-900',
  failed: 'bg-red-300 text-red-900',
}

export function TripStatusBadge({ status }: { status: TripStatus }) {
  const color = STATUS_COLORS[status] ?? 'bg-gray-200 text-gray-800'
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-sm font-medium ${color}`}>
      {status}
    </span>
  )
}
