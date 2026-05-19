import type { ReactNode } from 'react'

export interface ActionPanelProps {
  title: string
  onClose?: () => void
  closeLabel?: string
  closeTestId?: string
  children: ReactNode
  className?: string
}

/** Painel inferior de acção (ex.: oferta no mapa — G08). */
export function ActionPanel({
  title,
  onClose,
  closeLabel = 'Fechar',
  closeTestId = 'action-panel-close',
  children,
  className = '',
}: ActionPanelProps) {
  return (
    <div className={`space-y-2 ${className}`.trim()} data-testid="action-panel">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {onClose ? (
          <button
            type="button"
            data-testid={closeTestId}
            onClick={onClose}
            className="min-h-[36px] shrink-0 rounded-lg border border-border px-2.5 text-xs font-semibold text-foreground hover:bg-muted/50 touch-manipulation"
          >
            {closeLabel}
          </button>
        ) : null}
      </div>
      {children}
    </div>
  )
}
