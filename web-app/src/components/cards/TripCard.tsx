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
  /** Optional driver name - not in API, can be "Motorista" */
  driverName?: string
  children?: React.ReactNode
}

export function TripCard({
  pickup,
  destination,
  price,
  estimateFallback,
  driverName,
  children,
}: TripCardProps) {
  const priceDisplay =
    price != null && price > 0 ? `${price.toFixed(2)} €` : estimateFallback ? `${estimateFallback} €` : '—'
  return (
    <div className="rounded-2xl border-2 border-border bg-card p-4 space-y-3 shadow-card hover:shadow-floating transition-shadow duration-200">
      <div>
        <p className="text-sm text-muted-foreground">Origem</p>
        <p className="text-base font-semibold text-foreground">{pickup}</p>
      </div>
      {destination && (
        <div>
          <p className="text-sm text-muted-foreground">Destino</p>
          <p className="text-base font-semibold text-foreground">{destination}</p>
        </div>
      )}
      {driverName && (
        <p className="text-base text-muted-foreground">{driverName}</p>
      )}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-2xl font-bold text-foreground">{priceDisplay}</span>
        {children}
      </div>
    </div>
  )
}
