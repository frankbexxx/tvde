import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface RideRequestCardProps {
  origin?: string
  destination?: string
  price?: string
  eta?: string
  onRequest?: () => void
  loading?: boolean
  className?: string
}

export function RideRequestCard({
  origin = "Rossio, Lisboa",
  destination = "Aeroporto, Lisboa",
  price = "4–6 €",
  eta = "~12 min",
  onRequest,
  loading = false,
  className,
}: RideRequestCardProps) {
  return (
    <Card
      className={cn(
        "rounded-2xl shadow-card transition-all duration-200 hover:shadow-floating",
        className
      )}
    >
      <CardHeader className="pb-2">
        <p className="text-sm text-muted-foreground">De</p>
        <p className="font-medium text-foreground">{origin}</p>
        <p className="text-sm text-muted-foreground mt-2">Para</p>
        <p className="font-medium text-foreground">{destination}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Estimativa</span>
          <span className="font-medium text-foreground">{price}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">ETA</span>
          <span className="font-medium text-foreground">{eta}</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          onClick={onRequest}
          disabled={loading}
        >
          {loading ? "A pedir..." : "Pedir viagem"}
        </Button>
      </CardFooter>
    </Card>
  )
}
