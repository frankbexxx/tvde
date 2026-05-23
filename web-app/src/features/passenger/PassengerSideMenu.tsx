import { useMemo } from 'react'
import { History, LogOut, QrCode, User } from 'lucide-react'
import QRCode from 'react-qr-code'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../../components/ui/sheet'
import { useAuth } from '../../context/AuthContext'
import type { TripHistoryItem } from '../../api/trips'
import { formatPickup, formatDestination } from '../../utils/format'
import { CancellationReasonMuted } from '../../components/trips/CancellationReasonMuted'
import { historyStatusDotColor } from '../../constants/tripStatus'
import { BetaAccountPanel } from '../account/BetaAccountPanel'
import {
  BTN_SECONDARY_RADIUS,
  MENU_BTN_SM,
  MENU_ROW_BTN,
  MENU_SURFACE,
} from '../../components/layout/infoBoxTemplate'

export type PassengerMenuScreen = 'root' | 'history' | 'account' | 'share_app'

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
            className={`${MENU_BTN_SM} px-3 text-sm font-semibold`}
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
        className={`${MENU_BTN_SM} px-3 text-sm font-semibold`}
      >
        Fechar
      </button>
    </div>
  )
}

export function PassengerSideMenu({
  open,
  onOpenChange,
  screen,
  onScreenChange,
  history,
  historyLoading,
  historyPollFault,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  screen: PassengerMenuScreen
  onScreenChange: (screen: PassengerMenuScreen) => void
  history: TripHistoryItem[] | null
  historyLoading: boolean
  historyPollFault: boolean
}) {
  const { sessionDisplayName, sessionPhone, logout } = useAuth()

  const shareUrl = useMemo(() => {
    try {
      const override = import.meta.env.VITE_APP_SHARE_URL as string | undefined
      if (override?.trim()) return override.trim().replace(/\/$/, '')
      const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
      const suffix = base === '/' || base === '' ? '' : base
      return `${window.location.origin}${suffix}`
    } catch {
      return typeof window !== 'undefined' ? window.location.origin : ''
    }
  }, [])

  const close = () => {
    onScreenChange('root')
    onOpenChange(false)
  }

  const title =
    screen === 'history'
      ? 'Histórico'
      : screen === 'account'
        ? 'Conta'
        : screen === 'share_app'
          ? 'Partilhar app'
          : 'Menu'

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (v) {
          onOpenChange(true)
        } else {
          onScreenChange('root')
          onOpenChange(false)
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
            onBack={screen !== 'root' ? () => onScreenChange('root') : undefined}
            onClose={close}
          />
          <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
            {screen === 'root' ? (
              <>
                <div className={MENU_SURFACE}>
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
                  onClick={() => onScreenChange('history')}
                  className={MENU_ROW_BTN}
                >
                  <History className="h-4 w-4 text-foreground/80" />
                  Histórico de viagens
                </button>
                <button
                  type="button"
                  onClick={() => onScreenChange('share_app')}
                  className={MENU_ROW_BTN}
                >
                  <QrCode className="h-4 w-4 text-foreground/80" />
                  Partilhar app (QR)
                </button>
                <button
                  type="button"
                  onClick={() => onScreenChange('account')}
                  className={MENU_ROW_BTN}
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
                  className={`${MENU_ROW_BTN} bg-background`}
                >
                  <LogOut className="h-4 w-4 text-foreground/80" />
                  Sair
                </button>
              </>
            ) : screen === 'share_app' ? (
              <div className="space-y-4">
                <p className="text-sm text-foreground/85 leading-snug">
                  Mostra este código a quem quiseres que instale ou abra a app neste ambiente. O link aponta para a mesma URL que estás a usar agora.
                </p>
                {shareUrl ? (
                  <div className={`flex flex-col items-center gap-3 ${MENU_SURFACE} bg-background p-4`}>
                    <div className={`${BTN_SECONDARY_RADIUS} bg-white p-3 shadow-sm`}>
                      <QRCode value={shareUrl} size={180} />
                    </div>
                    <p className="break-all text-center text-xs font-mono text-muted-foreground">{shareUrl}</p>
                    <button
                      type="button"
                      className={`min-h-9 w-full ${BTN_SECONDARY_RADIUS} border border-border bg-card px-3 text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation`}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(shareUrl)
                        } catch {
                          /* ignore */
                        }
                      }}
                    >
                      Copiar link
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Link indisponível neste contexto.</p>
                )}
              </div>
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
  )
}
