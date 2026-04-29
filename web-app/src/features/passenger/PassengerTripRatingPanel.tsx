import { useState } from 'react'
import { rateTripPassenger } from '../../api/trips'
import { isTimeoutLikeError } from '../../api/client'
import { toast } from 'sonner'

const STARS = [1, 2, 3, 4, 5] as const

export function PassengerTripRatingPanel({
  tripId,
  token,
  onSubmitted,
  onSkip,
}: {
  tripId: string
  token: string
  onSubmitted: () => void
  onSkip: () => void
}) {
  const [rating, setRating] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (rating == null) return
    setBusy(true)
    try {
      await rateTripPassenger(tripId, token, rating)
      toast.success('Obrigado pela avaliação')
      onSubmitted()
    } catch (err: unknown) {
      const e = err as { status?: number; detail?: string }
      const msg = isTimeoutLikeError(err) || e?.status === 0
        ? 'Sem ligação ou o pedido demorou demasiado. Tenta de novo.'
        : e?.status === 403
          ? 'Sem permissão para avaliar esta viagem nesta sessão. Entra como passageiro e tenta novamente.'
          : e?.status === 404
            ? 'Viagem não encontrada para avaliação. Pede nova viagem e tenta novamente no fim.'
            : e?.detail === 'trip_not_completed'
              ? 'A viagem ainda não está concluída. Aguarda alguns segundos e tenta de novo.'
              : String(e?.detail ?? 'Não foi possível enviar a avaliação.')
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-card"
      data-testid="passenger-trip-rating"
    >
      <div>
        <h2 className="text-lg font-semibold text-foreground">Como correu a viagem?</h2>
        <p className="text-sm text-foreground/75 mt-1">Avalia o motorista (opcional).</p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center sm:justify-start" role="group" aria-label="Estrelas de 1 a 5">
        {STARS.map((n) => (
          <button
            key={n}
            type="button"
            disabled={busy}
            data-testid={`passenger-rating-star-${n}`}
            onClick={() => setRating(n)}
            className={`min-h-[44px] min-w-[44px] rounded-xl border text-lg font-semibold transition-colors touch-manipulation ${
              rating === n
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-muted/40 text-foreground hover:bg-muted/70'
            } disabled:opacity-50`}
            aria-pressed={rating === n}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={onSkip}
          className="min-h-[44px] rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted/50 touch-manipulation"
        >
          Agora não
        </button>
        <button
          type="button"
          disabled={busy || rating == null}
          onClick={() => void submit()}
          className="min-h-[44px] rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-95 disabled:opacity-50 touch-manipulation"
        >
          {busy ? 'A enviar…' : 'Enviar avaliação'}
        </button>
      </div>
    </div>
  )
}
