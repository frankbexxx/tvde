import { useEffect, useState } from 'react'
import { ProfileButton } from '@/design-system/components/app/ProfileButton'
import { SettingsButton } from '@/design-system/components/app/SettingsButton'
import { BrandStripe } from '@/design-system/components/brand/BrandStripe'
import { useAuth } from '@/context/AuthContext'
import { HEADER_ROTATING_HINTS } from '@/components/layout/headerRotatingHints'

/**
 * Cabeçalho global: marca + data e hora (pt-PT) + identificador (nome BETA ou telemóvel)
 * + linha rotacional de dicas (v1 sem APIs externas).
 */
export function AppHeaderBar() {
  const { sessionDisplayName, sessionPhone } = useAuth()
  const [now, setNow] = useState(() => new Date())
  const [hintIndex, setHintIndex] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (HEADER_ROTATING_HINTS.length <= 1) return
    const id = window.setInterval(() => {
      setHintIndex((i) => (i + 1) % HEADER_ROTATING_HINTS.length)
    }, 14_000)
    return () => window.clearInterval(id)
  }, [])

  const dateStr = now.toLocaleDateString('pt-PT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const timeStr = now.toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const dateTimeLine = `${dateStr} · ${timeStr}`
  const who = sessionDisplayName?.trim() || sessionPhone?.trim() || null
  const rotatingHint = HEADER_ROTATING_HINTS[hintIndex] ?? HEADER_ROTATING_HINTS[0]
  const shouldMarqueeHint = rotatingHint.length > 54

  return (
    <header
      className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/80 shrink-0"
      data-testid="app-header"
    >
      <BrandStripe />
      <div className="flex justify-between items-start px-4 py-3 gap-2">
        <div className="min-w-0 flex-1 pr-2">
          <div className="mb-0.5 flex items-end gap-3 min-w-0" data-testid="app-header-brand">
            <img
              src="/brand/vamula-wordmark.png"
              alt="V@mulá"
              className="h-7 w-auto rounded-sm object-contain shrink-0"
            />
            {who ? (
              <span className="min-w-0 truncate text-sm italic font-medium text-foreground/85 tracking-tight">
                {who}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground truncate" title={dateTimeLine}>
            {dateTimeLine}
          </p>
          {shouldMarqueeHint ? (
            <div
              className="app-header-marquee mt-0.5 min-h-[1.125rem]"
              title={rotatingHint}
              aria-live="polite"
            >
              <div className="app-header-marquee-track">
                <span className="app-header-marquee-item">{rotatingHint}</span>
                <span className="app-header-marquee-item" aria-hidden="true">
                  {rotatingHint}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-foreground/70 mt-0.5 min-h-[1.125rem]" title={rotatingHint} aria-live="polite">
              {rotatingHint}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          <ProfileButton />
          <SettingsButton />
        </div>
      </div>
    </header>
  )
}
