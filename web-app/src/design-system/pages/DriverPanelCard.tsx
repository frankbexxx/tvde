import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface DriverPanelCardProps {
  passengerName?: string
  origin?: string
  destination?: string
  price?: string
  onAccept?: () => void
  onReject?: () => void
  loading?: boolean
  className?: string
}

export function DriverPanelCard({
  passengerName = "Passageiro",
  origin = "Rossio",
  destination = "Aeroporto",
  price = "5 €",
  onAccept,
  onReject,
  loading = false,
  className,
}: DriverPanelCardProps) {
  const initial = passengerName.charAt(0).toUpperCase()

  return (
    <Card
      className={cn(
        "rounded-2xl shadow-card transition-all duration-200 hover:shadow-floating",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <Avatar className="h-12 w-12 rounded-xl">
          <AvatarFallback className="rounded-xl bg-primary/20 text-primary">
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{passengerName}</p>
          <p className="text-sm text-muted-foreground truncate">
            {origin} → {destination}
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {price}
        </Badge>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          onClick={onReject}
          disabled={loading}
        >
          Recusar
        </Button>
        <Button
          className="flex-1 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          onClick={onAccept}
          disabled={loading}
        >
          {loading ? "..." : "Aceitar"}
        </Button>
      </CardContent>
    </Card>
  )
}
