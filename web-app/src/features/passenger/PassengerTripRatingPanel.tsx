import { useState } from 'react'
import { rateTripPassenger } from '../../api/trips'
import { isTimeoutLikeError } from '../../api/client'
import { toast } from 'sonner'
import {
  BTN_SECONDARY,
  BTN_SECONDARY_RADIUS,
  INFO_BOX_BODY_COMPACT,
  INFO_BOX_PASSENGER,
  INFO_BOX_TITLE_COMPACT,
} from '../../components/layout/infoBoxTemplate'

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
          ? 'Sem permissão para avaliar — em modo BETA, a conta tem de ser de passageiro (não motorista) para esta viagem.'
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
      className={`${INFO_BOX_PASSENGER} p-3 space-y-2 shadow-card max-h-[min(38dvh,280px)] overflow-y-auto`}
      data-testid="passenger-trip-rating"
    >
      <div>
        <h2 className={INFO_BOX_TITLE_COMPACT}>Como correu a viagem?</h2>
        <p className={`${INFO_BOX_BODY_COMPACT} mt-0.5`}>Avalia o motorista (opcional).</p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center sm:justify-start" role="group" aria-label="Estrelas de 1 a 5">
        {STARS.map((n) => (
          <button
            key={n}
            type="button"
            disabled={busy}
            data-testid={`passenger-rating-star-${n}`}
            onClick={() => setRating(n)}
            className={`min-h-9 min-w-9 ${BTN_SECONDARY_RADIUS} border text-base font-semibold transition-colors touch-manipulation ${
              rating === n
                ? 'border-success bg-success text-success-foreground'
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
          className={`min-h-[44px] ${BTN_SECONDARY} px-4`}
        >
          Agora não
        </button>
        <button
          type="button"
          disabled={busy || rating == null}
          onClick={() => void submit()}
          className={`min-h-[44px] ${BTN_SECONDARY_RADIUS} bg-success px-4 text-sm font-semibold text-success-foreground hover:bg-success/90 disabled:opacity-50 touch-manipulation`}
        >
          {busy ? 'A enviar…' : 'Enviar avaliação'}
        </button>
      </div>
    </div>
  )
}
