import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface TripStatusCardProps {
  status: "requested" | "assigned" | "accepted" | "arriving" | "ongoing" | "completed"
  driverName?: string
  eta?: string
  progress?: number
  className?: string
}

const STATUS_LABELS: Record<string, string> = {
  requested: "À procura de motorista",
  assigned: "Motorista atribuído",
  accepted: "Motorista a caminho",
  arriving: "Motorista a chegar",
  ongoing: "Em viagem",
  completed: "Viagem concluída",
}

export function TripStatusCard({
  status,
  driverName = "Motorista",
  eta = "~5 min",
  progress = 40,
  className,
}: TripStatusCardProps) {
  const initial = driverName.charAt(0).toUpperCase()
  const showProgress = ["accepted", "arriving", "ongoing"].includes(status)

  return (
    <Card
      className={cn(
        "rounded-2xl shadow-card transition-all duration-200 hover:shadow-floating",
        className
      )}
    >
      <CardHeader className="pb-2">
        <p className="text-sm font-medium text-muted-foreground">
          {STATUS_LABELS[status] ?? status}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {driverName && (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 rounded-xl">
              <AvatarFallback className="rounded-xl bg-primary/20 text-primary">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground">{driverName}</p>
              <p className="text-sm text-muted-foreground">{eta}</p>
            </div>
          </div>
        )}
        {showProgress && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2 rounded-full" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
