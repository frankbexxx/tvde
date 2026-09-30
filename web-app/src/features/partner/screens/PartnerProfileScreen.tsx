import { useTranslation } from 'react-i18next'
import { AccountPanel } from '../../account/AccountPanel'

export function PartnerProfileScreen() {
  const { t } = useTranslation('partner')

  return (
    <div className="space-y-4 text-sm text-foreground" data-testid="partner-menu-profile-screen">
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t('profile.intro')}
      </p>
      <AccountPanel />
    </div>
  )
}
