import { useMemo } from 'react'
import { History, QrCode, Settings, User } from 'lucide-react'
import QRCode from 'react-qr-code'
import { getTheme } from '@/hooks/useTheme'
import { themeUsesFlagAccent } from '@/design-system/ambianceMeta'
import { useAuth } from '../../context/AuthContext'
import type { TripHistoryItem } from '../../api/trips'
import { formatPickup, formatDestination } from '../../utils/format'
import { CancellationReasonMuted } from '../../components/trips/CancellationReasonMuted'
import { historyStatusDotColor } from '../../constants/tripStatus'
import { BetaAccountPanel } from '../account/BetaAccountPanel'
import { AppAppearanceSettings } from '../settings/AppAppearanceSettings'
import { AppRouteModeSwitch } from '../settings/AppRouteModeSwitch'
import { PassengerHistoryDetailPanel } from './PassengerHistoryDetailPanel'
import type { TripDetailResponse } from '../../api/trips'
import {
  AppMenuBody,
  AppMenuHeader,
  AppMenuIdentity,
  AppMenuLogoutRow,
  AppMenuRow,
  AppMenuSection,
  AppSideMenuSheet,
} from '../../components/layout/AppMenuShell'
import { BTN_SECONDARY_RADIUS, MENU_SURFACE } from '../../components/layout/infoBoxTemplate'
import { passengerMenuTitle } from './passengerMenuNav'

export type PassengerMenuScreen =
  | 'root'
  | 'history'
  | 'history_detail'
  | 'account'
  | 'share_app'
  | 'settings'

export function PassengerSideMenu({
  open,
  onOpenChange,
  screen,
  onScreenChange,
  menuRootHighlight,
  history,
  historyLoading,
  historyPollFault,
  historyDetail,
  historyDetailLoading,
  historyDetailError,
  onHistoryTripSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  screen: PassengerMenuScreen
  onScreenChange: (screen: PassengerMenuScreen) => void
  menuRootHighlight?: string | null
  history: TripHistoryItem[] | null
  historyLoading: boolean
  historyPollFault: boolean
  historyDetail: TripDetailResponse | null
  historyDetailLoading: boolean
  historyDetailError: string | null
  onHistoryTripSelect: (tripId: string) => void
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

  const backFromSubscreen = () => {
    if (screen === 'history_detail') {
      onScreenChange('history')
      return
    }
    onScreenChange('root')
  }

  const title = screen === 'root' ? 'Menu' : passengerMenuTitle(screen)
  const headerTitle = screen === 'root' ? (sessionDisplayName ?? 'Passageiro') : title
  const initial = (sessionDisplayName ?? 'P').slice(0, 1).toUpperCase()
  const hl = menuRootHighlight
  const flagAccent = themeUsesFlagAccent(getTheme())

  return (
    <AppSideMenuSheet
      open={open}
      onOpenChange={onOpenChange}
      testId="passenger-side-menu"
      srTitle={title}
      srDescription="Navegação do passageiro e histórico de viagens."
      closeOnDismiss={close}
    >
      <AppMenuHeader
        title={headerTitle}
        onBack={screen !== 'root' ? backFromSubscreen : undefined}
        onClose={close}
        closeTestId="passenger-close-menu"
      />
      <AppMenuBody>
        {screen === 'root' ? (
          <>
            <AppMenuIdentity
              testId="passenger-menu-identity"
              initial={initial}
              name={sessionDisplayName ?? 'Passageiro'}
              phone={sessionPhone ?? 'Sessão'}
              roleBadge="Passageiro"
              flagAccent={flagAccent}
            />
            <AppMenuSection title="Viagens">
              <AppMenuRow
                label="Histórico"
                icon={<History className="h-4 w-4" />}
                active={hl === 'trips'}
                onClick={() => onScreenChange('history')}
              />
              <AppMenuRow
                label="Partilhar app (QR)"
                icon={<QrCode className="h-4 w-4" />}
                active={hl === 'trips'}
                onClick={() => onScreenChange('share_app')}
              />
            </AppMenuSection>
            <AppMenuSection title="Conta">
              <AppMenuRow
                label="Conta"
                icon={<User className="h-4 w-4" />}
                active={hl === 'account'}
                onClick={() => onScreenChange('account')}
              />
            </AppMenuSection>
            <AppMenuSection title="App">
              <AppMenuRow
                label="Definições"
                icon={<Settings className="h-4 w-4" />}
                testId="passenger-menu-settings"
                active={hl === 'settings'}
                onClick={() => onScreenChange('settings')}
              />
            </AppMenuSection>
            <AppMenuLogoutRow
              onClick={() => {
                logout()
                close()
              }}
            />
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
        ) : screen === 'settings' ? (
          <div className="space-y-4" data-testid="passenger-settings-screen">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Preferências da app. Conta e sessão estão em{' '}
              <span className="font-medium text-foreground/90">Conta</span> no menu principal.
            </p>
            <AppAppearanceSettings />
            <AppRouteModeSwitch />
          </div>
        ) : screen === 'account' ? (
          <div className="space-y-3">
            <BetaAccountPanel />
          </div>
        ) : screen === 'history_detail' ? (
          <PassengerHistoryDetailPanel
            detail={historyDetail}
            loading={historyDetailLoading}
            error={historyDetailError}
          />
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
                  <li key={t.trip_id}>
                    <button
                      type="button"
                      data-testid={`passenger-history-row-${t.trip_id}`}
                      onClick={() => onHistoryTripSelect(t.trip_id)}
                      className="flex w-full flex-col gap-1 py-2 border-b border-border last:border-0 text-left hover:bg-muted/30 rounded-lg px-1 -mx-1 touch-manipulation"
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
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </AppMenuBody>
    </AppSideMenuSheet>
  )
}
