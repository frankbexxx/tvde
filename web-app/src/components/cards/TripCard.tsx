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
  children?: React.ReactNode
}

export function TripCard({
  pickup,
  destination,
  price,
  estimateFallback,
  driverName,
  vehicleLabel,
  children,
}: TripCardProps) {
  const priceDisplay =
    price != null && price > 0 ? `${price.toFixed(2)} €` : estimateFallback ? `${estimateFallback} €` : '—'
  return (
    <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-sm p-4 space-y-2 shadow-card hover:shadow-floating transition-all duration-200">
      <div className="space-y-0.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Origem</p>
        <p className="text-base font-semibold text-foreground">{pickup}</p>
      </div>
      {destination && (
        <div className="space-y-0.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Destino</p>
          <p className="text-base font-semibold text-foreground">{destination}</p>
        </div>
      )}
      {driverName && (
        <div className="space-y-0.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Motorista</p>
          <p className="text-sm font-medium text-foreground">{driverName}</p>
          {vehicleLabel && (
            <p className="text-sm text-muted-foreground">{vehicleLabel}</p>
          )}
        </div>
      )}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span className="text-2xl font-bold text-foreground">{priceDisplay}</span>
        {children}
      </div>
    </div>
  )
}
