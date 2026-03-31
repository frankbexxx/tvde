import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useAuth } from '@/context/AuthContext'

function roleLabel(role: string): string {
  if (role === 'driver') return 'Motorista'
  if (role === 'admin') return 'Administrador'
  return 'Passageiro'
}

export function ProfileButton() {
  const [open, setOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 639px)')
  const { sessionPhone, role, betaMode, logout } = useAuth()

  const body = (
    <div className="mt-4 flex flex-col gap-4">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Telemóvel</p>
        <p className="text-base font-medium text-foreground break-all">
          {sessionPhone ?? '—'}
        </p>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Papel</p>
        <p className="text-base font-medium text-foreground">{roleLabel(role)}</p>
      </div>
      {betaMode ? (
        <Button
          type="button"
          variant="destructive"
          className="w-full font-semibold min-h-[48px]"
          onClick={() => {
            logout()
            setOpen(false)
          }}
        >
          Sair
        </Button>
      ) : null}
    </div>
  )

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Conta"
      className="transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
    >
      <UserIcon />
    </Button>
  )

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-w-[min(100vw-1.5rem,380px)] max-h-[85dvh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Conta</DialogTitle>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl min-h-[200px] max-h-[85dvh] overflow-y-auto safe-area-pb"
      >
        <SheetHeader>
          <SheetTitle>Conta</SheetTitle>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  )
}

function UserIcon() {
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
      aria-hidden
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
