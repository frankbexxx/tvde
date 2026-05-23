import type { ReactNode } from 'react'
import {
  INFO_BOX_BODY_COMPACT,
  INFO_BOX_BODY_SM,
  INFO_BOX_PASSENGER,
  INFO_BOX_TITLE_COMPACT,
  INFO_BOX_TITLE_LG,
} from './infoBoxTemplate'

/** Tom visual do painel de estado (alinhado a StatusHeader / viagem). */
export type InfoPanelTone =
  | 'waiting'
  | 'empty'
  | 'primary'
  | 'success'
  | 'secondary'
  | 'neutral'
  | 'error'

const TONE_STYLES: Record<InfoPanelTone, string> = {
  waiting: 'border-border bg-card',
  empty: 'border-border bg-card',
  primary: 'border-primary/35 border-l-4 border-l-primary bg-primary/10',
  success: 'border-success/30 border-l-4 border-l-success bg-success/15',
  secondary:
    'border-secondary/40 border-l-4 bg-secondary/15 [border-left-color:hsl(var(--color-flag-blue,218_100%_23%))]',
  neutral: 'border-border bg-card',
  error: 'border-destructive/35 border-l-4 border-l-destructive bg-destructive/10',
}

const TITLE_STYLES: Record<InfoPanelTone, string> = {
  waiting: 'text-foreground',
  empty: 'text-foreground',
  primary: 'text-primary',
  success: 'text-success',
  secondary: 'text-secondary-foreground',
  neutral: 'text-foreground/85',
  error: 'text-destructive',
}

export interface InfoPanelProps {
  tone: InfoPanelTone
  title: string
  subtitle?: string
  /** Linhas meta (pagamento, distância, poll) abaixo do subtítulo. */
  meta?: readonly string[]
  actions?: ReactNode
  footer?: ReactNode
  /** Centrar título e texto (ex.: à procura de motorista). */
  centered?: boolean
  /** Passageiro em mapa — caixa mais baixa e compacta (dia 22). */
  compact?: boolean
  testId?: string
}

export function InfoPanel({
  tone,
  title,
  subtitle,
  meta,
  actions,
  footer,
  centered = false,
  compact = false,
  testId,
}: InfoPanelProps) {
  const align = centered ? 'items-center text-center' : 'items-start text-left'
  const titleClass = TITLE_STYLES[tone] ?? TITLE_STYLES.neutral
  const pad = compact ? 'px-2 py-1.5 space-y-1' : 'px-4 py-4 space-y-4'
  const titleSize = compact ? INFO_BOX_TITLE_COMPACT : INFO_BOX_TITLE_LG
  const bodySize = compact ? INFO_BOX_BODY_COMPACT : INFO_BOX_BODY_SM

  return (
    <div
      className={`${INFO_BOX_PASSENGER} ${pad} transition-all duration-300 ease-out animate-in fade-in ${TONE_STYLES[tone] ?? TONE_STYLES.neutral}`}
      role="status"
      aria-label={title}
      aria-live="polite"
      data-testid={testId}
    >
      <div className={`flex flex-col gap-0.5 ${align}`}>
        <p className={`${titleSize} ${titleClass} ${centered ? 'px-1' : ''}`}>{title}</p>
        {subtitle ? (
          <p className={`${bodySize} ${centered ? 'max-w-sm px-2' : ''}`}>{subtitle}</p>
        ) : null}
        {meta?.map((line) => (
          <p
            key={line}
            className={`${bodySize} text-foreground/75 ${centered ? 'max-w-sm px-2' : ''}`}
          >
            {line}
          </p>
        ))}
      </div>
      {actions ? <div className={centered ? 'flex flex-col items-center' : ''}>{actions}</div> : null}
      {footer}
    </div>
  )
}
