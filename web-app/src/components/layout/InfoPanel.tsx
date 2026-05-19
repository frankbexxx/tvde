import type { ReactNode } from 'react'

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
  testId,
}: InfoPanelProps) {
  const align = centered ? 'items-center text-center' : 'items-start text-left'
  const titleClass = TITLE_STYLES[tone] ?? TITLE_STYLES.neutral

  return (
    <div
      className={`space-y-4 rounded-2xl border px-4 py-4 transition-all duration-500 ease-out animate-in fade-in duration-300 ${TONE_STYLES[tone] ?? TONE_STYLES.neutral}`}
      role="status"
      aria-label={title}
      aria-live="polite"
      data-testid={testId}
    >
      <div className={`flex flex-col gap-1 ${align}`}>
        <p className={`text-lg font-semibold ${titleClass} ${centered ? 'px-2' : ''}`}>{title}</p>
        {subtitle ? (
          <p
            className={`text-sm text-foreground/80 leading-snug ${centered ? 'max-w-sm px-4' : 'mt-1'}`}
          >
            {subtitle}
          </p>
        ) : null}
        {meta?.map((line) => (
          <p
            key={line}
            className={`text-sm text-foreground/75 leading-snug ${centered ? 'max-w-sm px-4' : ''}`}
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
