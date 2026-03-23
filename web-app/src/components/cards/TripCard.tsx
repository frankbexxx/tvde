/**
 * Trip card - compact display for passenger/driver.
 * No IDs, no technical data. User-friendly content only.
 */
interface TripCardProps {
  /** Human-readable pickup (e.g. "Rossio" or coords simplified) */
  pickup: string
  /** Human-readable destination */
  destination?: string
  /** Price in € — use 0 when only estimate available */
  price: number
  /** When price is 0, show this instead (e.g. "4–6") */
  estimateFallback?: string
  /** Optional driver name — API não expõe ainda; texto amigável */
  driverName?: string
  /** Linha opcional veículo (ex. classe TVDE) — sem alterar contrato API */
  vehicleLabel?: string
  /** A021 / pricing híbrido: "Estimativa (indicativa)" vs "Preço final" */
  priceCaption?: string
  children?: React.ReactNode
}

export function TripCard({
  pickup,
  destination,
  price,
  estimateFallback,
  driverName,
  vehicleLabel,
  priceCaption,
  children,
}: TripCardProps) {
  const priceDisplay =
    price != null && price > 0 ? `${price.toFixed(2)} €` : estimateFallback ? `${estimateFallback} €` : '—'
  return (
    <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-sm p-4 space-y-2 shadow-card transition-all duration-200">
      <div className="space-y-0.5">
        <p className="text-xs font-medium uppercase tracking-wide text-foreground/65">Origem</p>
        <p className="text-base font-semibold text-foreground">{pickup}</p>
      </div>
      {destination && (
        <div className="space-y-0.5">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/65">Destino</p>
          <p className="text-base font-semibold text-foreground">{destination}</p>
        </div>
      )}
      {driverName && (
        <div className="space-y-0.5">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/65">Motorista</p>
          <p className="text-sm font-medium text-foreground">{driverName}</p>
          {vehicleLabel && (
            <p className="text-sm text-foreground/75">{vehicleLabel}</p>
          )}
        </div>
      )}
      <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
        <div>
          {priceCaption && (
            <p className="text-xs font-medium text-foreground/70 mb-0.5">{priceCaption}</p>
          )}
          <span className="text-2xl font-bold text-foreground">{priceDisplay}</span>
        </div>
        {children}
      </div>
    </div>
  )
}
