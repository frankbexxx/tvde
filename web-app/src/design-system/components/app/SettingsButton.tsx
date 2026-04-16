import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { changeMyPassword } from "@/api/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { useDevToolsCallbacks } from "@/context/DevToolsCallbackContext"
import { ActivityPanel } from "@/components/ActivityPanel"
import { DevTools } from "@/features/shared/DevTools"

type ConfigView = "main" | "logs"

export function SettingsButton() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<ConfigView>("main")
  const isMobile = useMediaQuery("(max-width: 639px)")
  const { appRouteRole, setAppRouteRole, isAdmin, token, betaMode, sessionRole } = useAuth()
  const navigate = useNavigate()
  const { passengerActiveTripId } = useActiveTrip()
  const { notifyAfterDevMutation } = useDevToolsCallbacks()

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
      {betaMode && token ? <BetaPasswordChange token={token} /> : null}
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
            disabled={sessionRole !== "driver"}
            title={
              sessionRole !== "driver"
                ? "A conta não tem perfil de motorista; o painel motorista exige JWT de motorista."
                : undefined
            }
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
      {import.meta.env.DEV ? (
        <div className="pt-2 border-t border-border/60">
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
            Desenvolvimento
          </p>
          <DevTools
            lastCreatedTripId={devToolsTripId}
            mode={devToolsMode}
            onAssigned={() => notifyAfterDevMutation(devToolsMode)}
          />
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

function BetaPasswordChange({ token }: { token: string }) {
  const [current, setCurrent] = useState("")
  const [new1, setNew1] = useState("")
  const [new2, setNew2] = useState("")
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async () => {
    setMsg(null)
    if (new1.length < 8) {
      setMsg("Nova palavra-passe: mínimo 8 caracteres.")
      return
    }
    if (new1 !== new2) {
      setMsg("As duas novas não coincidem.")
      return
    }
    setLoading(true)
    try {
      await changeMyPassword(token, {
        current_password: current.trim() || null,
        new_password: new1,
      })
      setMsg("Palavra-passe actualizada. Na próxima entrada usa a nova.")
      setCurrent("")
      setNew1("")
      setNew2("")
    } catch (e: unknown) {
      const d = (e as { detail?: string })?.detail
      setMsg(
        d === "invalid_current_password"
          ? "Palavra-passe actual incorrecta (se ainda não definiste uma, usa 123456)."
          : typeof d === "string"
            ? d
            : "Não foi possível alterar."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pt-2 border-t border-border/60">
      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
        Palavra-passe (BETA)
      </p>
      <p className="text-xs text-foreground/80 mb-2">
        Primeira vez: em «Actual» usa a password BETA por defeito (normalmente{" "}
        <span className="font-mono">123456</span>). Depois de definires uma personalizada,
        passa a ser obrigatória a «Actual».
      </p>
      <div className="space-y-2">
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="Palavra-passe actual"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="text-sm"
        />
        <Input
          type="password"
          autoComplete="new-password"
          placeholder="Nova (mín. 8)"
          value={new1}
          onChange={(e) => setNew1(e.target.value)}
          className="text-sm"
        />
        <Input
          type="password"
          autoComplete="new-password"
          placeholder="Repetir nova"
          value={new2}
          onChange={(e) => setNew2(e.target.value)}
          className="text-sm"
        />
        <Button
          type="button"
          className="w-full"
          disabled={loading || !new1.trim()}
          onClick={() => void onSubmit()}
        >
          {loading ? "A guardar…" : "Guardar nova palavra-passe"}
        </Button>
        {msg ? (
          <p
            className={`text-xs ${msg.includes("actualizada") ? "text-success" : "text-destructive"}`}
          >
            {msg}
          </p>
        ) : null}
      </div>
    </div>
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
