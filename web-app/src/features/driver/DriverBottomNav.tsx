import type { LucideIcon } from 'lucide-react'
import { Euro, Home, Inbox, Menu } from 'lucide-react'

export type DriverShellTab = 'home' | 'earnings' | 'inbox' | 'menu'

type DriverBottomNavProps = {
  active: DriverShellTab
  onSelect: (tab: DriverShellTab) => void
}

export function DriverBottomNav({ active, onSelect }: DriverBottomNavProps) {
  const item = (tab: DriverShellTab, testId: string, label: string, Icon: LucideIcon) => {
    const isOn = active === tab
    return (
      <button
        type="button"
        data-testid={testId}
        aria-current={isOn ? 'true' : undefined}
        onClick={() => onSelect(tab)}
        className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold touch-manipulation transition-colors ${
          isOn ? 'text-primary border-t-2 border-primary bg-primary/5' : 'text-foreground/70 border-t-2 border-transparent hover:bg-muted/40'
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
        <span className="leading-tight text-center">{label}</span>
      </button>
    )
  }

  return (
    <nav
      className="flex w-full border-t border-border bg-background/95 backdrop-blur-sm safe-area-pb"
      aria-label="Navegação principal do motorista"
    >
      {item('home', 'driver-bottom-nav-home', 'Início', Home)}
      {item('earnings', 'driver-bottom-nav-earnings', 'Ganhos', Euro)}
      {item('inbox', 'driver-bottom-nav-inbox', 'Caixa', Inbox)}
      {item('menu', 'driver-bottom-nav-menu', 'Menu', Menu)}
    </nav>
  )
}
