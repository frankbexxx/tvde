import { useAuth } from '../../context/AuthContext'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../../components/ui/sheet'
import { BarChart3, Car, FileText, Inbox, LogOut, Settings, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { partnerMenuTitle } from './partnerMenuNav'
import { usePartnerShell } from './partnerShellContext'
import {
  MENU_BTN_SM,
  MENU_ROW_BTN,
  MENU_SURFACE,
  PARTNER_SECTION_TITLE,
} from '../../components/layout/infoBoxTemplate'

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
          <button type="button" onClick={onBack} className={`${MENU_BTN_SM} px-3 text-sm font-semibold`}>
            Voltar
          </button>
        ) : null}
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        data-testid="partner-close-menu"
        className={`${MENU_BTN_SM} px-3 text-sm font-semibold`}
      >
        Fechar
      </button>
    </div>
  )
}

function MenuRow({
  label,
  icon,
  onClick,
  testId,
  badge,
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
  testId?: string
  badge?: number
}) {
  return (
    <button type="button" data-testid={testId} onClick={onClick} className={cn(MENU_ROW_BTN, 'justify-between')}>
      <span className="flex min-w-0 items-center gap-3">
        <span className="shrink-0 text-foreground/80">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      {badge != null && badge > 0 ? (
        <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground tabular-nums">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </button>
  )
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <p className={PARTNER_SECTION_TITLE}>{title}</p>
      <div className="space-y-2">{children}</div>
    </section>
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
  const { logout, sessionDisplayName, sessionPhone } = useAuth()
  const { inboxUnreadCount } = usePartnerShell()

  const headerTitle =
    screen === 'root' ? (sessionDisplayName ?? 'Parceiro') : partnerMenuTitle(screen)

  const close = () => {
    onNavigate('root')
    onOpenChange(false)
  }

  const back = screen !== 'root' ? onBack : undefined
  const initial = (sessionDisplayName ?? 'P').slice(0, 1).toUpperCase()

  return (
    <Sheet open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <SheetContent
        data-testid="partner-side-menu"
        side="left"
        className="p-0 w-[85vw] max-w-[26rem] bg-background"
        hideCloseButton
      >
        <SheetTitle className="sr-only">{headerTitle}</SheetTitle>
        <SheetDescription className="sr-only">
          Navegação do parceiro: frota, viagens, relatórios, caixa, perfil e definições.
        </SheetDescription>
        <div className="h-dvh flex flex-col">
          <MenuHeader title={headerTitle} onBack={back} onClose={close} />
          <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
            {screen === 'root' ? (
              <>
                <div className={MENU_SURFACE} data-testid="partner-menu-identity">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-foreground/10 text-base font-semibold text-foreground/70">
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-foreground">
                        {sessionDisplayName ?? 'Gestor frota'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{sessionPhone ?? 'Sessão'}</p>
                      <p className="mt-1 inline-block rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        Parceiro
                      </p>
                    </div>
                  </div>
                </div>

                <MenuSection title="Operação">
                  <MenuRow
                    label="Frota"
                    icon={<Car className="h-4 w-4" />}
                    onClick={() => onNavigate('fleet')}
                  />
                  <MenuRow
                    label="Viagens"
                    icon={<FileText className="h-4 w-4" />}
                    onClick={() => onNavigate('trips')}
                  />
                  <MenuRow
                    label="Relatórios"
                    icon={<BarChart3 className="h-4 w-4" />}
                    onClick={() => onNavigate('reports')}
                  />
                  <MenuRow
                    label="Caixa"
                    icon={<Inbox className="h-4 w-4" />}
                    badge={inboxUnreadCount}
                    onClick={() => onNavigate('inbox')}
                  />
                </MenuSection>

                <MenuSection title="Conta">
                  <MenuRow
                    label="Perfil"
                    icon={<User className="h-4 w-4" />}
                    testId="partner-menu-profile"
                    onClick={() => onNavigate('profile')}
                  />
                </MenuSection>

                <MenuSection title="App">
                  <MenuRow
                    label="Definições"
                    icon={<Settings className="h-4 w-4" />}
                    testId="partner-menu-settings"
                    onClick={() => onNavigate('settings')}
                  />
                </MenuSection>

                <button
                  type="button"
                  data-testid="partner-menu-logout"
                  onClick={() => {
                    logout()
                    close()
                  }}
                  className={cn(MENU_ROW_BTN, 'bg-background w-full')}
                >
                  <LogOut className="h-4 w-4 text-foreground/80" />
                  Sair
                </button>
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
