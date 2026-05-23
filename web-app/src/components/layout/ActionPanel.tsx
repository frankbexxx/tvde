import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { BTN_SECONDARY_RADIUS } from './infoBoxTemplate'

export interface ActionPanelProps {
  title?: string
  onClose?: () => void
  closeLabel?: string
  closeVariant?: 'text' | 'icon'
  closeTestId?: string
  children: ReactNode
  className?: string
}

/** Painel inferior de acção (ex.: oferta no mapa — G08). */
export function ActionPanel({
  title,
  onClose,
  closeLabel = 'Fechar',
  closeVariant = 'text',
  closeTestId = 'action-panel-close',
  children,
  className = '',
}: ActionPanelProps) {
  const showTextHeader = Boolean(title) || (onClose && closeVariant === 'text')
  const iconClose = onClose && closeVariant === 'icon'

  const closeButton =
    onClose && closeVariant === 'text' ? (
      <button
        type="button"
        data-testid={closeTestId}
        onClick={onClose}
        className={`min-h-[36px] shrink-0 px-2.5 text-xs font-semibold text-foreground hover:bg-muted/50 touch-manipulation ${BTN_SECONDARY_RADIUS} border border-border`}
      >
        {closeLabel}
      </button>
    ) : null

  return (
    <div
      className={`${iconClose ? 'relative' : ''} ${showTextHeader ? 'space-y-2' : ''} ${className}`.trim()}
      data-testid="action-panel"
    >
      {iconClose ? (
        <button
          type="button"
          data-testid={closeTestId}
          onClick={onClose}
          aria-label="Fechar"
          className={`absolute right-0 top-0 z-10 inline-flex min-h-[44px] min-w-[44px] items-center justify-center ${BTN_SECONDARY_RADIUS} text-foreground/80 hover:bg-muted/50 hover:text-foreground touch-manipulation`}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
      {showTextHeader ? (
        <div className="flex items-center justify-between gap-2">
          {title ? <p className="text-sm font-semibold text-foreground">{title}</p> : <span />}
          {closeButton}
        </div>
      ) : null}
      {children}
    </div>
  )
}
