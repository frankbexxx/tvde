import type { LucideIcon } from 'lucide-react'
import { Home, Inbox, Menu, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { PartnerShellTab } from './partnerShellContext'

type PartnerBottomNavProps = {
  active: PartnerShellTab
  onSelect: (tab: PartnerShellTab) => void
  inboxUnreadCount?: number
}

export function PartnerBottomNav({ active, onSelect, inboxUnreadCount = 0 }: PartnerBottomNavProps) {
  const { t } = useTranslation('partner')
  const item = (
    tab: PartnerShellTab,
    testId: string,
    label: string,
    Icon: LucideIcon,
    badge?: number
  ) => {
    const isOn = active === tab
    return (
      <button
        type="button"
        data-testid={testId}
        aria-current={isOn ? 'true' : undefined}
        onClick={() => onSelect(tab)}
        className={`relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold touch-manipulation transition-colors ${isOn ? 'text-primary border-t-2 border-primary bg-primary/5' : 'text-foreground/70 border-t-2 border-transparent hover:bg-muted/40'
          }`}
      >
        <span className="relative">
          <Icon className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
          {badge != null && badge > 0 ? (
            <span
              className="absolute -right-2 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-info px-1 text-[9px] font-bold text-info-foreground"
              aria-label={t('unreadBadge', { count: badge })}
            >
              {badge > 9 ? '9+' : badge}
            </span>
          ) : null}
        </span>
        <span className="leading-tight text-center">{label}</span>
      </button>
    )
  }

  return (
    <nav
      className="flex w-full border-t border-border bg-background/95 backdrop-blur-sm safe-area-pb"
      aria-label={t('nav.aria')}
    >
      {item('home', 'partner-bottom-nav-home', t('nav.home'), Home)}
      {item('fleet', 'partner-bottom-nav-fleet', t('nav.fleet'), Users)}
      {item('inbox', 'partner-bottom-nav-inbox', t('nav.inbox'), Inbox, inboxUnreadCount)}
      {item('menu', 'partner-open-menu', t('nav.menu'), Menu)}
    </nav>
  )
}
