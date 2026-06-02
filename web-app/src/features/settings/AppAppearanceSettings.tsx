import { useTranslation } from 'react-i18next'
import { ThemeSelector } from '@/design-system/components/app/ThemeSelector'
import { LanguageSelector } from './LanguageSelector'

/** Secção partilhada: Menu → Definições → Aspeto (partner, motorista, passageiro). */
export function AppAppearanceSettings() {
  const { t } = useTranslation('settings')
  return (
    <div data-testid="app-appearance-settings" className="space-y-4">
      <LanguageSelector />
      <div className="space-y-2">
        <div>
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">{t('appearance')}</p>
          <p className="text-xs text-muted-foreground leading-snug">{t('appearanceHint')}</p>
        </div>
        <ThemeSelector />
      </div>
    </div>
  )
}
