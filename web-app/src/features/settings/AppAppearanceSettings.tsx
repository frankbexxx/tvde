import { ThemeSelector } from '@/design-system/components/app/ThemeSelector'

/** Secção partilhada: Menu → Definições → Aspeto (partner, motorista, passageiro). */
export function AppAppearanceSettings() {
  return (
    <div data-testid="app-appearance-settings" className="space-y-2">
      <div>
        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Aspeto</p>
        <p className="text-xs text-muted-foreground leading-snug">
          Ambiance de trabalho — afecta menus, painéis e sheets; o mapa mantém-se legível.
        </p>
      </div>
      <ThemeSelector />
    </div>
  )
}
