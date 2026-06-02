import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../context/AuthContext'
import { BetaAccountPanel } from '../../account/BetaAccountPanel'

export function PartnerProfileScreen() {
  const { t } = useTranslation('partner')
  const { sessionDisplayName, sessionPhone } = useAuth()

  return (
    <div className="space-y-4 text-sm text-foreground" data-testid="partner-menu-profile-screen">
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t('profile.intro')}
      </p>
      <div className="rounded-xl border border-border bg-background px-3 py-3 space-y-1 text-xs">
        <p className="font-medium text-foreground">{sessionDisplayName ?? t('sideMenu.defaultName')}</p>
        <p className="text-muted-foreground">{sessionPhone ?? t('profile.phoneUnavailable')}</p>
      </div>
      <BetaAccountPanel />
    </div>
  )
}
