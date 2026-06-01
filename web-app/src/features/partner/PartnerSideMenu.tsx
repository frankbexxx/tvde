import { useAuth } from '../../context/AuthContext'
import { BarChart3, Car, FileText, Inbox, Settings, User } from 'lucide-react'
import { getTheme } from '@/hooks/useTheme'
import { partnerMenuTitle } from './partnerMenuNav'
import { usePartnerShell } from './partnerShellContext'
import {
  AppMenuBody,
  AppMenuHeader,
  AppMenuIdentity,
  AppMenuLogoutRow,
  AppMenuRow,
  AppMenuSection,
  AppSideMenuSheet,
} from '../../components/layout/AppMenuShell'

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
  const { inboxUnreadCount, menuRootHighlight } = usePartnerShell()

  const headerTitle =
    screen === 'root' ? (sessionDisplayName ?? 'Parceiro') : partnerMenuTitle(screen)
  const flagAccent = getTheme() === 'portugal' || getTheme() === 'atlantico'

  const close = () => {
    onNavigate('root')
    onOpenChange(false)
  }

  const back = screen !== 'root' ? onBack : undefined
  const initial = (sessionDisplayName ?? 'P').slice(0, 1).toUpperCase()
  const hl = menuRootHighlight

  return (
    <AppSideMenuSheet
      open={open}
      onOpenChange={onOpenChange}
      testId="partner-side-menu"
      srTitle={headerTitle}
      srDescription="Navegação do parceiro: frota, viagens, relatórios, caixa, perfil e definições."
      closeOnDismiss={close}
    >
      <AppMenuHeader title={headerTitle} onBack={back} onClose={close} closeTestId="partner-close-menu" />
      <AppMenuBody>
        {screen === 'root' ? (
          <>
            <AppMenuIdentity
              testId="partner-menu-identity"
              initial={initial}
              name={sessionDisplayName ?? 'Gestor frota'}
              phone={sessionPhone ?? 'Sessão'}
              roleBadge="Parceiro"
              flagAccent={flagAccent}
            />
            <AppMenuSection title="Operação">
              <AppMenuRow
                label="Frota"
                icon={<Car className="h-4 w-4" />}
                active={hl === 'fleet'}
                onClick={() => onNavigate('fleet')}
              />
              <AppMenuRow
                label="Viagens"
                icon={<FileText className="h-4 w-4" />}
                active={hl === 'trips'}
                onClick={() => onNavigate('trips')}
              />
              <AppMenuRow
                label="Relatórios"
                icon={<BarChart3 className="h-4 w-4" />}
                active={hl === 'reports'}
                onClick={() => onNavigate('reports')}
              />
              <AppMenuRow
                label="Caixa"
                icon={<Inbox className="h-4 w-4" />}
                badge={inboxUnreadCount}
                active={hl === 'inbox'}
                onClick={() => onNavigate('inbox')}
              />
            </AppMenuSection>
            <AppMenuSection title="Conta">
              <AppMenuRow
                label="Perfil"
                icon={<User className="h-4 w-4" />}
                testId="partner-menu-profile"
                active={hl === 'profile'}
                onClick={() => onNavigate('profile')}
              />
            </AppMenuSection>
            <AppMenuSection title="App">
              <AppMenuRow
                label="Definições"
                icon={<Settings className="h-4 w-4" />}
                testId="partner-menu-settings"
                active={hl === 'settings'}
                onClick={() => onNavigate('settings')}
              />
            </AppMenuSection>
            <AppMenuLogoutRow
              testId="partner-menu-logout"
              onClick={() => {
                logout()
                close()
              }}
            />
          </>
        ) : (
          <div className="pt-1">{renderScreen(screen)}</div>
        )}
      </AppMenuBody>
    </AppSideMenuSheet>
  )
}
