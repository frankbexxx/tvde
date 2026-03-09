import type { ReactNode } from 'react'

interface ScreenContainerProps {
  children: ReactNode
  /** Optional fixed bottom button - renders outside scroll area */
  bottomButton?: ReactNode
}

/**
 * Mobile-first screen wrapper.
 * max-w-md, centered, generous padding, flex column, min-h-screen.
 * Bottom button is position:fixed so always visible (even when content scrolls).
 */
export function ScreenContainer({ children, bottomButton }: ScreenContainerProps) {
  return (
    <div className="min-h-dvh flex flex-col max-w-md mx-auto w-full bg-background">
      <div
        className={`flex-1 flex flex-col px-5 py-6 overflow-y-auto ${
          bottomButton ? 'pb-24' : 'pb-8'
        }`}
      >
        {children}
      </div>
      {bottomButton && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-background border-t border-border shadow-card">
          <div className="max-w-md mx-auto px-5 py-4 safe-area-pb">
            {bottomButton}
          </div>
        </div>
      )}
    </div>
  )
}
