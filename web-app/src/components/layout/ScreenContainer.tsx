import type { ReactNode } from 'react'

interface ScreenContainerProps {
  children: ReactNode
  /** Optional fixed bottom button - renders outside scroll area */
  bottomButton?: ReactNode
  /** `flush` — barra edge-to-edge (ex. navegação inferior); sem `px-5 py-4` extra no contentor fixo. */
  bottomBarVariant?: 'inset' | 'flush'
  /** Quando definido, o contentor scrollável recebe este `id` (ex.: scroll ao tocar «Início» na barra inferior). */
  mainScrollId?: string
}

/**
 * Mobile-first screen wrapper.
 * max-w-md, centered, generous padding, flex column, min-h-screen.
 * Bottom button is position:fixed so always visible (even when content scrolls).
 */
export function ScreenContainer({
  children,
  bottomButton,
  bottomBarVariant = 'inset',
  mainScrollId,
}: ScreenContainerProps) {
  const scrollBottomPad =
    bottomButton && bottomBarVariant === 'flush' ? 'pb-24' : bottomButton ? 'pb-20' : 'pb-8'
  return (
    <div className="min-h-dvh flex flex-col max-w-md mx-auto w-full bg-background">
      <div
        id={mainScrollId}
        className={`flex-1 flex flex-col px-5 pt-6 pb-4 overflow-y-auto ${scrollBottomPad}`}
      >
        {children}
      </div>
      {bottomButton ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border shadow-card">
          <div
            className={
              bottomBarVariant === 'flush'
                ? 'max-w-md mx-auto w-full'
                : 'max-w-md mx-auto px-5 py-4 safe-area-pb'
            }
          >
            {bottomButton}
          </div>
        </div>
      ) : null}
    </div>
  )
}
