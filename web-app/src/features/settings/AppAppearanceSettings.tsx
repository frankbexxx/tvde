import { ThemeSelector } from '@/design-system/components/app/ThemeSelector'

/** Secção partilhada: Menu → Definições → Aspeto (partner, motorista, passageiro). */
export function AppAppearanceSettings() {
  return (
    <div data-testid="app-appearance-settings">
      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Aspeto</p>
      <ThemeSelector />
    </div>
  )
}
