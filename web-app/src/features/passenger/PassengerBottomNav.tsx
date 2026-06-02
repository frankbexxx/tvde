import type { LucideIcon } from 'lucide-react'
import { History, Home, Menu, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export type PassengerShellTab = 'home' | 'history' | 'account' | 'menu'

type PassengerBottomNavProps = {
  active: PassengerShellTab
  onSelect: (tab: PassengerShellTab) => void
}

export function PassengerBottomNav({ active, onSelect }: PassengerBottomNavProps) {
  const { t } = useTranslation('passenger')
  const item = (tab: PassengerShellTab, testId: string, label: string, Icon: LucideIcon) => {
    const isOn = active === tab
    return (
      <button
        type="button"
        data-testid={testId}
        aria-current={isOn ? 'true' : undefined}
        onClick={() => onSelect(tab)}
        className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold touch-manipulation transition-colors ${isOn ? 'text-primary border-t-2 border-primary bg-primary/5' : 'text-foreground/70 border-t-2 border-transparent hover:bg-muted/40'
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
      aria-label={t('nav.aria')}
    >
      {item('home', 'passenger-bottom-nav-home', t('nav.home'), Home)}
      {item('history', 'passenger-bottom-nav-history', t('nav.history'), History)}
      {item('account', 'passenger-bottom-nav-account', t('nav.account'), User)}
      {item('menu', 'passenger-bottom-nav-menu', t('nav.menu'), Menu)}
    </nav>
  )
}
