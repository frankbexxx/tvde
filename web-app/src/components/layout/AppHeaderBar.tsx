import { useEffect, useState } from 'react'
import { ProfileButton } from '@/design-system/components/app/ProfileButton'
import { SettingsButton } from '@/design-system/components/app/SettingsButton'
import { BrandStripe } from '@/design-system/components/brand/BrandStripe'
import { useAuth } from '@/context/AuthContext'

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
          <img
            src="/brand/vamula-wordmark.png"
            alt="V@mulá"
            className="mb-0.5 h-8 w-auto rounded-sm object-contain"
          />
          <h1 className="text-xs font-bold uppercase tracking-wide text-muted-foreground leading-tight">TVDE</h1>
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
