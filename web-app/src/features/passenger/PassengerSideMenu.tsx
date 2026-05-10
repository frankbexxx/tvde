import { useState } from 'react'
import { History, LogOut, Menu as MenuIcon, User } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../../components/ui/sheet'
import { useAuth } from '../../context/AuthContext'
import type { TripHistoryItem } from '../../api/trips'
import { formatPickup, formatDestination } from '../../utils/format'
import { CancellationReasonMuted } from '../../components/trips/CancellationReasonMuted'
import { historyStatusDotColor } from '../../constants/tripStatus'
import { BetaAccountPanel } from '../account/BetaAccountPanel'

type Screen = 'root' | 'history' | 'account'

function MenuHeader({
  title,
  onBack,
  onClose,
}: {
  title: string
  onBack?: () => void
  onClose: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
      <div className="flex items-center gap-2 min-w-0">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="min-h-[40px] rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground hover:bg-muted/50 touch-manipulation"
          >
            Voltar
          </button>
        ) : null}
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        data-testid="passenger-close-menu"
        className="min-h-[40px] rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground hover:bg-muted/50 touch-manipulation"
      >
        Fechar
      </button>
    </div>
  )
}

export function PassengerSideMenu({
  history,
  historyLoading,
  historyPollFault,
}: {
  history: TripHistoryItem[] | null
  historyLoading: boolean
  historyPollFault: boolean
}) {
  const { sessionDisplayName, sessionPhone, logout } = useAuth()
  const [screen, setScreen] = useState<Screen>('root')
  const [open, setOpen] = useState(false)

  const close = () => {
    setScreen('root')
    setOpen(false)
  }

  const title = screen === 'history' ? 'Histórico' : screen === 'account' ? 'Conta' : 'Menu'

  return (
    <>
      <div className="flex justify-end px-4 pt-2 pb-1">
        <button
          type="button"
          data-testid="passenger-open-menu"
          onClick={() => setOpen(true)}
          className="min-h-11 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground hover:bg-muted/50 touch-manipulation"
        >
          <MenuIcon className="h-4 w-4" aria-hidden />
          Menu
        </button>
      </div>

      <Sheet
        open={open}
        onOpenChange={(v) => {
          if (v) {
            setOpen(true)
          } else {
            setScreen('root')
            setOpen(false)
          }
        }}
      >
        <SheetContent
          side="left"
          className="p-0 w-[85vw] max-w-[26rem] bg-background"
          hideCloseButton
          aria-label="Menu lateral do passageiro"
          data-testid="passenger-side-menu"
        >
          <SheetTitle className="sr-only">{title}</SheetTitle>
          <SheetDescription className="sr-only">Navegação do passageiro e histórico de viagens.</SheetDescription>
          <div className="h-dvh flex flex-col">
            <MenuHeader
              title={screen === 'root' ? (sessionDisplayName ?? 'Passageiro') : title}
              onBack={screen !== 'root' ? () => setScreen('root') : undefined}
              onClose={close}
            />
            <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
              {screen === 'root' ? (
                <>
                  <div className="rounded-2xl border border-border bg-gradient-to-b from-foreground/[0.06] to-transparent px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-foreground/10 border border-border flex items-center justify-center text-foreground/70 font-semibold">
                        {(sessionDisplayName ?? 'P').slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-foreground">{sessionDisplayName ?? 'Passageiro'}</p>
                        <p className="truncate text-xs text-muted-foreground">{sessionPhone ?? 'Sessão'}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScreen('history')}
                    className="w-full min-h-[48px] rounded-xl border border-border bg-card px-4 text-left text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation flex items-center gap-3"
                  >
                    <History className="h-4 w-4 text-foreground/80" />
                    Histórico de viagens
                  </button>
                  <button
                    type="button"
                    onClick={() => setScreen('account')}
                    className="w-full min-h-[48px] rounded-xl border border-border bg-card px-4 text-left text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation flex items-center gap-3"
                  >
                    <User className="h-4 w-4 text-foreground/80" />
                    Conta
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      logout()
                      close()
                    }}
                    className="w-full min-h-[48px] rounded-xl border border-border bg-background px-4 text-left text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation flex items-center gap-3"
                  >
                    <LogOut className="h-4 w-4 text-foreground/80" />
                    Sair
                  </button>
                </>
              ) : screen === 'account' ? (
                <div className="space-y-3">
                  <BetaAccountPanel />
                </div>
              ) : (
                <div className="space-y-3">
                  {historyPollFault ? (
                    <p className="text-xs text-warning">
                      Não foi possível actualizar o histórico. Verifica a ligação.
                    </p>
                  ) : null}
                  {historyLoading && history == null ? (
                    <p className="text-sm text-muted-foreground">A carregar…</p>
                  ) : null}
                  {history && history.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Ainda não há viagens nesta conta.</p>
                  ) : null}
                  {history && history.length > 0 ? (
                    <ul className="space-y-2">
                      {history.map((t) => (
                        <li
                          key={t.trip_id}
                          className="flex flex-col gap-1 py-2 border-b border-border last:border-0"
                        >
                          <div className="flex justify-between items-center gap-3">
                            <span className="flex items-center gap-2 text-sm text-foreground/85 min-w-0">
                              <span
                                aria-hidden="true"
                                className={`h-2 w-2 rounded-full shrink-0 ${historyStatusDotColor(t.status)}`}
                              />
                              <span className="truncate">
                                {formatPickup(t.origin_lat, t.origin_lng)} →{' '}
                                {formatDestination(t.destination_lat, t.destination_lng)}
                              </span>
                            </span>
                            <span className="font-medium text-foreground shrink-0 text-sm">
                              {t.final_price != null ? `${t.final_price} €` : '—'}
                            </span>
                          </div>
                          <CancellationReasonMuted reason={t.cancellation_reason} className="mt-0" />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
