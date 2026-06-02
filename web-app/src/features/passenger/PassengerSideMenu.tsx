import { useMemo } from 'react'
import { History, QrCode, Settings, User } from 'lucide-react'
import QRCode from 'react-qr-code'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('passenger')
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

  const title = passengerMenuTitle(screen)
  const headerTitle = screen === 'root' ? (sessionDisplayName ?? t('common:rolePassenger')) : title
  const initial = (sessionDisplayName ?? 'P').slice(0, 1).toUpperCase()
  const hl = menuRootHighlight
  const flagAccent = themeUsesFlagAccent(getTheme())

  return (
    <AppSideMenuSheet
      open={open}
      onOpenChange={onOpenChange}
      testId="passenger-side-menu"
      srTitle={title}
      srDescription={t('sideMenu.srDescription')}
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
              name={sessionDisplayName ?? t('common:rolePassenger')}
              phone={sessionPhone ?? t('sideMenu.sessionFallback')}
              roleBadge={t('common:rolePassenger')}
              flagAccent={flagAccent}
            />
            <AppMenuSection title={t('sideMenu.sectionTrips')}>
              <AppMenuRow
                label={t('nav.history')}
                icon={<History className="h-4 w-4" />}
                active={hl === 'trips'}
                onClick={() => onScreenChange('history')}
              />
              <AppMenuRow
                label={t('sideMenu.shareQr')}
                icon={<QrCode className="h-4 w-4" />}
                active={hl === 'trips'}
                onClick={() => onScreenChange('share_app')}
              />
            </AppMenuSection>
            <AppMenuSection title={t('sideMenu.sectionAccount')}>
              <AppMenuRow
                label={t('nav.account')}
                icon={<User className="h-4 w-4" />}
                active={hl === 'account'}
                onClick={() => onScreenChange('account')}
              />
            </AppMenuSection>
            <AppMenuSection title={t('sideMenu.sectionApp')}>
              <AppMenuRow
                label={t('menuTitle.settings')}
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
            <p className="text-sm text-foreground/85 leading-snug">{t('sideMenu.shareIntro')}</p>
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
                  {t('sideMenu.copyLink')}
                </button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('sideMenu.linkUnavailable')}</p>
            )}
          </div>
        ) : screen === 'settings' ? (
          <div className="space-y-4" data-testid="passenger-settings-screen">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('sideMenu.settingsHintBefore')}{' '}
              <span className="font-medium text-foreground/90">{t('nav.account')}</span>{' '}
              {t('sideMenu.settingsHintAfter')}
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
              <p className="text-xs text-warning">{t('sideMenu.historyPollFault')}</p>
            ) : null}
            {historyLoading && history == null ? (
              <p className="text-sm text-muted-foreground">{t('common:loading')}</p>
            ) : null}
            {history && history.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('sideMenu.historyEmpty')}</p>
            ) : null}
            {history && history.length > 0 ? (
              <ul className="space-y-2">
                {history.map((trip) => (
                  <li key={trip.trip_id}>
                    <button
                      type="button"
                      data-testid={`passenger-history-row-${trip.trip_id}`}
                      onClick={() => onHistoryTripSelect(trip.trip_id)}
                      className="flex w-full flex-col gap-1 py-2 border-b border-border last:border-0 text-left hover:bg-muted/30 rounded-lg px-1 -mx-1 touch-manipulation"
                    >
                      <div className="flex justify-between items-center gap-3">
                        <span className="flex items-center gap-2 text-sm text-foreground/85 min-w-0">
                          <span
                            aria-hidden="true"
                            className={`h-2 w-2 rounded-full shrink-0 ${historyStatusDotColor(trip.status)}`}
                          />
                          <span className="truncate">
                            {formatPickup(trip.origin_lat, trip.origin_lng)} →{' '}
                            {formatDestination(trip.destination_lat, trip.destination_lng)}
                          </span>
                        </span>
                        <span className="font-medium text-foreground shrink-0 text-sm">
                          {trip.final_price != null ? `${trip.final_price} €` : '—'}
                        </span>
                      </div>
                      <CancellationReasonMuted reason={trip.cancellation_reason} className="mt-0" />
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
