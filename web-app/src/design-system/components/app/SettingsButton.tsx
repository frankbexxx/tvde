import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ThemeSelector } from "./ThemeSelector"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { useAuth } from "@/context/AuthContext"
import { useActiveTrip } from "@/context/ActiveTripContext"
import { ActivityPanel } from "@/components/ActivityPanel"
import { DevTools } from "@/features/shared/DevTools"

type ConfigView = "main" | "logs"

export function SettingsButton() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<ConfigView>("main")
  const isMobile = useMediaQuery("(max-width: 639px)")
  const { betaMode, logout, appRouteRole, setAppRouteRole, isAdmin } = useAuth()
  const navigate = useNavigate()
  const { passengerActiveTripId } = useActiveTrip()

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setView("main")
  }

  const devToolsMode = appRouteRole === "driver" ? "driver" : "passenger"
  const devToolsTripId = appRouteRole === "passenger" ? passengerActiveTripId : null

  const mainBody = (
    <div className="mt-4 flex flex-col gap-4">
      <div>
        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Aspeto</p>
        <ThemeSelector />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Modo da app</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={appRouteRole === "passenger" ? "default" : "outline"}
            className="flex-1 font-medium"
            onClick={() => {
              setAppRouteRole("passenger")
              navigate("/passenger", { replace: true })
              setOpen(false)
            }}
          >
            Passageiro
          </Button>
          <Button
            type="button"
            variant={appRouteRole === "driver" ? "default" : "outline"}
            className="flex-1 font-medium"
            onClick={() => {
              setAppRouteRole("driver")
              navigate("/driver", { replace: true })
              setOpen(false)
            }}
          >
            Motorista
          </Button>
        </div>
      </div>
      {isAdmin ? (
        <Button type="button" variant="outline" className="w-full font-medium" asChild>
          <Link to="/admin" onClick={() => setOpen(false)}>
            Painel admin
          </Link>
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className="w-full justify-center font-medium"
        onClick={() => setView("logs")}
      >
        Registo de atividade
      </Button>
      {betaMode ? (
        <Button
          type="button"
          variant="ghost"
          className="w-full text-muted-foreground hover:text-foreground text-sm"
          onClick={() => {
            logout()
            setOpen(false)
          }}
        >
          Sair
        </Button>
      ) : null}
      {import.meta.env.DEV ? (
        <div className="pt-2 border-t border-border/60">
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
            Desenvolvimento
          </p>
          <DevTools lastCreatedTripId={devToolsTripId} mode={devToolsMode} />
        </div>
      ) : null}
    </div>
  )

  const logsBody = (
    <div className="mt-2 flex flex-col gap-3 min-h-0 flex-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start -ml-2 text-muted-foreground"
        onClick={() => setView("main")}
      >
        ← Voltar
      </Button>
      <ActivityPanel embedded />
    </div>
  )

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Configuração"
      className="transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
    >
      <SettingsIcon />
    </Button>
  )

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent
          className={
            view === "logs"
              ? "max-w-[min(100vw-1.5rem,400px)] max-h-[85dvh] flex flex-col"
              : "max-w-[min(100vw-1.5rem,380px)] max-h-[85dvh] overflow-y-auto"
          }
        >
          <DialogHeader>
            <DialogTitle>{view === "main" ? "Configuração" : "Registo de atividade"}</DialogTitle>
          </DialogHeader>
          {view === "main" ? mainBody : logsBody}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="bottom"
        className={
          view === "logs"
            ? "rounded-t-2xl min-h-[240px] max-h-[85dvh] overflow-hidden flex flex-col safe-area-pb"
            : "rounded-t-2xl min-h-[200px] max-h-[85dvh] overflow-y-auto safe-area-pb"
        }
      >
        <SheetHeader>
          <SheetTitle>{view === "main" ? "Configuração" : "Registo de atividade"}</SheetTitle>
        </SheetHeader>
        {view === "main" ? mainBody : logsBody}
      </SheetContent>
    </Sheet>
  )
}

function SettingsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
