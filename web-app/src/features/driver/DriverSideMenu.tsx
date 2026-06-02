import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useAuth, isBackofficeStaffRole } from '../../context/AuthContext'
import { parseJwtPayload } from '../../utils/jwt'
import type { DriverNavApp } from '../../services/driverNavPreference'
import type { TripHistoryItem } from '../../api/trips'
import type { DriverDocumentsState, DriverRequiredDocument, DriverDocumentStatus } from '../../services/driverDocuments'
import type { DriverVehicleCategory } from '../../services/driverVehicleCategories'
import { DRIVER_OPEN_ACCOUNT_EVENT, DRIVER_OPEN_ACTIVITY_LOG_EVENT } from './driverShellEvents'
import { AppAppearanceSettings } from '../settings/AppAppearanceSettings'
import { AppRouteModeSwitch } from '../settings/AppRouteModeSwitch'
import {
  AppMenuBody,
  AppMenuHeader,
  AppMenuIdentity,
  AppMenuLogoutRow,
  AppMenuRow,
  AppMenuSection,
  AppSideMenuSheet,
} from '../../components/layout/AppMenuShell'
import {
  BTN_SECONDARY_RADIUS,
} from '../../components/layout/infoBoxTemplate'
import {
  ClipboardList,
  Compass,
  CreditCard,
  FileText,
  History,
  Inbox,
  MapPin,
  Settings,
  SlidersHorizontal,
  User,
} from 'lucide-react'
import { DRIVER_MENU_BACK, driverMenuTitle } from './driverMenuNav'

export type DriverMenuScreen =
  | 'root'
  | 'profile'
  | 'inbox'
  | 'earnings'
  | 'trips'
  | 'trips_silenced'
  | 'nav'
  | 'categories'
  | 'zones'
  | 'zones_budget'
  | 'zones_session'
  | 'zones_request'
  | 'docs'
  | 'pricing'
  | 'settings'

function menuRoleLabel(role: string, t: (key: string, opts?: { ns?: string }) => string): string {
  if (role === 'driver') return t('roleDriver', { ns: 'common' })
  if (isBackofficeStaffRole(role)) return t('roleStaff', { ns: 'common' })
  if (role === 'partner') return t('rolePartner', { ns: 'common' })
  return t('rolePassenger', { ns: 'common' })
}

export function DriverSideMenu(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  screen: DriverMenuScreen
  onScreenChange: (screen: DriverMenuScreen) => void
  menuRootHighlight?: string | null
  inboxUnreadCount?: number
  sessionDisplayName: string | null
  history: TripHistoryItem[] | null
  navPref: DriverNavApp
  vehicleCategories: DriverVehicleCategory[]
  driverDocuments: DriverDocumentsState
  driverDocsGateEnabled: boolean
  driverLocationForZones: { lat: number; lng: number } | null
  onSelectNavPref: (app: DriverNavApp) => void
  onToggleVehicleCategory: (category: DriverVehicleCategory) => void
  onPatchDriverDocument: (doc: DriverRequiredDocument, status: DriverDocumentStatus) => void
  onToggleDriverDocsGate: (enabled: boolean) => void
  renderLegacyMenu: (section: DriverMenuScreen) => React.ReactNode
  shellOffline?: boolean
  activeTripId?: string | null
  onRequestGoAvailable?: () => void
}) {
  const { t } = useTranslation('driver')
  const {
    open,
    onOpenChange,
    screen,
    onScreenChange,
    menuRootHighlight,
    inboxUnreadCount,
    sessionDisplayName,
    renderLegacyMenu,
    shellOffline,
    activeTripId,
    onRequestGoAvailable,
  } = props
  const { sessionPhone, sessionRole, token, logout } = useAuth()

  const accountRef = useMemo(() => {
    const jwtSub = token ? parseJwtPayload(token)?.sub : undefined
    if (!jwtSub || jwtSub.length === 0) return null
    return jwtSub.replace(/-/g, '').slice(-8)
  }, [token])

  const title = useMemo(() => driverMenuTitle(screen), [screen])
  const hl = menuRootHighlight
  const defaultName = t('sideMenu.defaultName')
  const roleBadge = t('roleDriver', { ns: 'common' })

  const close = () => {
    onScreenChange('root')
    onOpenChange(false)
  }

  const back =
    screen !== 'root'
      ? () => onScreenChange(DRIVER_MENU_BACK[screen] ?? 'root')
      : undefined

  const headerTitle =
    screen === 'root' ? (sessionDisplayName ?? defaultName) : title
  const initial = (sessionDisplayName ?? defaultName.charAt(0)).slice(0, 1).toUpperCase()

  return (
    <AppSideMenuSheet
      open={open}
      onOpenChange={onOpenChange}
      testId="driver-side-menu"
      ariaLabel={t('sideMenu.ariaLabel')}
      srTitle={screen === 'root' ? t('sideMenu.srTitleRoot') : title}
      srDescription={t('sideMenu.srDescription')}
      closeOnDismiss={close}
    >
      <AppMenuHeader
        title={headerTitle}
        onBack={back}
        onClose={close}
        closeTestId="driver-close-menu"
      />
      <AppMenuBody>
        {screen === 'root' ? (
          <>
            <AppMenuIdentity
              initial={initial}
              name={sessionDisplayName ?? defaultName}
              phone={sessionPhone ?? t('sideMenu.testSession')}
              roleBadge={roleBadge}
              trailing={
                <span className="shrink-0 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  BETA
                </span>
              }
            />

            {onRequestGoAvailable && shellOffline && !activeTripId ? (
              <button
                type="button"
                data-testid="driver-menu-go-available"
                onClick={() => {
                  onRequestGoAvailable()
                  close()
                }}
                className={`w-full min-h-9 ${BTN_SECONDARY_RADIUS} border border-primary/35 bg-primary/10 px-4 text-left text-sm font-semibold text-primary hover:bg-primary/15 touch-manipulation`}
              >
                {t('sideMenu.goAvailable')}
              </button>
            ) : null}

            <AppMenuSection title={t('sideMenu.sections.operation')}>
              <AppMenuRow
                label={t('sideMenu.rows.earnings')}
                icon={<CreditCard className="h-4 w-4" />}
                rowId="driver-menu-earnings"
                active={hl === 'earnings'}
                onClick={() => onScreenChange('earnings')}
              />
              <AppMenuRow
                label={t('sideMenu.rows.trips')}
                icon={<History className="h-4 w-4" />}
                active={hl === 'trips'}
                onClick={() => onScreenChange('trips')}
              />
              <AppMenuRow
                label={t('sideMenu.rows.inbox')}
                icon={<Inbox className="h-4 w-4" />}
                rowId="driver-menu-inbox"
                badge={inboxUnreadCount}
                active={hl === 'inbox'}
                onClick={() => onScreenChange('inbox')}
              />
              <AppMenuRow
                label={t('sideMenu.rows.activityLog')}
                icon={<ClipboardList className="h-4 w-4" />}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent(DRIVER_OPEN_ACTIVITY_LOG_EVENT))
                  close()
                }}
              />
            </AppMenuSection>

            <AppMenuSection title={t('sideMenu.sections.account')}>
              <AppMenuRow
                label={t('sideMenu.rows.profile')}
                icon={<User className="h-4 w-4" />}
                active={hl === 'profile'}
                onClick={() => onScreenChange('profile')}
              />
              <AppMenuRow
                label={t('sideMenu.rows.documents')}
                icon={<FileText className="h-4 w-4" />}
                active={hl === 'docs'}
                onClick={() => onScreenChange('docs')}
              />
            </AppMenuSection>

            <AppMenuSection title={t('sideMenu.sections.configuration')}>
              <AppMenuRow
                label={t('sideMenu.rows.zones')}
                icon={<MapPin className="h-4 w-4" />}
                active={hl === 'zones'}
                onClick={() => onScreenChange('zones')}
              />
              <AppMenuRow
                label={t('sideMenu.rows.navigation')}
                icon={<Compass className="h-4 w-4" />}
                active={hl === 'nav'}
                onClick={() => onScreenChange('nav')}
              />
              <AppMenuRow
                label={t('sideMenu.rows.categories')}
                icon={<SlidersHorizontal className="h-4 w-4" />}
                active={hl === 'categories'}
                onClick={() => onScreenChange('categories')}
              />
              <AppMenuRow
                label={t('sideMenu.rows.pricingEstimate')}
                icon={<CreditCard className="h-4 w-4" />}
                active={hl === 'pricing'}
                onClick={() => onScreenChange('pricing')}
              />
              <AppMenuRow
                label={t('sideMenu.rows.settings')}
                icon={<Settings className="h-4 w-4" />}
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
        ) : screen === 'profile' ? (
          <div className="space-y-4" data-testid="driver-menu-profile-screen">
            <div className={`${BTN_SECONDARY_RADIUS} border border-border bg-card px-4 py-3 space-y-3`}>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('sideMenu.profile.name')}</p>
                <p className="text-sm font-medium text-foreground break-words">
                  {sessionDisplayName?.trim() || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('sideMenu.profile.phone')}</p>
                <p className="text-sm font-medium text-foreground break-all">{sessionPhone ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('sideMenu.profile.role')}</p>
                <p className="text-sm font-medium text-foreground">{menuRoleLabel(sessionRole, t)}</p>
              </div>
              {accountRef ? (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('sideMenu.profile.account')}</p>
                  <p className="text-sm font-medium text-foreground tabular-nums">
                    {t('sideMenu.profile.accountRef', { ref: accountRef })}
                  </p>
                </div>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                data-testid="driver-menu-open-account"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent(DRIVER_OPEN_ACCOUNT_EVENT))
                  close()
                }}
                className={`flex min-h-9 items-center justify-center gap-2 ${BTN_SECONDARY_RADIUS} border border-border bg-background px-4 text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation`}
              >
                <User className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                {t('sideMenu.profile.accountDetail')}
              </button>
              <button
                type="button"
                data-testid="driver-menu-open-settings"
                onClick={() => onScreenChange('settings')}
                className={`flex min-h-9 items-center justify-center gap-2 ${BTN_SECONDARY_RADIUS} border border-border bg-background px-4 text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation`}
              >
                <Settings className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                {t('sideMenu.rows.settings')}
              </button>
            </div>
          </div>
        ) : screen === 'settings' ? (
          <div className="space-y-4" data-testid="driver-settings-screen">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <Trans
                i18nKey="sideMenu.settings.intro"
                ns="driver"
                components={{
                  profile: <span className="font-medium text-foreground/90" />,
                }}
              />
            </p>
            <AppAppearanceSettings />
            <AppRouteModeSwitch />
          </div>
        ) : (
          <div className="pt-1">{renderLegacyMenu(screen)}</div>
        )}
      </AppMenuBody>
    </AppSideMenuSheet>
  )
}
