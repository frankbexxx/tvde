import type { ReactNode } from 'react'
import { MapView, type MapViewProps } from '../../maps/MapView'

export type MapStageMapProps = Omit<MapViewProps, 'className' | 'fillContainer'>

export interface MapStageProps {
  map: MapStageMapProps
  topOverlay?: ReactNode
  bottomOverlay?: ReactNode
  floating?: ReactNode
  children?: ReactNode
  className?: string
  testId?: string
  overlayClassName?: string
}

/**
 * Palco mapa full-bleed (Cluster D / USER-SHELL-D).
 * MapView em `absolute inset-0`; overlays com pointer-events-none/auto nos filhos.
 */
export function MapStage({
  map,
  topOverlay,
  bottomOverlay,
  floating,
  children,
  className = '',
  testId,
  overlayClassName = 'relative z-10 flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-2 pb-20 pointer-events-none',
}: MapStageProps) {
  const hasOverlay = topOverlay != null || bottomOverlay != null || children != null

  return (
    <div
      className={`relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background ${className}`.trim()}
      data-testid={testId}
    >
      <div className="absolute inset-0 z-0 min-h-0 min-w-0">
        <MapView
          {...map}
          fillContainer
          className="!rounded-none border-0 !shadow-none"
        />
      </div>
      {floating ? (
        <div className="pointer-events-none absolute inset-0 z-[5]">{floating}</div>
      ) : null}
      {hasOverlay ? (
        <div className={overlayClassName}>
          {topOverlay ? <div className="pointer-events-auto shrink-0">{topOverlay}</div> : null}
          {children}
          {bottomOverlay ? <div className="pointer-events-auto shrink-0">{bottomOverlay}</div> : null}
        </div>
      ) : null}
    </div>
  )
}
