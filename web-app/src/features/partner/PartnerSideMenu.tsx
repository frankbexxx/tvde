import { useAuth } from '../../context/AuthContext'
import { BarChart3, Car, FileText, Inbox, Settings, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
  | 'fleet_vehicles'
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
  const { t } = useTranslation('partner')
  const { open, onOpenChange, screen, onNavigate, onBack, renderScreen } = props
  const { logout, sessionDisplayName, sessionPhone } = useAuth()
  const { inboxUnreadCount, menuRootHighlight } = usePartnerShell()

  const headerTitle =
    screen === 'root' ? (sessionDisplayName ?? t('menuTitle.default')) : partnerMenuTitle(screen)
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
      srDescription={t('sideMenu.srDescription')}
      closeOnDismiss={close}
    >
      <AppMenuHeader title={headerTitle} onBack={back} onClose={close} closeTestId="partner-close-menu" />
      <AppMenuBody>
        {screen === 'root' ? (
          <>
            <AppMenuIdentity
              testId="partner-menu-identity"
              initial={initial}
              name={sessionDisplayName ?? t('sideMenu.defaultName')}
              phone={sessionPhone ?? t('sideMenu.sessionFallback')}
              roleBadge={t('sideMenu.roleBadge')}
              flagAccent={flagAccent}
            />
            <AppMenuSection title={t('sideMenu.sections.operation')}>
              <AppMenuRow
                label={t('sideMenu.rows.fleet')}
                icon={<Car className="h-4 w-4" />}
                active={hl === 'fleet'}
                onClick={() => onNavigate('fleet')}
              />
              <AppMenuRow
                label={t('sideMenu.rows.trips')}
                icon={<FileText className="h-4 w-4" />}
                active={hl === 'trips'}
                onClick={() => onNavigate('trips')}
              />
              <AppMenuRow
                label={t('sideMenu.rows.reports')}
                icon={<BarChart3 className="h-4 w-4" />}
                active={hl === 'reports'}
                onClick={() => onNavigate('reports')}
              />
              <AppMenuRow
                label={t('sideMenu.rows.inbox')}
                icon={<Inbox className="h-4 w-4" />}
                badge={inboxUnreadCount}
                active={hl === 'inbox'}
                onClick={() => onNavigate('inbox')}
              />
            </AppMenuSection>
            <AppMenuSection title={t('sideMenu.sections.account')}>
              <AppMenuRow
                label={t('sideMenu.rows.profile')}
                icon={<User className="h-4 w-4" />}
                testId="partner-menu-profile"
                active={hl === 'profile'}
                onClick={() => onNavigate('profile')}
              />
            </AppMenuSection>
            <AppMenuSection title={t('sideMenu.sections.app')}>
              <AppMenuRow
                label={t('sideMenu.rows.settings')}
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
