import { useEffect, useMemo, useState } from 'react'
import { ProfileButton } from '@/design-system/components/app/ProfileButton'
import { SettingsButton } from '@/design-system/components/app/SettingsButton'
import { BrandStripe } from '@/design-system/components/brand/BrandStripe'
import { useAuth, isBackofficeStaffRole } from '@/context/AuthContext'
import { parseJwtPayload } from '@/utils/jwt'
import { HEADER_ROTATING_HINTS } from '@/components/layout/headerRotatingHints'
import { fetchRotacionalMessages } from '@/api/rotacional'
import { useTranslation } from 'react-i18next'
import { formatHeaderDateTime } from '@/i18n/format'

function headerRoleLabel(role: string, t: (k: string) => string): string {
  if (role === 'driver') return t('common:roleDriver')
  if (isBackofficeStaffRole(role)) return t('common:roleStaff')
  if (role === 'partner') return t('common:rolePartner')
  return t('common:rolePassenger')
}

export type AppHeaderBarVariant = 'default' | 'userCompact'

interface AppHeaderBarProps {
  /** Motorista/passageiro: header compacto; identidade em Menu (USER-SHELL-A / FIX-002). */
  variant?: AppHeaderBarVariant | 'driverCompact'
}

/**
 * Cabeçalho global: marca + data e hora (pt-PT) + identificador (nome BETA ou telemóvel)
 * + linha rotacional de dicas (v1 estática + v2 feed opcional via API).
 */
export function AppHeaderBar({ variant = 'default' }: AppHeaderBarProps) {
  const { t } = useTranslation()
  const compact = variant === 'userCompact' || variant === 'driverCompact'
  const { sessionDisplayName, sessionPhone, sessionRole, token } = useAuth()
  const [now, setNow] = useState(() => new Date())
  const [hintIndex, setHintIndex] = useState(0)
  const [serverHints, setServerHints] = useState<readonly string[]>([])

  const allHints = useMemo(
    () => [...HEADER_ROTATING_HINTS, ...serverHints],
    [serverHints],
  )

  useEffect(() => {
    let cancelled = false
    const load = () => {
      void fetchRotacionalMessages().then((list) => {
        if (!cancelled) setServerHints(list)
      })
    }
    load()
    const refreshId = window.setInterval(load, 600_000)
    return () => {
      cancelled = true
      window.clearInterval(refreshId)
    }
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (allHints.length <= 1) return
    const id = window.setInterval(() => {
      setHintIndex((i) => (i + 1) % allHints.length)
    }, 14_000)
    return () => window.clearInterval(id)
  }, [allHints.length])

  const { dateStr, timeStr } = formatHeaderDateTime(now)
  const dateTimeLine = `${dateStr} · ${timeStr}`
  const who = sessionDisplayName?.trim() || sessionPhone?.trim() || null
  const jwtSub = token ? parseJwtPayload(token)?.sub : undefined
  const accountRef =
    jwtSub && jwtSub.length > 0
      ? jwtSub.replace(/-/g, '').slice(-8)
      : null
  const effectiveHintIndex =
    allHints.length === 0 ? 0 : ((hintIndex % allHints.length) + allHints.length) % allHints.length
  const rotatingHint = allHints[effectiveHintIndex] ?? ''
  const shouldMarqueeHint = rotatingHint.length > 54

  const hintBlock = shouldMarqueeHint ? (
    <div
      className="app-header-marquee min-h-[1.125rem] w-full"
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
    <p
      className="text-xs text-foreground/70 min-h-[1.125rem] whitespace-nowrap overflow-hidden text-ellipsis w-full"
      title={rotatingHint}
      aria-live="polite"
    >
      {rotatingHint}
    </p>
  )

  if (compact) {
    return (
      <header
        className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/80 shrink-0"
        data-testid="app-header"
      >
        <BrandStripe />
        <div className="px-3 pt-2 pb-1.5" data-testid="app-header-user-compact">
          <div className="flex min-w-0 items-center gap-2" data-testid="app-header-brand">
            <img
              src="/brand/vamula-wordmark.png"
              alt="V@mulá"
              className="h-7 w-auto shrink-0 rounded-sm object-contain"
            />
            <p
              className="min-w-0 flex-1 truncate text-right text-[11px] tabular-nums text-muted-foreground"
              title={dateTimeLine}
            >
              {dateTimeLine}
            </p>
          </div>
          <div
            className="mt-1.5 rounded-md border border-border/60 bg-muted/35 px-2 py-1"
            data-testid="app-header-hint-strip"
          >
            {hintBlock}
          </div>
        </div>
      </header>
    )
  }

  return (
    <header
      className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/80 shrink-0"
      data-testid="app-header"
    >
      <BrandStripe />
      <div className="px-4 pt-3 pb-2">
        <div className="flex justify-between items-start gap-2">
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
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span
                className="inline-flex items-center rounded-full border border-border bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-foreground"
                title="Papel desta sessão na API"
                data-testid="app-header-role-pill"
              >
                {headerRoleLabel(sessionRole, t)}
              </span>
              {accountRef ? (
                <span
                  className="text-[11px] text-muted-foreground tabular-nums"
                  title={jwtSub ? `ID conta: ${jwtSub}` : undefined}
                  data-testid="app-header-account-ref"
                >
                  Conta · {accountRef}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground truncate" title={dateTimeLine}>
              {dateTimeLine}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0 pt-0.5">
            <ProfileButton />
            <SettingsButton />
          </div>
        </div>
        <div
          className="-mx-4 mt-2 border-t border-border/70 bg-muted/35 px-4 py-1.5"
          data-testid="app-header-hint-strip"
        >
          {hintBlock}
        </div>
      </div>
    </header>
  )
}
