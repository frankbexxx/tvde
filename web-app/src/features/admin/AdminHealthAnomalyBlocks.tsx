import { useMemo, useState } from 'react'
import { healthRowTimestamp } from './adminDashboardHelpers'
import { tripIdFromHealthRow } from './healthTripLinks'
import type { HealthAnomalyPlaybook } from './adminHealthAnomalyPlaybooks'

export function HealthAnomalyBlock(props: {
  title: string
  rows: Array<Record<string, unknown>>
  onOpenTrip: (tripId: string) => void
  pageSize?: number
  playbook?: HealthAnomalyPlaybook
}) {
  const { title, rows, onOpenTrip, pageSize = 20, playbook } = props
  const [sortRecent, setSortRecent] = useState(true)
  const [shown, setShown] = useState(pageSize)

  const sortedRows = useMemo(() => {
    if (!sortRecent) return rows
    return [...rows].sort((a, b) => healthRowTimestamp(b).localeCompare(healthRowTimestamp(a)))
  }, [rows, sortRecent])

  const slice = sortedRows.slice(0, shown)
  const canShowMore = shown < sortedRows.length

  if (!rows.length) return null
  return (
    <div className="rounded-xl border border-border bg-card/50 p-3 space-y-2 touch-manipulation">
      {playbook ? (
        <details className="rounded-lg border border-info/40 bg-info/10 px-2 py-1.5 text-xs">
          <summary className="cursor-pointer font-medium text-foreground select-none min-h-10 flex items-center py-1">
            O que é · O que fazer (3 passos)
          </summary>
          <p className="mt-2 text-foreground/85 leading-relaxed">{playbook.what}</p>
          <ol className="mt-2 list-decimal pl-4 space-y-1.5 text-foreground/85">
            {playbook.steps.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ol>
        </details>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {title} ({rows.length})
        </p>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className={`inline-flex items-center justify-center min-h-11 touch-manipulation px-2 py-1.5 text-xs rounded-lg border ${sortRecent
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card border-border text-foreground/80 hover:bg-muted/40'
              }`}
            onClick={() => {
              setSortRecent(true)
              setShown(pageSize)
            }}
          >
            Mais recentes
          </button>
          <button
            type="button"
            className={`inline-flex items-center justify-center min-h-11 touch-manipulation px-2 py-1.5 text-xs rounded-lg border ${!sortRecent
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card border-border text-foreground/80 hover:bg-muted/40'
              }`}
            onClick={() => {
              setSortRecent(false)
              setShown(pageSize)
            }}
          >
            Ordem API
          </button>
        </div>
      </div>
      <ul className="space-y-2">
        {slice.map((row, i) => {
          const tid = tripIdFromHealthRow(row)
          const key = tid ? `${title}-${tid}-${i}` : `${title}-row-${i}`
          return (
            <li key={key} className="rounded-lg border border-border/80 bg-background p-2 space-y-2">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                {tid ? (
                  <button
                    type="button"
                    className="w-full min-h-10 px-3 py-2 sm:w-auto shrink-0 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:opacity-90"
                    onClick={() => onOpenTrip(tid)}
                  >
                    Abrir em Viagens
                  </button>
                ) : (
                  <p className="text-xs text-muted-foreground pr-2">
                    Sem viagem nesta linha (ex.: motorista) — ver JSON ou Operações.
                  </p>
                )}
              </div>
              <pre className="text-xs text-foreground/90 bg-surface-raised border border-border p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                {JSON.stringify(row, null, 2)}
              </pre>
            </li>
          )
        })}
      </ul>
      {canShowMore ? (
        <button
          type="button"
          className="w-full min-h-10 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-card text-foreground/90 hover:bg-muted/40"
          onClick={() => setShown((n) => Math.min(n + pageSize, sortedRows.length))}
        >
          Mostrar mais ({sortedRows.length - shown} restantes)
        </button>
      ) : null}
    </div>
  )
}
