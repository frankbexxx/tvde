import { useMemo } from 'react'
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

function menuRoleLabel(role: string): string {
  if (role === 'driver') return 'Motorista'
  if (isBackofficeStaffRole(role)) return 'Staff'
  if (role === 'partner') return 'Frota'
  return 'Passageiro'
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

  const close = () => {
    onScreenChange('root')
    onOpenChange(false)
  }

  const back =
    screen !== 'root'
      ? () => onScreenChange(DRIVER_MENU_BACK[screen] ?? 'root')
      : undefined

  const headerTitle =
    screen === 'root' ? (sessionDisplayName ?? 'Motorista') : title
  const initial = (sessionDisplayName ?? 'M').slice(0, 1).toUpperCase()

  return (
    <AppSideMenuSheet
      open={open}
      onOpenChange={onOpenChange}
      testId="driver-side-menu"
      ariaLabel="Menu lateral do motorista"
      srTitle={screen === 'root' ? 'Menu do motorista' : title}
      srDescription="Navegação do motorista: rendimentos, viagens, definições e mais."
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
              name={sessionDisplayName ?? 'Motorista'}
              phone={sessionPhone ?? 'Sessão de teste'}
              roleBadge="Motorista"
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
                Ficar disponível
              </button>
            ) : null}

            <AppMenuSection title="Operação">
              <AppMenuRow
                label="Rendimentos"
                icon={<CreditCard className="h-4 w-4" />}
                rowId="driver-menu-earnings"
                active={hl === 'earnings'}
                onClick={() => onScreenChange('earnings')}
              />
              <AppMenuRow
                label="Viagens"
                icon={<History className="h-4 w-4" />}
                active={hl === 'trips'}
                onClick={() => onScreenChange('trips')}
              />
              <AppMenuRow
                label="Caixa de entrada"
                icon={<Inbox className="h-4 w-4" />}
                rowId="driver-menu-inbox"
                badge={inboxUnreadCount}
                active={hl === 'inbox'}
                onClick={() => onScreenChange('inbox')}
              />
              <AppMenuRow
                label="Registo de atividade"
                icon={<ClipboardList className="h-4 w-4" />}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent(DRIVER_OPEN_ACTIVITY_LOG_EVENT))
                  close()
                }}
              />
            </AppMenuSection>

            <AppMenuSection title="Conta">
              <AppMenuRow
                label="Perfil"
                icon={<User className="h-4 w-4" />}
                active={hl === 'profile'}
                onClick={() => onScreenChange('profile')}
              />
              <AppMenuRow
                label="Documentos"
                icon={<FileText className="h-4 w-4" />}
                active={hl === 'docs'}
                onClick={() => onScreenChange('docs')}
              />
            </AppMenuSection>

            <AppMenuSection title="Configuração">
              <AppMenuRow
                label="Zonas"
                icon={<MapPin className="h-4 w-4" />}
                active={hl === 'zones'}
                onClick={() => onScreenChange('zones')}
              />
              <AppMenuRow
                label="Navegação"
                icon={<Compass className="h-4 w-4" />}
                active={hl === 'nav'}
                onClick={() => onScreenChange('nav')}
              />
              <AppMenuRow
                label="Categorias"
                icon={<SlidersHorizontal className="h-4 w-4" />}
                active={hl === 'categories'}
                onClick={() => onScreenChange('categories')}
              />
              <AppMenuRow
                label="Como funciona a estimativa"
                icon={<CreditCard className="h-4 w-4" />}
                active={hl === 'pricing'}
                onClick={() => onScreenChange('pricing')}
              />
              <AppMenuRow
                label="Definições"
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
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Nome</p>
                <p className="text-sm font-medium text-foreground break-words">
                  {sessionDisplayName?.trim() || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Telemóvel</p>
                <p className="text-sm font-medium text-foreground break-all">{sessionPhone ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Papel</p>
                <p className="text-sm font-medium text-foreground">{menuRoleLabel(sessionRole)}</p>
              </div>
              {accountRef ? (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Conta</p>
                  <p className="text-sm font-medium text-foreground tabular-nums">Conta · {accountRef}</p>
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
                Conta (detalhe)
              </button>
              <button
                type="button"
                data-testid="driver-menu-open-settings"
                onClick={() => onScreenChange('settings')}
                className={`flex min-h-9 items-center justify-center gap-2 ${BTN_SECONDARY_RADIUS} border border-border bg-background px-4 text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation`}
              >
                <Settings className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                Definições
              </button>
            </div>
          </div>
        ) : screen === 'settings' ? (
          <div className="space-y-4" data-testid="driver-settings-screen">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Preferências da app. Conta e sessão estão em{' '}
              <span className="font-medium text-foreground/90">Perfil</span> no menu principal.
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
