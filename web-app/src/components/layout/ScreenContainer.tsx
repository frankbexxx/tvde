import type { ReactNode } from 'react'

interface ScreenContainerProps {
  children: ReactNode
  /** Optional fixed bottom button - renders outside scroll area */
  bottomButton?: ReactNode
  /** `flush` — barra edge-to-edge (ex. navegação inferior); sem `px-5 py-4` extra no contentor fixo. */
  bottomBarVariant?: 'inset' | 'flush'
  /** Quando definido, o contentor scrollável recebe este `id` (ex.: scroll ao tocar «Início» na barra inferior). */
  mainScrollId?: string
  /**
   * Quando false, o registo principal não é scrollável — o filho define sub-áreas (ex.: mapa + lista; B2 motorista).
   * O `mainScrollId` deve ser aplicado num descendente com `overflow-y-auto`.
   */
  mainScrollable?: boolean
  /**
   * `driverImmersive` — mapa a encher o eixo vertical; sem padding lateral no contentor principal
   * (`h-full`/`min-h-0` em cadeia flex em vez de `min-h-dvh`).
   */
  contentVariant?: 'default' | 'driverImmersive'
  /** Ecrã motorista: largura total do browser (sem coluna `max-w-md` centrada). */
  fullBleed?: boolean
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
  mainScrollable = true,
  contentVariant = 'default',
  fullBleed = false,
}: ScreenContainerProps) {
  const immersive = contentVariant === 'driverImmersive'
  const scrollBottomPad =
    bottomButton && bottomBarVariant === 'flush'
      ? immersive && mainScrollable === false
        ? 'pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]'
        : 'pb-[calc(10rem+env(safe-area-inset-bottom,0px))]'
      : bottomButton
        ? 'pb-20'
        : 'pb-8'
  const widthShell = fullBleed ? 'w-full max-w-none' : 'max-w-md mx-auto w-full'
  const mainColumn =
    mainScrollable === false
      ? immersive
        ? `flex flex-col flex-1 min-h-0 overflow-hidden px-0 pt-0 pb-0 ${scrollBottomPad}`
        : `flex flex-col flex-1 min-h-0 overflow-hidden px-5 pt-6 pb-4 ${scrollBottomPad}`
      : immersive
        ? `flex-1 flex flex-col px-0 pt-0 pb-0 min-h-0 overflow-y-auto ${scrollBottomPad}`
        : `flex-1 flex flex-col px-5 pt-6 pb-4 overflow-y-auto ${scrollBottomPad}`

  return (
    <div
      className={
        immersive
          ? `flex min-h-0 flex-1 flex-col ${widthShell} bg-background`
          : `min-h-dvh flex flex-col ${widthShell} bg-background`
      }
    >
      <div id={mainScrollable !== false ? mainScrollId : undefined} className={mainColumn}>
        {children}
      </div>
      {bottomButton ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border shadow-card">
          <div
            className={
              bottomBarVariant === 'flush'
                ? fullBleed
                  ? 'w-full'
                  : 'max-w-md mx-auto w-full'
                : fullBleed
                  ? 'w-full px-4 py-4 safe-area-pb'
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
