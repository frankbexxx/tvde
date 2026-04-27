import { useEffect, useState } from 'react'
import { ProfileButton } from '@/design-system/components/app/ProfileButton'
import { SettingsButton } from '@/design-system/components/app/SettingsButton'
import { BrandStripe } from '@/design-system/components/brand/BrandStripe'
import { useAuth } from '@/context/AuthContext'
import vamulaLogo from '../../../../image/vamula_1.png'

/**
 * Cabeçalho global: marca + data (pt-PT) + identificador (nome BETA ou telemóvel).
 */
export function AppHeaderBar() {
  const { sessionDisplayName, sessionPhone } = useAuth()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const dateStr = now.toLocaleDateString('pt-PT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const who = sessionDisplayName?.trim() || sessionPhone?.trim() || null

  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/80 shrink-0">
      <BrandStripe />
      <div className="flex justify-between items-start px-4 py-3 gap-2">
        <div className="min-w-0 flex-1 pr-2">
          <div className="h-8 w-auto max-w-[220px] mb-0.5">
            <img
              src={vamulaLogo}
              alt="V@mulá"
              className="h-full w-auto object-contain rounded-md"
            />
          </div>
          <p
            className="text-xs text-muted-foreground mt-0.5 truncate"
            title={who ? `${dateStr} · ${who}` : dateStr}
          >
            {dateStr}
            {who ? ` · ${who}` : null}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          <ProfileButton />
          <SettingsButton />
        </div>
      </div>
    </header>
  )
}
