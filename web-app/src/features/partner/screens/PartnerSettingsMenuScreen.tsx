import { AppAppearanceSettings } from '../../settings/AppAppearanceSettings'
import { AppRouteModeSwitch } from '../../settings/AppRouteModeSwitch'

type PartnerSettingsMenuScreenProps = {
  onRefresh: () => void
}

export function PartnerSettingsMenuScreen({ onRefresh }: PartnerSettingsMenuScreenProps) {
  return (
    <div className="space-y-4 text-sm text-foreground" data-testid="partner-settings-screen">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Preferências do gestor de frota. Conta e sessão estão em{' '}
        <span className="font-medium text-foreground/90">Perfil</span> no menu principal.
      </p>
      <AppAppearanceSettings />
      <AppRouteModeSwitch />
      <button
        type="button"
        onClick={onRefresh}
        className="w-full min-h-11 rounded-xl border border-border bg-card py-2.5 text-sm font-semibold text-foreground hover:bg-muted/40 touch-manipulation"
      >
        Actualizar vista
      </button>
    </div>
  )
}
