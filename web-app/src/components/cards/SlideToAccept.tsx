import { useCallback, useRef, useState } from 'react'

const THUMB_SIZE_DEFAULT = 48
const THUMB_SIZE_COMPACT = 44
const THRESHOLD_RATIO = 0.86

export function SlideToAccept({
  onConfirm,
  disabled,
  loading,
  label = 'Deslizar para aceitar',
  testId,
  tapTestId,
  /** `compact`: menos altura para caber acima da dobra em 360×800 (F-1 smoke 2026-05-13). */
  density = 'default',
}: {
  onConfirm: () => void
  disabled?: boolean
  loading?: boolean
  label?: string
  /** Raiz do controlo (opcional). */
  testId?: string
  /** Botão «Aceitar com um toque» — mantém compatível com E2E que usam `driver-accept-…`. */
  tapTestId?: string
  density?: 'default' | 'compact'
}) {
  const thumbSize = density === 'compact' ? THUMB_SIZE_COMPACT : THUMB_SIZE_DEFAULT
  const trackHeightClass = density === 'compact' ? 'h-12' : 'h-[52px]'
  const thumbShift = density === 'compact' ? 'top-0.5 left-0.5 h-11 w-11 text-sm' : 'top-1 left-1 h-11 w-11'
  const trackRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef(false)
  const startPointerRef = useRef(0)
  const startOffsetRef = useRef(0)
  const offsetRef = useRef(0)
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)

  const maxOffset = useCallback(() => {
    const el = trackRef.current
    if (!el) return 0
    const w = el.getBoundingClientRect().width
    return Math.max(0, w - thumbSize)
  }, [thumbSize])

  const finishDrag = useCallback(
    (pointerId: number | null) => {
      if (!dragRef.current) return
      dragRef.current = false
      setDragging(false)
      if (pointerId != null && trackRef.current) {
        try {
          trackRef.current.releasePointerCapture(pointerId)
        } catch {
          /* not capturing */
        }
      }
      const max = maxOffset()
      const o = offsetRef.current
      const completed = max > 0 && o >= max * THRESHOLD_RATIO
      offsetRef.current = 0
      setOffset(0)
      if (completed && !disabled && !loading) onConfirm()
    },
    [disabled, loading, maxOffset, onConfirm]
  )

  const labelPadClass = density === 'compact' ? 'px-11' : 'px-14'

  return (
    <div className="flex flex-col gap-1.5 w-full" data-testid={testId}>
      <div
        ref={trackRef}
        data-testid={testId ? `${testId}-track` : 'driver-slide-accept-track'}
        className={`relative ${trackHeightClass} w-full select-none rounded-full border-2 border-info/70 bg-info/10 overflow-hidden touch-manipulation`}
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          if (disabled || loading || e.button !== 0) return
          dragRef.current = true
          setDragging(true)
          startPointerRef.current = e.clientX
          startOffsetRef.current = offsetRef.current
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!dragRef.current) return
          const max = maxOffset()
          const dx = e.clientX - startPointerRef.current
          const next = Math.max(0, Math.min(max, startOffsetRef.current + dx))
          offsetRef.current = next
          setOffset(next)
        }}
        onPointerUp={(e) => {
          finishDrag(e.pointerId)
        }}
        onPointerCancel={(e) => {
          finishDrag(e.pointerId)
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className={`text-xs font-semibold text-foreground/75 ${labelPadClass} text-center leading-tight`}
          >
            {label}
          </span>
        </div>
        <div
          role="presentation"
          className={`absolute flex items-center justify-center rounded-full bg-info text-info-foreground shadow-floating font-bold pointer-events-none ${thumbShift}`}
          style={{
            transform: `translateX(${offset}px)`,
            transition: dragging ? 'none' : 'transform 160ms ease-out',
          }}
        >
          →
        </div>
      </div>
      <button
        type="button"
        data-testid={tapTestId}
        className="min-h-[44px] w-full rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted/50 disabled:opacity-50"
        disabled={Boolean(disabled || loading)}
        onClick={() => {
          if (!disabled && !loading) onConfirm()
        }}
      >
        Aceitar com um toque
      </button>
    </div>
  )
}
