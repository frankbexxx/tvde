/**
 * Request card for driver - available trip to accept.
 * Pickup, estimate €, big ACEITAR button.
 * No IDs, no coords.
 */
interface RequestCardProps {
  pickup: string
  estimatedPrice: number
  /** When estimatedPrice is 0, show this instead (e.g. "4–6") */
  estimateFallback?: string
  onAccept: () => void
  loading?: boolean
}

export function RequestCard({
  pickup,
  estimatedPrice,
  estimateFallback = '4–6',
  onAccept,
  loading,
}: RequestCardProps) {
  const priceDisplay =
    estimatedPrice != null && estimatedPrice > 0
      ? `${estimatedPrice.toFixed(2)} €`
      : `${estimateFallback} €`

  return (
    <div className="rounded-xl border-2 border-slate-200 bg-white p-4 space-y-4 shadow-sm">
      <div>
        <p className="text-sm text-slate-600">Recolha</p>
        <p className="text-lg font-semibold text-slate-900">{pickup}</p>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-emerald-700">{priceDisplay}</span>
        <button
          type="button"
          onClick={onAccept}
          disabled={loading}
          className="min-h-[48px] px-6 rounded-xl bg-emerald-600 text-white font-semibold text-lg hover:bg-emerald-700 disabled:opacity-50 active:scale-[0.98]"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ...
            </span>
          ) : (
            'ACEITAR'
          )}
        </button>
      </div>
    </div>
  )
}
