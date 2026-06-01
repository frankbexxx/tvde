import { useAuth } from '../../context/AuthContext'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../../components/ui/sheet'
import { BarChart3, Car, FileText, Inbox, LogOut, Settings, User, X } from 'lucide-react'
import { partnerMenuTitle } from './partnerMenuNav'
import { MENU_ROW_BTN } from '../../components/layout/infoBoxTemplate'

export type PartnerMenuScreen =
  | 'root'
  | 'fleet'
  | 'fleet_list'
  | 'fleet_map'
  | 'fleet_add'
  | 'trips'
  | 'trips_summary'
  | 'trips_list'
  | 'trips_export'
  | 'reports'
  | 'settings'
  | 'profile'
  | 'inbox'

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
        className="min-h-[40px] rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground hover:bg-muted/50 touch-manipulation"
        aria-label="Fechar menu"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function RootItem({
  label,
  icon,
  onClick,
  testId,
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
  testId?: string
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="w-full min-h-[48px] rounded-xl border border-border bg-card px-4 text-left text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation flex items-center justify-between gap-3"
    >
      <span className="min-w-0 truncate flex items-center gap-3">
        <span className="shrink-0 text-foreground/80">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
    </button>
  )
}

export function PartnerSideMenu(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  screen: PartnerMenuScreen
  onNavigate: (screen: PartnerMenuScreen, backTo?: PartnerMenuScreen) => void
  onBack: () => void
  renderScreen: (screen: PartnerMenuScreen) => React.ReactNode
}) {
  const { open, onOpenChange, screen, onNavigate, onBack, renderScreen } = props
  const { logout } = useAuth()

  const title = partnerMenuTitle(screen)

  const close = () => {
    onNavigate('root')
    onOpenChange(false)
  }

  const back = screen !== 'root' ? onBack : undefined

  return (
    <Sheet open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <SheetContent
        data-testid="partner-side-menu"
        side="left"
        className="p-0 w-[85vw] max-w-[26rem] bg-background"
        hideCloseButton
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <SheetDescription className="sr-only">
          Navegação do parceiro: frota, viagens, relatórios, caixa, perfil e definições.
        </SheetDescription>
        <div className="h-dvh flex flex-col">
          <MenuHeader title={title} onBack={back} onClose={close} />
          <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
            {screen === 'root' ? (
              <>
                <div className="space-y-2">
                  <RootItem
                    label="Frota"
                    icon={<Car className="h-4 w-4" />}
                    onClick={() => onNavigate('fleet')}
                  />
                  <RootItem
                    label="Viagens"
                    icon={<FileText className="h-4 w-4" />}
                    onClick={() => onNavigate('trips')}
                  />
                  <RootItem
                    label="Relatórios"
                    icon={<BarChart3 className="h-4 w-4" />}
                    onClick={() => onNavigate('reports')}
                  />
                  <RootItem
                    label="Caixa"
                    icon={<Inbox className="h-4 w-4" />}
                    onClick={() => onNavigate('inbox')}
                  />
                  <RootItem
                    label="Perfil"
                    icon={<User className="h-4 w-4" />}
                    testId="partner-menu-profile"
                    onClick={() => onNavigate('profile')}
                  />
                  <RootItem
                    label="Definições"
                    icon={<Settings className="h-4 w-4" />}
                    onClick={() => onNavigate('settings')}
                  />
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    data-testid="partner-menu-logout"
                    onClick={() => {
                      logout()
                      close()
                    }}
                    className={`${MENU_ROW_BTN} bg-background w-full`}
                  >
                    <LogOut className="h-4 w-4 text-foreground/80" />
                    Sair
                  </button>
                </div>
              </>
            ) : (
              <div className="pt-1">{renderScreen(screen)}</div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
