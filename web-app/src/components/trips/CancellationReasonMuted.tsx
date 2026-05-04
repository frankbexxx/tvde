/** Linha compacta quando a API envia `cancellation_reason`. */
export function CancellationReasonMuted({
  reason,
  className = '',
}: {
  reason?: string | null
  /** Classes extra no `<p>` (ex. `mt-0`). */
  className?: string
}) {
  const text = reason?.trim()
  if (!text) return null
  return (
    <p
      className={`text-[11px] text-muted-foreground leading-snug border-l-2 border-border/80 pl-2 ${className}`.trim()}
      data-testid="trip-cancellation-reason"
    >
      <span className="font-medium text-foreground/85">Motivo cancelamento:</span> {text}
    </p>
  )
}
