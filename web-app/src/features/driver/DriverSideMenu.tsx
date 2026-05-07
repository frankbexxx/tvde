import { useMemo, useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../../components/ui/sheet'
import { useAuth } from '../../context/AuthContext'
import type { DriverNavApp } from '../../services/driverNavPreference'
import type { TripHistoryItem } from '../../api/trips'
import type { DriverDocumentsState, DriverRequiredDocument, DriverDocumentStatus } from '../../services/driverDocuments'
import type { DriverVehicleCategory } from '../../services/driverVehicleCategories'
import { DRIVER_OPEN_ACCOUNT_EVENT, DRIVER_OPEN_ACTIVITY_LOG_EVENT, DRIVER_OPEN_SETTINGS_EVENT } from './driverShellEvents'
import {
  Compass,
  CreditCard,
  FileText,
  History,
  Inbox,
  LogOut,
  MapPin,
  Settings,
  SlidersHorizontal,
  User,
} from 'lucide-react'

export type DriverMenuScreen =
  | 'root'
  | 'inbox'
  | 'earnings'
  | 'trips'
  | 'nav'
  | 'categories'
  | 'zones'
  | 'docs'
  | 'pricing'
  // Legacy / internal: permite renderizar blocos existentes sem refactor total.
  | 'account'
  | 'all'

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
        data-testid="driver-close-menu"
        className="min-h-[40px] rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground hover:bg-muted/50 touch-manipulation"
      >
        Fechar
      </button>
    </div>
  )
}

function RootItem({
  label,
  icon,
  badge,
  onClick,
}: {
  label: string
  icon?: React.ReactNode
  badge?: string | number | null
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full min-h-[48px] rounded-xl border border-border bg-card px-4 text-left text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation flex items-center justify-between gap-3"
    >
      <span className="min-w-0 truncate flex items-center gap-3">
        {icon ? <span className="shrink-0 text-foreground/80">{icon}</span> : null}
        <span className="truncate">{label}</span>
      </span>
      {badge != null ? (
        <span className="shrink-0 rounded-full bg-primary/15 text-primary px-2 py-0.5 text-xs font-bold tabular-nums">
          {badge}
        </span>
      ) : null}
    </button>
  )
}

export function DriverSideMenu(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
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
  onReportIncident: (tripId: string) => void
  renderLegacyMenu: (section: DriverMenuScreen) => React.ReactNode
}) {
  const {
    open,
    onOpenChange,
    sessionDisplayName,
    renderLegacyMenu,
  } = props
  const { sessionPhone, logout } = useAuth()

  const [screen, setScreen] = useState<DriverMenuScreen>('root')

  const title = useMemo(() => {
    if (screen === 'root') return 'Menu'
    if (screen === 'inbox') return 'Caixa de entrada'
    if (screen === 'earnings') return 'Rendimentos'
    if (screen === 'trips') return 'Viagens'
    if (screen === 'nav') return 'Navegação'
    if (screen === 'categories') return 'Categorias'
    if (screen === 'zones') return 'Zonas'
    if (screen === 'docs') return 'Documentos'
    if (screen === 'pricing') return 'Preços'
    return 'Menu do motorista'
  }, [screen])

  const close = () => {
    setScreen('root')
    onOpenChange(false)
  }

  const back = screen !== 'root' ? () => setScreen('root') : undefined

  return (
    <Sheet open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <SheetContent
        side="left"
        className="p-0 w-[85vw] max-w-[26rem] bg-background"
        hideCloseButton
        aria-label="Menu lateral do motorista"
        data-testid="driver-side-menu"
      >
        <SheetTitle className="sr-only">
          {screen === 'root' ? 'Menu do motorista' : title}
        </SheetTitle>
        <SheetDescription className="sr-only">
          Navegação do motorista: rendimentos, viagens, definições e mais.
        </SheetDescription>
        <div className="h-dvh flex flex-col">
          <MenuHeader
            title={screen === 'root' ? `${sessionDisplayName ?? 'Motorista'}` : title}
            onBack={back}
            onClose={close}
          />

          <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
          {screen === 'root' ? (
            <>
              <div className="rounded-2xl border border-border bg-gradient-to-b from-foreground/[0.06] to-transparent px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-foreground/10 border border-border flex items-center justify-center text-foreground/70 font-semibold">
                    {(sessionDisplayName ?? 'M').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-foreground">{sessionDisplayName ?? 'Motorista'}</p>
                    <p className="truncate text-xs text-muted-foreground">{sessionPhone ?? 'Sessão de teste'}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    BETA
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <RootItem
                  label="Perfil"
                  icon={<User className="h-4 w-4" />}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent(DRIVER_OPEN_ACCOUNT_EVENT))
                    close()
                  }}
                />
                <RootItem
                  label="Caixa de entrada"
                  icon={<Inbox className="h-4 w-4" />}
                  badge={null}
                  onClick={() => setScreen('inbox')}
                />
                <RootItem
                  label="Rendimentos"
                  icon={<CreditCard className="h-4 w-4" />}
                  onClick={() => setScreen('earnings')}
                />
                <RootItem
                  label="Histórico (viagens)"
                  icon={<History className="h-4 w-4" />}
                  onClick={() => setScreen('trips')}
                />
                <RootItem
                  label="Navegação"
                  icon={<Compass className="h-4 w-4" />}
                  onClick={() => setScreen('nav')}
                />
                <RootItem
                  label="Categorias"
                  icon={<SlidersHorizontal className="h-4 w-4" />}
                  onClick={() => setScreen('categories')}
                />
                <RootItem
                  label="Zonas"
                  icon={<MapPin className="h-4 w-4" />}
                  onClick={() => setScreen('zones')}
                />
                <RootItem
                  label="Documentos"
                  icon={<FileText className="h-4 w-4" />}
                  onClick={() => setScreen('docs')}
                />
                <RootItem
                  label="Preços (estimativa)"
                  icon={<CreditCard className="h-4 w-4" />}
                  onClick={() => setScreen('pricing')}
                />
                <RootItem
                  label="Registo de atividade"
                  icon={<History className="h-4 w-4" />}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent(DRIVER_OPEN_ACTIVITY_LOG_EVENT))
                    close()
                  }}
                />
                <RootItem
                  label="Definições"
                  icon={<Settings className="h-4 w-4" />}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent(DRIVER_OPEN_SETTINGS_EVENT))
                    close()
                  }}
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    close()
                  }}
                  className="w-full min-h-[48px] rounded-xl border border-border bg-background px-4 text-left text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation flex items-center gap-3"
                >
                  <LogOut className="h-4 w-4 text-foreground/80" />
                  <span>Sair</span>
                </button>
              </div>
            </>
          ) : (
            <div className="pt-1">{renderLegacyMenu(screen)}</div>
          )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

