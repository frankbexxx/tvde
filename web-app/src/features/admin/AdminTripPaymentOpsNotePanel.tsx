import type { TripDetailAdmin } from '../../api/admin'

export function AdminTripPaymentOpsNotePanel({
  tripId,
  tripDetail,
  enabled,
  draft,
  onDraftChange,
  onSubmit,
  submitting,
}: {
  tripId: string
  tripDetail: TripDetailAdmin | null
  enabled: boolean
  draft: string
  onDraftChange: (v: string) => void
  onSubmit: () => void
  submitting: boolean
}) {
  if (!enabled || !tripDetail || tripDetail.trip_id !== tripId) return null
  const psRaw = tripDetail.payment_status
  const psStr = psRaw != null && String(psRaw).trim() ? String(psRaw).trim() : null
  const canSubmit = draft.trim().length >= 3 && draft.trim().length <= 2000
  return (
    <div className="mt-2 rounded-xl border border-border bg-muted/15 px-3 py-2 space-y-2">
      <p className="text-xs font-medium text-foreground">Nota operacional (pagamento)</p>
      <p className="text-[11px] text-muted-foreground leading-snug">
        Regista texto no audit trail — <span className="font-medium">não altera Stripe</span> nem estados de
        pagamento.
        {psStr ? (
          <>
            {' '}
            Estado (API): <span className="font-mono text-foreground/90">{psStr}</span>.
          </>
        ) : null}
      </p>
      <textarea
        id={`admin-payment-ops-note-${tripId}`}
        name={`admin-payment-ops-note-${tripId}`}
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Ex.: cliente contactado; referência interna… (mín. 3 caracteres)"
        className="w-full min-h-[4.5rem] resize-y rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/70"
      />
      <button
        type="button"
        onClick={() => onSubmit()}
        disabled={submitting || !canSubmit}
        className="w-full sm:w-auto px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium disabled:opacity-50"
      >
        {submitting ? 'A registar…' : 'Registar nota (audit)'}
      </button>
    </div>
  )
}
